// A generated screen. Reads its record by screenId, kicks off streaming
// generation once, and renders the live tree top-to-bottom as lines arrive.
// The prompt bar continues in this screen's context; card actions dispatch
// through a context wired to navigation + the store + the LLM.
//
// refine() re-generates THIS screen in place (no new route) — it's for editing
// the current screen when fresh model content is genuinely needed. navigate()
// opens a new screen; local state edits (add/remove/toggle) never come here.

import React, { useEffect, useRef } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../navigation/types';
import { buildSubmitPrompt, useGenActions } from '../navigation/actions';
import { useHistoryStore } from '../state/history';
import { useStateStore } from '../state/store';
import { summarizeTree } from '../state/context';
import { DslStreamParser } from '../dsl/parser';
import { streamDsl, assembleSystemPrompt } from '../llm';
import { dispatch, type ActionContext } from '../actions/dispatch';
import type { ActionStep, Node } from '../dsl/types';
import { Renderer } from '../render/Renderer';
import { Skeleton } from '../render/Skeleton';
import { PromptBar } from '../ui/PromptBar';
import { space, useTheme } from '../theme';

type GenRoute = RouteProp<RootStackParamList, 'Gen'>;
type Nav = NativeStackNavigationProp<RootStackParamList, 'Gen'>;

export function GenScreen() {
  const route = useRoute<GenRoute>();
  const screenId = route.params.screenId;
  // Same component serves both the pushed route and the modal-sheet route.
  const isSheet = (route.name as string) === 'GenSheet';
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { colors, text } = useTheme();
  const { startMain, startDetail, startSheet, newWindow } = useGenActions();

  // Subscribe to just this screen's record so the tree re-renders as it fills.
  const record = useHistoryStore((s) => s.records[screenId]);

  // Start (or restart) generation, aborting any stream already in flight.
  const abortRef = useRef<AbortController | null>(null);
  const runGeneration = (prompt: string, reset: boolean) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    void generate(screenId, prompt, controller.signal, reset);
  };

  // Partial refine: regenerate only one region (line) in place. The live table
  // is untouched while it streams, so the old content stays visible under a
  // loading overlay; on completion the region's lines are spliced in.
  const runRegionGeneration = (region: string, prompt: string) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    void generateRegion(screenId, region, prompt, controller.signal);
  };

  // Kick off generation exactly once for this screen.
  useEffect(() => {
    const rec = useHistoryStore.getState().records[screenId];
    if (!rec || rec.started) return;
    runGeneration(rec.prompt, false);
    return () => abortRef.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screenId]);

  // Dispatch context: the client owns all real behavior for this screen.
  const actionCtx: ActionContext = {
    navigate: (seed) => startDetail(seed, record?.prompt ?? ''),
    present: (seed) => startSheet(seed, record?.prompt ?? ''),
    refine: (prompt) => {
      // Re-generate THIS screen in place, telling the model what's shown now.
      const cur = useHistoryStore.getState().records[screenId]?.table;
      const summary = cur ? summarizeTree(cur) : '(empty)';
      runGeneration(
        `You are updating the CURRENT screen in place — do not start over. It currently shows: ${summary}. Apply this change and return the FULL updated screen, keeping everything that isn't affected: ${prompt}`,
        true,
      );
    },
    refineRegion: (region, prompt) => runRegionGeneration(region, prompt),
    submit: (formKey) => startMain(buildSubmitPrompt(formKey)),
    back: () => {
      if (navigation.canGoBack()) navigation.goBack();
    },
  };
  const runSteps = (steps: ActionStep[], node?: Node) =>
    void dispatch(steps, node, actionCtx);

  const streaming = record?.status === 'streaming';
  const hasTree = !!record?.table && record.table.size > 0;

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      {/* A modal sits over the dark dimmed backdrop, so its status bar must be
          light (in light theme the default dark content would be invisible). */}
      {isSheet ? <StatusBar style="light" /> : null}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingTop: isSheet ? space.md : insets.top + space.sm },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {record?.table ? (
          <Renderer
            table={record.table}
            api={{ dispatch: runSteps }}
            loadingRegions={record.loading}
          />
        ) : null}

        {!hasTree && streaming ? <ScreenSkeleton /> : null}

        {record?.status === 'error' ? (
          <Text style={[text.body, { color: colors.danger, padding: space.md }]}>
            Generation failed: {record.error}
          </Text>
        ) : null}
      </ScrollView>

      <PromptBar
        onSubmit={startMain}
        onNewWindow={isSheet ? undefined : newWindow}
      />
    </View>
  );
}

