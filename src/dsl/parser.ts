// Streaming, line-based parser for the DSL.
//
// Tokens arrive in arbitrary chunks. We buffer them, split on newlines, and
// parse each *complete* line into an `Entry`. A trailing half-line (the one
// still streaming) is left in the buffer until its newline arrives — no
// partial-JSON gymnastics, a half line is simply skipped until complete.

import type {
  ArrayNode,
  BoolNode,
  ConstructorNode,
  Entry,
  Node,
  NumberNode,
  ObjectNode,
  RefNode,
  StringNode,
  SymbolTable,
} from './types';

const IDENT_START = /[A-Za-z_]/;
const IDENT_CHAR = /[A-Za-z0-9_.]/;

/**
 * Recursive-descent parser for a single expression string (one line's RHS).
 * Tolerant: throws on malformed input so the caller can skip the line.
 */
class ExprParser {
  private i = 0;
  constructor(private readonly src: string) {}

  parse(): Node {
    this.skipWs();
    const node = this.parseValue();
    this.skipWs();
    if (this.i < this.src.length) {
      throw new Error(`Trailing input at ${this.i}: ${this.src.slice(this.i)}`);
    }
    return node;
  }

  private parseValue(): Node {
    this.skipWs();
    const c = this.peek();
    if (c === undefined) throw new Error('Unexpected end of input');
    if (c === '"') return this.parseString();
    if (c === '[') return this.parseArray();
    if (c === '{') return this.parseObject();
    if (c === '-' || (c >= '0' && c <= '9')) return this.parseNumber();
    if (IDENT_START.test(c)) return this.parseIdentLike();
    throw new Error(`Unexpected char '${c}' at ${this.i}`);
  }

  private parseString(): StringNode {
    this.expect('"');
    let out = '';
    while (this.i < this.src.length) {
      const ch = this.src[this.i++];
      if (ch === '\\') {
        const next = this.src[this.i++];
        switch (next) {
          case 'n': out += '\n'; break;
          case 't': out += '\t'; break;
          case 'r': out += '\r'; break;
          case '"': out += '"'; break;
          case '\\': out += '\\'; break;
          default: out += next; break;
        }
      } else if (ch === '"') {
        return { kind: 'string', value: out };
      } else {
        out += ch;
      }
    }
    throw new Error('Unterminated string');
  }

  private parseArray(): ArrayNode {
    this.expect('[');
    const items: Node[] = [];
    this.skipWs();
    if (this.peek() === ']') {
      this.i++;
      return { kind: 'array', items };
    }
    for (;;) {
      items.push(this.parseValue());
      this.skipWs();
      const c = this.peek();
      if (c === ',') {
        this.i++;
        continue;
      }
      if (c === ']') {
        this.i++;
        return { kind: 'array', items };
      }
      throw new Error(`Expected ',' or ']' at ${this.i}`);
    }
  }

  private parseObject(): ObjectNode {
    this.expect('{');
    const fields: Record<string, Node> = {};
    this.skipWs();
    if (this.peek() === '}') {
      this.i++;
      return { kind: 'object', fields };
    }
    for (;;) {
      this.skipWs();
      const key = this.parseKey();
      this.skipWs();
      this.expect(':');
      fields[key] = this.parseValue();
      this.skipWs();
      const c = this.peek();
      if (c === ',') {
        this.i++;
        continue;
      }
      if (c === '}') {
        this.i++;
        return { kind: 'object', fields };
      }
      throw new Error(`Expected ',' or '}' at ${this.i}`);
    }
  }

  /** Object keys may be bare identifiers or quoted strings. */
  private parseKey(): string {
    if (this.peek() === '"') return this.parseString().value;
    return this.parseIdent();
  }

  private parseNumber(): NumberNode {
    const start = this.i;
    if (this.peek() === '-') this.i++;
    while (this.i < this.src.length && /[0-9.]/.test(this.src[this.i])) this.i++;
    const raw = this.src.slice(start, this.i);
    const value = Number(raw);
    if (Number.isNaN(value)) throw new Error(`Bad number '${raw}'`);
    return { kind: 'number', value };
  }

