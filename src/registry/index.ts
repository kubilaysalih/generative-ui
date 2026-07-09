// The component registry: the single source of truth for what the model may
// emit. Constructor name -> RegistryEntry (component + schema + arg extractors).
// The system-prompt catalog is generated from this map (see catalog.ts) so the
// list is never hand-written twice.

import type { RegistryEntry } from './types';
import {
  buttonsEntry,
  cardEntry,
  carouselEntry,
  columnEntry,
  listBlockEntry,
  rowEntry,
} from './components/containers';
import {
  cardHeaderEntry,
  heroStatEntry,
  kvListEntry,
  textContentEntry,
} from './components/content';
import { imageBlockEntry, mapViewEntry, photoCardEntry } from './components/media';
import {
  buttonEntry,
  chipsEntry,
  listItemEntry,
  stateListEntry,
} from './components/interactive';

const ENTRIES: RegistryEntry[] = [
  cardEntry,
  rowEntry,
  columnEntry,
  carouselEntry,
  listBlockEntry,
  listItemEntry,
  stateListEntry,
  imageBlockEntry,
  photoCardEntry,
  textContentEntry,
  chipsEntry,
  buttonsEntry,
  buttonEntry,
  kvListEntry,
  cardHeaderEntry,
  heroStatEntry,
  mapViewEntry,
];

export const registry: Record<string, RegistryEntry> = Object.fromEntries(
  ENTRIES.map((e) => [e.name, e]),
);

export function getEntry(type: string): RegistryEntry | undefined {
  return registry[type];
}

export type { RegistryEntry } from './types';
