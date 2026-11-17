import type {
  PokemonBattleReference,
  PokemonMoveReference,
  PokemonMovePools,
  PokemonFunctionalDifference,
  PokemonReference,
  PokemonStats,
  PokemonTypeMatchup,
} from "../domain/pokemon";
import type { PokemonNormalizationProvenance } from "./pokemon-source";
import { pokemonIconUrl } from "./pokemon-assets";

type RecordValue = Record<string, unknown>;

export interface PokemonReferencePayload {
  stats: unknown;
  types: unknown;
  moves: unknown;
  fastMoves?: unknown;
  chargedMoves?: unknown;
  typeEffectiveness?: unknown;
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

function normalizeMoveCatalog(value: unknown): Map<string, PokemonMoveReference> {
  if (!Array.isArray(value)) return new Map();
  const moves = value.flatMap((item): PokemonMoveReference[] => {
    const record = asRecord(item);
    const name = asString(record?.name);
    if (!name) return [];
    return [{
      name,
      moveId: asNumber(record?.move_id),
      type: asString(record?.type),
      power: asNumber(record?.power),
      energyDelta: asNumber(record?.energy_delta),
      durationMs: asNumber(record?.duration),
    }];
  });
  return new Map(moves.map((move) => [move.name, move]));
}

function moveDetailsForNames(names: string[], catalog: Map<string, PokemonMoveReference>): PokemonMoveReference[] {
  return names.map((name) => catalog.get(name) ?? { name });
}

function normalizeTypeEffectiveness(value: unknown): Record<string, Record<string, number>> {
  const root = asRecord(value);
  if (!root) return {};
  return Object.fromEntries(
    Object.entries(root).flatMap(([attackType, values]) => {
      const record = asRecord(values);
      if (!record) return [];
      const matchups = Object.fromEntries(
        Object.entries(record).flatMap(([defenderType, multiplier]) => {
          const parsed = asNumber(multiplier);
          return parsed === undefined ? [] : [[defenderType, parsed]];
        }),
      );
      return Object.keys(matchups).length > 0 ? [[attackType, matchups]] : [];
    }),
  );
}

function typeMatchups(
  defenderTypes: string[],
  effectiveness: Record<string, Record<string, number>>,
): PokemonTypeMatchup[] {
  return Object.keys(effectiveness)
    .map((attackType) => ({
      attackType,
      multiplier: defenderTypes.reduce(
        (total, defenderType) => total * (effectiveness[attackType]?.[defenderType] ?? 1),
        1,
      ),
    }))
    .filter((matchup) => matchup.multiplier !== 1)
    .sort((left, right) => right.multiplier - left.multiplier || left.attackType.localeCompare(right.attackType));
}

export function normalizePokemonBattleReference(
  payload: PokemonReferencePayload,
  types: string[],
  moves: PokemonMovePools,
): PokemonBattleReference {
  const fastCatalog = normalizeMoveCatalog(payload.fastMoves);
  const chargedCatalog = normalizeMoveCatalog(payload.chargedMoves);
  const effectiveness = normalizeTypeEffectiveness(payload.typeEffectiveness);
  const matchups = typeMatchups(types, effectiveness);

  return {
    weaknesses: matchups.filter((matchup) => matchup.multiplier > 1),
    resistances: matchups.filter((matchup) => matchup.multiplier < 1),
    moveDetails: {
      fast: moveDetailsForNames(moves.fast, fastCatalog),
      charged: moveDetailsForNames(moves.charged, chargedCatalog),
      eliteFast: moveDetailsForNames(moves.eliteFast, fastCatalog),
      eliteCharged: moveDetailsForNames(moves.eliteCharged, chargedCatalog),
    },
  };
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
