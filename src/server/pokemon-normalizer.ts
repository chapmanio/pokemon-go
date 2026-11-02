import type {
  PokemonMovePools,
  PokemonFunctionalDifference,
  PokemonReference,
  PokemonStats,
} from "../domain/pokemon";
import type { PokemonNormalizationProvenance } from "./pokemon-source";
import { pokemonIconUrl } from "./pokemon-assets";

type RecordValue = Record<string, unknown>;

export interface PokemonReferencePayload {
  stats: unknown;
  types: unknown;
  moves: unknown;
}

function asRecord(value: unknown): RecordValue | undefined {
  return typeof value === "object" && value !== null ? value as RecordValue : undefined;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function identity(record: RecordValue): { pokemonId: number; displayName: string; formId: string; key: string } | undefined {
  const pokemonId = asNumber(record.pokemon_id);
  const displayName = asString(record.pokemon_name);
  const formId = asString(record.form) ?? "Normal";
  if (pokemonId === undefined || !displayName) return undefined;
  return { pokemonId, displayName, formId, key: `${pokemonId}:${slug(formId)}` };
}

function emptyMoves(): PokemonMovePools {
  return { fast: [], charged: [], eliteFast: [], eliteCharged: [] };
}

function sameArray(left: string[], right: string[]): boolean {
  if (left.length !== right.length) return false;
  const sortedLeft = [...left].sort();
  const sortedRight = [...right].sort();
  return sortedLeft.every((value, index) => value === sortedRight[index]);
}

function sameStats(left: PokemonStats | undefined, right: PokemonStats | undefined): boolean {
  return JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
}

function sameMoves(left: PokemonMovePools | undefined, right: PokemonMovePools | undefined): boolean {
  if (!left || !right) return left === right;
  return sameArray(left.fast, right.fast)
    && sameArray(left.charged, right.charged)
    && sameArray(left.eliteFast, right.eliteFast)
    && sameArray(left.eliteCharged, right.eliteCharged);
}

function functionalDifference(
  entry: PokemonReference,
  baseline: PokemonReference,
): PokemonFunctionalDifference {
  const differences = [
    !sameStats(entry.stats, baseline.stats) ? "stats" : undefined,
    !sameArray(entry.types, baseline.types) ? "types" : undefined,
    !sameMoves(entry.moves, baseline.moves) ? "moves" : undefined,
  ].filter((value): value is "stats" | "types" | "moves" => value !== undefined);

  if (differences.length === 0) return "none";
  if (differences.length > 1) return "multiple";
  return differences[0];
}

function formOrder(left: PokemonReference, right: PokemonReference): number {
  const leftNormal = left.formId.toLowerCase() === "normal";
  const rightNormal = right.formId.toLowerCase() === "normal";
  if (leftNormal !== rightNormal) return leftNormal ? -1 : 1;
  return left.formId.localeCompare(right.formId);
}

export function annotatePokemonReferences(entries: PokemonReference[]): PokemonReference[] {
  const grouped = new Map<number, PokemonReference[]>();
  for (const entry of entries) {
    const group = grouped.get(entry.pokemonId) ?? [];
    group.push(entry);
    grouped.set(entry.pokemonId, group);
  }

  return entries.map((entry) => {
    const forms = grouped.get(entry.pokemonId) ?? [entry];
    const baseline = forms.find((form) => form.formId.toLowerCase() === "normal") ?? [...forms].sort(formOrder)[0] ?? entry;
    return {
      ...entry,
      assetUrl: entry.assetUrl ?? pokemonIconUrl(entry.pokemonId, entry.formId),
      functionalDifference: entry.pokemonKey === baseline.pokemonKey ? "none" : functionalDifference(entry, baseline),
    };
  });
}

export function normalizePokemonReference(
  payload: PokemonReferencePayload,
  provenance: PokemonNormalizationProvenance,
): PokemonReference[] {
  const entries = new Map<string, PokemonReference>();

  function ensureEntry(record: RecordValue): PokemonReference | undefined {
    const item = identity(record);
    if (!item) return undefined;
    const existing = entries.get(item.key);
    if (existing) return existing;
    const created: PokemonReference = {
      pokemonKey: item.key,
      pokemonId: item.pokemonId,
      displayName: item.displayName,
      formId: item.formId,
      types: [],
      functionalDifference: "none",
      provenance,
    };
    entries.set(item.key, created);
    return created;
  }

  if (Array.isArray(payload.stats)) {
    for (const value of payload.stats) {
      const record = asRecord(value);
      const entry = record ? ensureEntry(record) : undefined;
      if (!record || !entry) continue;
      const attack = asNumber(record.base_attack);
      const defense = asNumber(record.base_defense);
      const stamina = asNumber(record.base_stamina);
      if (attack !== undefined && defense !== undefined && stamina !== undefined) {
        const stats: PokemonStats = { attack, defense, stamina };
        entry.stats = stats;
      }
    }
  }

  if (Array.isArray(payload.types)) {
    for (const value of payload.types) {
      const record = asRecord(value);
      const entry = record ? ensureEntry(record) : undefined;
      if (!record || !entry) continue;
      entry.types = asStringArray(record.type);
    }
  }

  if (Array.isArray(payload.moves)) {
    for (const value of payload.moves) {
      const record = asRecord(value);
      const entry = record ? ensureEntry(record) : undefined;
      if (!record || !entry) continue;
      entry.moves = {
        fast: asStringArray(record.fast_moves),
        charged: asStringArray(record.charged_moves),
        eliteFast: asStringArray(record.elite_fast_moves),
        eliteCharged: asStringArray(record.elite_charged_moves),
      };
    }
  }

  return annotatePokemonReferences([...entries.values()]
    .map((entry) => ({
      ...entry,
      types: [...entry.types],
      moves: entry.moves ?? emptyMoves(),
    }))
    .sort((left, right) => left.pokemonId - right.pokemonId || formOrder(left, right)));
}
