import type {
  Freshness,
  PokemonBattleReference,
  PokemonDetailResult,
  PokemonFormSummary,
  PokemonListEntry,
  PokemonListResult,
  PokemonReference,
} from "../domain/pokemon";
import { annotatePokemonReferences, normalizePokemonBattleReference, normalizePokemonReference } from "./pokemon-normalizer";
import {
  fetchPokemonSourcePayload,
  pokemonProvenance,
  type PokemonSourcePayload,
} from "./pokemon-source";
import { createMemoryPokemonSnapshotStore, type PokemonSnapshotStore, type StoredPokemonSnapshot } from "./pokemon-snapshot-store";

const SNAPSHOT_KEY = "pogoapi:pokemon-reference";
const REFRESH_COOLDOWN_MS = 24 * 60 * 60 * 1000;
const FRESH_AFTER_MS = 48 * 60 * 60 * 1000;

export interface PokemonServiceOptions {
  store: PokemonSnapshotStore;
  fetcher?: typeof fetch;
  now?: () => Date;
}

export interface GetPokemonOptions {
  forceRefresh?: boolean;
}

function snapshotFreshness(snapshot: StoredPokemonSnapshot | undefined, now: Date): Freshness {
  if (!snapshot) return "unavailable";
  if (snapshot.error) return "degraded";
  return now.getTime() - new Date(snapshot.fetchedAt).getTime() <= FRESH_AFTER_MS ? "fresh" : "stale";
}

function sameHashes(left: Record<string, string>, right: Record<string, string>): boolean {
  return Object.keys(left).length === Object.keys(right).length
    && Object.keys(left).every((key) => left[key] === right[key]);
}

