// Generates the action-catalog section of the system prompt from the closed
// primitive pool. Like the component registry, this is derived, never
// hand-written twice.

import { PRIMITIVE_DOCS } from './primitives';

export function actionCatalog(): string {
  return PRIMITIVE_DOCS.map((p) => `- ${p.signature}\n    ${p.description}`).join('\n');
}
