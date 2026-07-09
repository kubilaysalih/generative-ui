// Generates the component section of the system prompt from the registry.
// Never hand-write the component list twice — this is derived.

import { registry } from './index';

export function componentCatalog(): string {
  const lines = Object.values(registry).map(
    (e) => `- ${e.signature}\n    ${e.description}`,
  );
  return lines.join('\n');
}
