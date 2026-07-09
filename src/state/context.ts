// Context-chain summarizer.
//
// Two parallel stacks, kept strictly separate:
//  - Tree cache (heavy, nested) — for rendering + Back. NEVER sent to the model.
//  - Context chain (light, semantic) — what the model sees. Each turn we derive
//    a short summary from the produced tree (types + key props) and append it.
//
// Feeding raw trees back to the model = token blowup + confusion. This file
// produces the light summary.

import type { Node, SymbolTable } from '../dsl/types';
import { nodeToString } from '../dsl/resolver';

/** Notable node types whose first string arg is a useful label. */
const LABELLED = new Set([
  'ListItem',
  'CardHeader',
  'TextContent',
  'Button',
  'HeroStat',
  'ImageBlock',
]);

/**
 * Derive a compact semantic summary of a produced tree, e.g.
 *   "Card > ImageBlock, Chips, ListBlock[The Daily Grill, Sakura Zen, Thai House]"
 * Purely from the symbol table; no rendering.
 */
export function summarizeTree(table: SymbolTable): string {
  const root = table.get('root');
  if (!root) return '(empty screen)';

  const labels: string[] = [];
  const typeCounts = new Map<string, number>();
  const seen = new Set<string>();

  const walk = (node: Node | undefined, depth: number): void => {
    if (!node || depth > 6) return;
    switch (node.kind) {
      case 'ref': {
        if (seen.has(node.name)) return;
        seen.add(node.name);
        walk(table.get(node.name), depth);
        return;
      }
      case 'constructor': {
        typeCounts.set(node.type, (typeCounts.get(node.type) ?? 0) + 1);
        if (LABELLED.has(node.type)) {
          const label = nodeToString(node.args[0]);
          if (label) labels.push(label);
        }
        node.args.forEach((a) => walk(a, depth + 1));
        return;
      }
      case 'array':
        node.items.forEach((a) => walk(a, depth + 1));
        return;
      default:
        return;
    }
  };

  walk(root, 0);

  const typeSummary = [...typeCounts.entries()]
    .map(([t, n]) => (n > 1 ? `${t}×${n}` : t))
    .join(', ');
  const labelSummary =
    labels.length > 0 ? ` [${labels.slice(0, 8).join(', ')}]` : '';
  return `${typeSummary}${labelSummary}`;
}