  /** Identifier that may be a constructor call, a boolean, or a bare ref. */
  private parseIdentLike(): ConstructorNode | BoolNode | RefNode {
    const name = this.parseIdent();
    if (name === 'true') return { kind: 'bool', value: true };
    if (name === 'false') return { kind: 'bool', value: false };
    this.skipWs();
    if (this.peek() === '(') {
      const args = this.parseArgs();
      return { kind: 'constructor', type: name, args };
    }
    return { kind: 'ref', name };
  }

  private parseArgs(): Node[] {
    this.expect('(');
    const args: Node[] = [];
    this.skipWs();
    if (this.peek() === ')') {
      this.i++;
      return args;
    }
    for (;;) {
      args.push(this.parseValue());
      this.skipWs();
      const c = this.peek();
      if (c === ',') {
        this.i++;
        continue;
      }
      if (c === ')') {
        this.i++;
        return args;
      }
      throw new Error(`Expected ',' or ')' at ${this.i}`);
    }
  }

  private parseIdent(): string {
    this.skipWs();
    const start = this.i;
    if (!IDENT_START.test(this.peek() ?? '')) {
      throw new Error(`Expected identifier at ${this.i}`);
    }
    this.i++;
    while (this.i < this.src.length && IDENT_CHAR.test(this.src[this.i])) this.i++;
    return this.src.slice(start, this.i);
  }

  private peek(): string | undefined {
    return this.src[this.i];
  }

  private expect(ch: string): void {
    if (this.src[this.i] !== ch) {
      throw new Error(`Expected '${ch}' at ${this.i}, got '${this.src[this.i]}'`);
    }
    this.i++;
  }

  private skipWs(): void {
    while (this.i < this.src.length && /\s/.test(this.src[this.i])) this.i++;
  }
}

/**
 * Parse a single complete line `IDENT = expr` into an Entry.
 * Returns null for blank lines, comments, or malformed lines (tolerant).
 */
export function parseLine(line: string): Entry | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('#')) return null;

  const eq = splitTopLevelAssignment(trimmed);
  if (!eq) return null;
  const [rawName, rawExpr] = eq;
  const name = rawName.trim();
  if (!name || !IDENT_START.test(name[0])) return null;

  try {
    const expr = new ExprParser(rawExpr).parse();
    return { name, expr };
  } catch {
    return null;
  }
}

/**
 * Split on the first top-level `=` (not inside strings/brackets). Returns
 * `[name, expr]` or null. Guards against `==` or `=` appearing in a string.
 */
function splitTopLevelAssignment(line: string): [string, string] | null {
  let depth = 0;
  let inStr = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inStr) {
      if (ch === '\\') {
        i++;
      } else if (ch === '"') {
        inStr = false;
      }
      continue;
    }
    if (ch === '"') {
      inStr = true;
    } else if (ch === '[' || ch === '(' || ch === '{') {
      depth++;
    } else if (ch === ']' || ch === ')' || ch === '}') {
      depth--;
    } else if (ch === '=' && depth === 0) {
      return [line.slice(0, i), line.slice(i + 1)];
    }
  }
  return null;
}

/**
 * Streaming accumulator. Feed it chunks; it emits an `onUpdate` for every
 * complete line, keeping a live symbol table.
 */
export class DslStreamParser {
  private buffer = '';
  private readonly table: SymbolTable = new Map();

  constructor(
    private readonly onUpdate?: (table: SymbolTable, entry: Entry) => void,
  ) {}

  /** Feed a chunk of streamed text. */
  push(chunk: string): void {
    this.buffer += chunk;
    let nl: number;
    while ((nl = this.buffer.indexOf('\n')) >= 0) {
      const line = this.buffer.slice(0, nl);
      this.buffer = this.buffer.slice(nl + 1);
      this.consume(line);
    }
  }

  /** Flush a trailing line that never got its newline (stream ended). */
  end(): void {
    if (this.buffer.trim()) this.consume(this.buffer);
    this.buffer = '';
  }

  getTable(): SymbolTable {
    return this.table;
  }

  private consume(line: string): void {
    const entry = parseLine(line);
    if (!entry) return;
    this.table.set(entry.name, entry.expr);
    this.onUpdate?.(this.table, entry);
  }
}

/** Parse a full multi-line program at once (used in tests / static fixtures). */
export function parseProgram(src: string): SymbolTable {
  const parser = new DslStreamParser();
  parser.push(src);
  parser.end();
  return parser.getTable();
}
