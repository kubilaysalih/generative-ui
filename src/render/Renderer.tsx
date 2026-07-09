// Tree → React Native. Rendering starts at `root` and resolves references
// recursively:
//  - a missing referenced line renders a Skeleton (fills in when it streams),
//  - an unknown constructor / failed prop validation / cycle / too-deep node
//    renders a Fallback — the app never crashes on garbage output.
//
// Nodes get stable keys by resolved path so React doesn't unmount/remount them
// on each stream update. Each column child is wrapped in a reanimated view so:
//   - it fades in on mount (top-down fill),
//   - its height animates when content swaps (partial refine),
//   - a shimmer overlay appears while its region is being regenerated — the old
//     content stays visible underneath, nothing disappears.

import React, { createContext, memo, useContext } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  LinearTransition,
  withTiming,
  type EntryExitAnimationFunction,
} from 'react-native-reanimated';
import type { Node, SymbolTable } from '../dsl/types';
import { resolveRef } from '../dsl/resolver';
import { getEntry } from '../registry';
import { RenderProvider, type RenderApi } from './RenderContext';
import { Skeleton, PhotoCardSkeleton } from './Skeleton';
import { Fallback } from './Fallback';
import { Shimmer } from './Shimmer';

/** Cap on nested-constructor depth (refs are additionally cycle-guarded). */
const MAX_RENDER_DEPTH = 6;

// Entering animation for a resolved region: fade in with a small upward slide.
// Fires once when a line arrives and its wrapper mounts (RenderChild swaps a
// Skeleton for the real node), producing the staggered top-down fill. Declared
// as a reanimated entering animation so height changes on partial refine and
// the fade-in are both handled by the layout system — no imperative shared value.
const enterFade: EntryExitAnimationFunction = () => {
  'worklet';
  return {
    initialValues: { opacity: 0, transform: [{ translateY: 8 }] },
    animations: {
      opacity: withTiming(1, { duration: 300 }),
      transform: [{ translateY: withTiming(0, { duration: 300 }) }],
    },
  };
};

/** The live symbol table, provided once at the top so every node can resolve refs. */
const TableContext = createContext<SymbolTable>(new Map());
/** Region (line) names currently being partially regenerated. */
const LoadingContext = createContext<string[]>([]);

export function Renderer({
  table,
  api,
  loadingRegions = [],
}: {
  table: SymbolTable;
  api: RenderApi;
  loadingRegions?: string[];
}) {
  return (
    <RenderProvider api={api}>
      <LoadingContext.Provider value={loadingRegions}>
        <TableContext.Provider value={table}>
          <RenderChild
            node={{ kind: 'ref', name: 'root' }}
            path="root"
            visited={EMPTY}
            depth={0}
            fade
          />
        </TableContext.Provider>
      </LoadingContext.Provider>
    </RenderProvider>
  );
}

const EMPTY: ReadonlySet<string> = new Set();

interface ChildProps {
  node: Node;
  path: string;
  visited: ReadonlySet<string>;
  depth: number;
  /** Whether to wrap/animate this node (off for horizontal row children). */
  fade?: boolean;
  /** Placeholder shape for a not-yet-streamed child (e.g. 'card' in a Carousel). */
  skeleton?: 'card';
}

/**
 * Render one child slot: a reference (resolve → skeleton/node) or an inline
 * node. Memoized + stably keyed by path so settled subtrees don't churn.
 */
const RenderChild = memo(function RenderChild({
  node,
  path,
  visited,
  depth,
  fade,
  skeleton,
}: ChildProps) {
  const table = useContext(TableContext);
  const loadingRegions = useContext(LoadingContext);

  const isLoading = node.kind === 'ref' && loadingRegions.includes(node.name);

  // Column children get an animated wrapper: fade-in on mount, height animation
  // on swap, and a shimmer overlay while their region regenerates. Row children
  // (fade=false) render bare so their flex sizing isn't broken.
  const wrap = (el: React.ReactElement) => {
    if (!fade) return el;
    return (
      <Animated.View
        entering={enterFade}
        layout={LinearTransition.duration(260)}
        style={styles.region}
      >
        {el}
        {isLoading ? <Shimmer /> : null}
      </Animated.View>
    );
  };

  if (node.kind === 'ref') {
    if (visited.has(node.name)) return <Fallback label={node.name} reason="cycle" />;
    const { node: resolved, reason } = resolveRef(node.name, table, visited);
    if (!resolved) {
      // Missing = not streamed yet → skeleton; cycle/depth → fallback. The
      // placeholder matches what will land: a photo-card box in a Carousel, a
      // button-height cell in a Row, else the default block.
      if (reason === 'missing') {
        if (skeleton === 'card') return <PhotoCardSkeleton />;
        return <Skeleton height={fade ? 56 : 46} />;
      }
      return <Fallback label={node.name} reason={reason} />;
    }
    const nextVisited = new Set(visited);
    nextVisited.add(node.name);
    return wrap(
      <RenderNode node={resolved} path={path} visited={nextVisited} depth={depth} />,
    );
  }

  return wrap(<RenderNode node={node} path={path} visited={visited} depth={depth} />);
});

const RenderNode = memo(function RenderNode({
  node,
  path,
  visited,
  depth,
}: ChildProps) {
  if (node.kind !== 'constructor') {
    // A bare leaf where a component was expected — show its text if any.
    if (node.kind === 'string') return <Fallback label={node.value} />;
    return <Fallback reason={node.kind} />;
  }

  if (depth > MAX_RENDER_DEPTH) return <Fallback label={node.type} reason="depth" />;

  const entry = getEntry(node.type);
  if (!entry) return <Fallback label={node.type} reason="unknown" />;

  // Extract + validate the data props. Untrusted output — guard everything.
  let dataProps: Record<string, unknown>;
  try {
    dataProps = entry.props(node.args);
  } catch {
    return <Fallback label={node.type} reason="bad-args" />;
  }
  const parsed = entry.schema.safeParse(dataProps);
  if (!parsed.success) return <Fallback label={node.type} reason="invalid-props" />;

  // Render child slots recursively, keyed by stable path. Horizontal (row)
  // children skip the animated wrapper so their flex sizing stays intact.
  const childFade = !entry.rowChildren;
  const childSkeleton = entry.childSkeleton;
  const childSlots = entry.children ? entry.children(node.args) : {};
  const slotElements: Record<string, React.ReactNode> = {};
  for (const [slot, nodes] of Object.entries(childSlots)) {
    slotElements[slot] = nodes.map((child, i) => (
      <RenderChild
        key={`${path}.${slot}.${i}`}
        node={child}
        path={`${path}.${slot}.${i}`}
        visited={visited}
        depth={depth + 1}
        fade={childFade}
        skeleton={childSkeleton}
      />
    ));
  }

  const Component = entry.Component;
  return (
    <Component {...(parsed.data as object)} {...slotElements} node={node} />
  );
});

const styles = StyleSheet.create({
  // NOT clipped: a horizontal scroller child (Chips/Carousel) uses a negative
  // margin to bleed full-width, and overflow:hidden here would clip that bleed
  // (making it cut off short of the edge). The Shimmer confines itself to the
  // region on its own, so no clip is needed.
  region: { overflow: 'visible' },
});