async function hashPayload(payload: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function snapshotEntries(snapshot: StoredPokemonSnapshot): PokemonReference[] {
  return annotatePokemonReferences(snapshot.entries);
}

function formOrder(left: PokemonReference, right: PokemonReference): number {
  const leftNormal = left.formId.toLowerCase() === "normal";
  const rightNormal = right.formId.toLowerCase() === "normal";
  if (leftNormal !== rightNormal) return leftNormal ? -1 : 1;
  return left.formId.localeCompare(right.formId);
}

function formsFor(entries: PokemonReference[], pokemonId: number): PokemonReference[] {
  return entries.filter((entry) => entry.pokemonId === pokemonId).sort(formOrder);
}

function formSummary(entry: PokemonReference): PokemonFormSummary {
  return {
    pokemonKey: entry.pokemonKey,
    formId: entry.formId,
    types: [...entry.types],
    assetUrl: entry.assetUrl,
    functionalDifference: entry.functionalDifference,
  };
}

function battleReference(snapshot: StoredPokemonSnapshot, entry: PokemonReference): PokemonBattleReference {
  return normalizePokemonBattleReference(snapshot.raw, entry.types, entry.moves ?? {
    fast: [],
    charged: [],
    eliteFast: [],
    eliteCharged: [],
  });
}

function listEntries(snapshot: StoredPokemonSnapshot): PokemonListEntry[] {
  const entries = snapshotEntries(snapshot);
  const grouped = new Map<number, PokemonReference[]>();
  for (const entry of entries) {
    const group = grouped.get(entry.pokemonId) ?? [];
    group.push(entry);
    grouped.set(entry.pokemonId, group);
  }

  return [...grouped.values()]
    .map((forms) => {
      const sortedForms = [...forms].sort(formOrder);
      const defaultForm = sortedForms[0];
      if (!defaultForm) throw new Error("Pokédex species group contained no form");
      return {
        pokemonKey: defaultForm.pokemonKey,
        pokemonId: defaultForm.pokemonId,
        displayName: defaultForm.displayName,
        formId: defaultForm.formId,
        types: [...defaultForm.types],
        assetUrl: defaultForm.assetUrl,
        formIds: sortedForms.map((form) => form.formId),
        formCount: sortedForms.length,
        meaningfulFormCount: sortedForms.filter((form) => form.functionalDifference !== "none").length,
      };
    })
    .sort((left, right) => left.pokemonId - right.pokemonId);
}

function resultFromSnapshot(snapshot: StoredPokemonSnapshot | undefined, now: Date): PokemonListResult {
  return {
    entries: snapshot ? listEntries(snapshot) : [],
    freshness: snapshotFreshness(snapshot, now),
    asOf: snapshot?.fetchedAt,
    warnings: snapshot?.error ? ["The cached Pokédex is being served because the source refresh failed"] : [],
  };
}

async function refreshSnapshot(
  previous: StoredPokemonSnapshot | undefined,
  now: Date,
  fetcher: typeof fetch,
  store: PokemonSnapshotStore,
): Promise<StoredPokemonSnapshot | undefined> {
  try {
    const sourcePayload: PokemonSourcePayload = await fetchPokemonSourcePayload(fetcher);
    if (previous && sameHashes(previous.upstreamHashes, sourcePayload.upstreamHashes)) {
      const unchanged: StoredPokemonSnapshot = {
        ...previous,
        fetchedAt: now.toISOString(),
        lastAttemptAt: now.toISOString(),
        upstreamHashes: sourcePayload.upstreamHashes,
        error: undefined,
      };
      await store.put(SNAPSHOT_KEY, unchanged);
      return unchanged;
    }

    const contentHash = await hashPayload(sourcePayload.payload);
    const provenance = pokemonProvenance(now, contentHash);
    const entries = normalizePokemonReference(sourcePayload.payload, provenance);
    if (entries.length === 0) throw new Error("PoGoAPI Pokédex response contained no valid entries");
    const snapshot: StoredPokemonSnapshot = {
      source: "pogoapi",
      endpoint: provenance.endpoint,
      fetchedAt: now.toISOString(),
      lastAttemptAt: now.toISOString(),
      lastChangedAt: previous?.contentHash === contentHash ? previous.lastChangedAt : now.toISOString(),
      contentHash,
      raw: sourcePayload.payload,
      entries,
      upstreamHashes: sourcePayload.upstreamHashes,
    };
    await store.put(SNAPSHOT_KEY, snapshot);
    return snapshot;
  } catch (error) {
    if (!previous) return undefined;
    const degraded: StoredPokemonSnapshot = {
      ...previous,
      lastAttemptAt: now.toISOString(),
      error: error instanceof Error ? error.message : "Pokédex source refresh failed",
    };
    await store.put(SNAPSHOT_KEY, degraded);
    return degraded;
  }
}

export function createPokemonService({ store, fetcher = fetch, now = () => new Date() }: PokemonServiceOptions) {
  return {
    async getPokedex(options: GetPokemonOptions = {}): Promise<PokemonListResult> {
      const currentTime = now();
      const previous = await store.get(SNAPSHOT_KEY);
      const lastAttempt = previous ? new Date(previous.lastAttemptAt).getTime() : 0;
      const eligible = options.forceRefresh || !previous || currentTime.getTime() - lastAttempt >= REFRESH_COOLDOWN_MS;
      const snapshot = eligible ? await refreshSnapshot(previous, currentTime, fetcher, store) : previous;
      return resultFromSnapshot(snapshot, currentTime);
    },

    async getPokemon(pokemonKey: string, options: GetPokemonOptions = {}): Promise<PokemonDetailResult | undefined> {
      const currentTime = now();
      const previous = await store.get(SNAPSHOT_KEY);
      const lastAttempt = previous ? new Date(previous.lastAttemptAt).getTime() : 0;
      const eligible = options.forceRefresh || !previous || currentTime.getTime() - lastAttempt >= REFRESH_COOLDOWN_MS;
      const snapshot = eligible ? await refreshSnapshot(previous, currentTime, fetcher, store) : previous;
      if (!snapshot) return undefined;
      const entries = snapshotEntries(snapshot);
      const entry = entries.find((candidate) => candidate.pokemonKey === pokemonKey);
      if (!entry) return undefined;
      const forms = formsFor(entries, entry.pokemonId);
      return {
        ...entry,
        forms: forms.map(formSummary),
        battle: battleReference(snapshot, entry),
        freshness: snapshotFreshness(snapshot, currentTime),
        warnings: snapshot?.error ? ["The cached Pokédex is being served because the source refresh failed"] : [],
      };
    },
  };
}

export { createMemoryPokemonSnapshotStore };
