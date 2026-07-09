import { describe, expect, test } from 'bun:test';
import {
  DslStreamParser,
  parseLine,
  parseProgram,
} from '../parser';
import {
  childNodes,
  nodeToObject,
  nodeToStringArray,
  parseAction,
  resolveRef,
} from '../resolver';
import type { ConstructorNode } from '../types';

describe('parseLine', () => {
  test('parses a simple constructor with a string arg', () => {
    const entry = parseLine('title = TextContent("Hello", "large-heavy")');
    expect(entry).not.toBeNull();
    expect(entry!.name).toBe('title');
    const expr = entry!.expr as ConstructorNode;
    expect(expr.kind).toBe('constructor');
    expect(expr.type).toBe('TextContent');
    expect(expr.args).toHaveLength(2);
    expect(expr.args[0]).toEqual({ kind: 'string', value: 'Hello' });
  });

  test('parses an array of references', () => {
    const entry = parseLine('root = Card([hero, chips, title])');
    const expr = entry!.expr as ConstructorNode;
    const arr = expr.args[0];
    expect(arr.kind).toBe('array');
    expect(childNodes(arr).map((n) => (n.kind === 'ref' ? n.name : null))).toEqual([
      'hero',
      'chips',
      'title',
    ]);
  });

  test('parses an object literal', () => {
    const entry = parseLine('x = Thumb({src:"a.png", alt:"cat"})');
    const expr = entry!.expr as ConstructorNode;
    expect(nodeToObject(expr.args[0])).toEqual({ src: 'a.png', alt: 'cat' });
  });

  test('parses numbers and booleans', () => {
    const entry = parseLine('m = MapView("addr", 12)');
    const expr = entry!.expr as ConstructorNode;
    expect(expr.args[1]).toEqual({ kind: 'number', value: 12 });
    const b = parseLine('f = Flag(true)');
    expect((b!.expr as ConstructorNode).args[0]).toEqual({
      kind: 'bool',
      value: true,
    });
  });

  test('handles escaped quotes and commas inside strings', () => {
    const entry = parseLine('t = TextContent("a \\"quote\\", and comma", "body")');
    const expr = entry!.expr as ConstructorNode;
    expect(expr.args[0]).toEqual({
      kind: 'string',
      value: 'a "quote", and comma',
    });
  });

  test('returns null for blank / comment / malformed lines', () => {
    expect(parseLine('')).toBeNull();
    expect(parseLine('  ')).toBeNull();
    expect(parseLine('// a comment')).toBeNull();
    expect(parseLine('this has no equals')).toBeNull();
    expect(parseLine('x = Card([unclosed')).toBeNull();
  });
});

describe('parseProgram + forward references', () => {
  const program = `root = Card([hero, list])
hero = ImageBlock("img.png", "Hero")
list = ListBlock([r1], "Nearby")
r1   = ListItem("Row", "sub")`;

  test('builds a symbol table from all lines', () => {
    const table = parseProgram(program);
    expect([...table.keys()].sort()).toEqual(['hero', 'list', 'r1', 'root']);
  });

  test('resolves a forward reference to a later line', () => {
    const table = parseProgram(program);
    const { node } = resolveRef('hero', table);
    expect(node?.kind).toBe('constructor');
    expect((node as ConstructorNode).type).toBe('ImageBlock');
  });

  test('missing reference resolves to null with reason "missing"', () => {
    const table = parseProgram('root = Card([ghost])');
    const res = resolveRef('ghost', table);
    expect(res.node).toBeNull();
    expect(res.reason).toBe('missing');
  });
});

describe('cycle + depth guards', () => {
  test('detects a direct reference cycle', () => {
    const table = parseProgram(`a = b\nb = a`);
    const res = resolveRef('a', table);
    expect(res.node).toBeNull();
    expect(res.reason).toBe('cycle');
  });

  test('detects an indirect cycle a→b→c→a', () => {
    const table = parseProgram(`a = b\nb = c\nc = a`);
    expect(resolveRef('a', table).reason).toBe('cycle');
  });

  test('follows a non-cyclic ref chain to the concrete node', () => {
    const table = parseProgram(`a = b\nb = TextContent("x", "body")`);
    const { node } = resolveRef('a', table);
    expect((node as ConstructorNode).type).toBe('TextContent');
  });
});

describe('streaming parser', () => {
  test('emits an update per complete line and ignores a trailing half-line', () => {
    const updates: string[] = [];
    const parser = new DslStreamParser((_t, entry) => updates.push(entry.name));
    // Feed in arbitrary chunks, splitting mid-line.
    parser.push('root = Card([he');
    parser.push('ro])\nhero = Image');
    parser.push('Block("i.png")\ntitle = Text'); // 'title' line incomplete
    expect(updates).toEqual(['root', 'hero']);
    expect(parser.getTable().has('title')).toBe(false);

    parser.push('Content("t")\n');
    expect(updates).toEqual(['root', 'hero', 'title']);
  });

  test('end() flushes a final newline-less line', () => {
    const parser = new DslStreamParser();
    parser.push('root = Card([])');
    expect(parser.getTable().has('root')).toBe(false);
    parser.end();
    expect(parser.getTable().has('root')).toBe(true);
  });
});

describe('actions + coercion', () => {
  test('parseAction extracts sequential primitive steps', () => {
    const entry = parseLine(
      'b = Button("Go", Action([setState("filter.x", "y"), navigate("next screen")]), "primary")',
    );
    const expr = entry!.expr as ConstructorNode;
    const steps = parseAction(expr.args[1]);
    expect(steps).toEqual([
      { type: 'setState', args: ['filter.x', 'y'] },
      { type: 'navigate', args: ['next screen'] },
    ]);
  });

  test('nodeToStringArray coerces an array of chip labels', () => {
    const entry = parseLine('c = Chips(["All","Sushi","Thai"])');
    const expr = entry!.expr as ConstructorNode;
    expect(nodeToStringArray(expr.args[0])).toEqual(['All', 'Sushi', 'Thai']);
  });

  test('parseAction returns [] for a non-Action node', () => {
    const entry = parseLine('t = TextContent("x")');
    const expr = entry!.expr as ConstructorNode;
    expect(parseAction(expr.args[0])).toEqual([]);
  });
});