/** Placeholder shown while the first lines of a screen stream in. */
function ScreenSkeleton() {
  return (
    <View style={{ gap: space.md }}>
      <Skeleton height={26} />
      <Skeleton height={170} />
      <Skeleton height={54} />
      <Skeleton height={54} />
      <Skeleton height={54} />
    </View>
  );
}

/**
 * Stream the DSL into a parser, updating the cached tree on every complete line
 * so the screen grows incrementally. `reset` clears the current tree first (used
 * by refine, so the screen shows skeletons while it re-generates in place).
 */
async function generate(
  screenId: string,
  prompt: string,
  signal: AbortSignal,
  reset: boolean,
): Promise<void> {
  const store = useHistoryStore.getState();
  const rec = store.records[screenId];
  if (!rec) return;

  store.markStarted(screenId);
  store.setStatus(screenId, 'streaming');
  if (reset) store.setTable(screenId, new Map());

  const parser = new DslStreamParser((table) => {
    useHistoryStore.getState().setTable(screenId, table);
  });

  const systemPrompt = assembleSystemPrompt({
    stateSnapshot: useStateStore.getState().snapshot(),
    contextChain: rec.context,
    isDetail: rec.kind === 'detail',
  });

  try {
    await streamDsl(
      { userPrompt: prompt, systemPrompt },
      { onChunk: (t) => parser.push(t), signal },
    );
    parser.end();
    if (signal.aborted) return;
    useHistoryStore.getState().setStatus(screenId, 'done');

    // Feed the main thread a light semantic summary — never the raw tree.
    if (rec.kind === 'main') {
      useHistoryStore.getState().appendMainContext(summarizeTree(parser.getTable()));
    }
  } catch (err) {
    if (signal.aborted) return;
    useHistoryStore.getState().setStatus(screenId, 'error', String(err));
  }
}

/**
 * Partial refine: stream ONLY the lines for one region into a buffer, then
 * splice them into the live table atomically. The live table is untouched until
 * completion, so old content stays on screen (under a loading overlay) and only
 * that region swaps — no full-screen reload.
 */
async function generateRegion(
  screenId: string,
  region: string,
  prompt: string,
  signal: AbortSignal,
): Promise<void> {
  const store = useHistoryStore.getState();
  const rec = store.records[screenId];
  if (!rec) return;

  store.setRegionLoading(screenId, region, true);
  const partial = new DslStreamParser(); // buffer only — do NOT touch live table
  const summary = rec.table ? summarizeTree(rec.table) : '(empty)';

  const systemPrompt = assembleSystemPrompt({
    stateSnapshot: useStateStore.getState().snapshot(),
    contextChain: rec.context,
    isDetail: rec.kind === 'detail',
    partialRegion: region,
  });
  const userPrompt =
    `Partial update. The screen currently shows: ${summary}. ` +
    `Regenerate ONLY the "${region}" region: redefine the line named "${region}" and ` +
    `every line it references (its children). Output JUST those lines — do NOT output ` +
    `root or any other region. Change to apply: ${prompt}`;

  try {
    await streamDsl(
      { userPrompt, systemPrompt },
      { onChunk: (t) => partial.push(t), signal },
    );
    partial.end();
    if (signal.aborted) return;
    useHistoryStore.getState().mergeTable(screenId, partial.getTable());
  } catch {
    // Partial refine failed — keep the old content, just clear loading below.
  } finally {
    if (!signal.aborted) {
      useHistoryStore.getState().setRegionLoading(screenId, region, false);
    }
  }
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { flex: 1 },
  content: { padding: space.md, gap: space.md, paddingBottom: space.xl },
});
