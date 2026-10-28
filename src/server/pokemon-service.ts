import type {
  Freshness,
  PokemonDetailResult,
  PokemonListEntry,
  PokemonListResult,
} from "../domain/pokemon";
import { normalizePokemonReference } from "./pokemon-normalizer";
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

function listEntries(snapshot: StoredPokemonSnapshot): PokemonListEntry[] {
  return snapshot.entries.map(({ pokemonKey, pokemonId, displayName, formId, types }) => ({
    pokemonKey,
    pokemonId,
    displayName,
    formId,
    types,
  }));
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
      const entry = snapshot?.entries.find((candidate) => candidate.pokemonKey === pokemonKey);
      if (!entry) return undefined;
      return {
        ...entry,
        freshness: snapshotFreshness(snapshot, currentTime),
        warnings: snapshot?.error ? ["The cached Pokédex is being served because the source refresh failed"] : [],
      };
    },
  };
}

export { createMemoryPokemonSnapshotStore };
