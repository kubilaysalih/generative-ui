// Shape of a registry entry. The registry is the single source of truth for
// what the model may emit: it binds a DSL constructor name to a real RN
// component, a zod schema for its data props, and extractors that turn
// positional constructor args into (a) validated data props and (b) child
// slots to render recursively.

import type { ComponentType } from 'react';
import type { ZodType } from 'zod';
import type { Node } from '../dsl/types';

export interface RegistryEntry {
  /** DSL constructor name, e.g. "Card". */
  name: string;
  /** One-line description injected into the system prompt. */
  description: string;
  /** Human-readable signature for the prompt catalog, e.g. "Card(children: ref[])". */
  signature: string;
  /** Validates the extracted data props. Child slots are validated separately. */
  schema: ZodType;
  /** Extract coerced data props (leaves, action steps) from constructor args. */
  props: (args: Node[]) => Record<string, unknown>;
  /**
   * Extract child slots to render recursively: prop name -> child nodes.
   * The renderer renders each into a ReactNode and passes it under that name.
   */
  children?: (args: Node[]) => Record<string, Node[]>;
  /**
   * True if this component lays its children out horizontally (a flex row).
   * The renderer then skips the per-child fade wrapper for those children so it
   * doesn't collapse their flex sizing — the whole row fades in as one unit.
   */
  rowChildren?: boolean;
  /**
   * Shape to draw for a not-yet-streamed child slot. 'card' → a fixed-size photo
   * card placeholder (for a Carousel); otherwise the default row/block skeleton.
   */
  childSkeleton?: 'card';
  /** The presentational component. Receives validated data props + child slots. */
  Component: ComponentType<any>;
}
