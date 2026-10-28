import type {
  PokemonMovePools,
  PokemonReference,
  PokemonStats,
} from "../domain/pokemon";
import type { PokemonNormalizationProvenance } from "./pokemon-source";

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

  return [...entries.values()]
    .map((entry) => ({
      ...entry,
      types: [...entry.types],
      moves: entry.moves ?? emptyMoves(),
    }))
    .sort((left, right) => left.pokemonId - right.pokemonId || left.formId.localeCompare(right.formId));
}
