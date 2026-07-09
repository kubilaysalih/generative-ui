// AST node types for the generative-UI DSL.
//
// The model emits a flat list of `name = expr` assignments. Nesting happens by
// *reference* (a bare identifier points at another line), never by physically
// nesting brackets across lines. That makes every line self-contained and
// streamable while still describing an arbitrarily deep tree.

export type Node =
  | ConstructorNode
  | ArrayNode
  | ObjectNode
  | StringNode
  | NumberNode
  | BoolNode
  | RefNode;

/** `Card([hero, chips])` — a named constructor with positional args. */
export interface ConstructorNode {
  kind: 'constructor';
  type: string;
  args: Node[];
}

/** `[a, b, c]` — an ordered list of expressions. */
export interface ArrayNode {
  kind: 'array';
  items: Node[];
}

/** `{ src: "...", alt: "..." }` — key/value pairs. */
export interface ObjectNode {
  kind: 'object';
  fields: Record<string, Node>;
}

/** `"hello"` — a double-quoted string literal. */
export interface StringNode {
  kind: 'string';
  value: string;
}

/** `42` / `-3.5` — numeric literal (tolerant extension to the grammar). */
export interface NumberNode {
  kind: 'number';
  value: number;
}

/** `true` / `false` — boolean literal (tolerant extension). */
export interface BoolNode {
  kind: 'bool';
  value: boolean;
}

/** A bare identifier — a reference to another line. */
export interface RefNode {
  kind: 'ref';
  name: string;
}

/** One parsed `name = expr` line. */
export interface Entry {
  name: string;
  expr: Node;
}

/** Live symbol table: line name -> parsed expression. */
export type SymbolTable = Map<string, Node>;

/** A dispatched action step, e.g. `{ type: 'navigate', args: ['...'] }`. */
export interface ActionStep {
  type: string;
  args: unknown[];
}
