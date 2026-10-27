import type { RaidBoss, RaidProvenance, RaidSource } from "../domain/raid";
import {
  normalizeLeekDuckRaids,
  normalizePokemonGoApiRaids,
  normalizePoGoApiRaids,
} from "./raid-normalizer";

export interface RaidSourceAdapter {
  source: RaidSource;
  endpoint: string;
  sourceUrl: string;
  fetchPayload: () => Promise<unknown>;
  normalize: (payload: unknown, provenance: NormalizationProvenance) => RaidBoss[];
}

export interface NormalizationProvenance {
  source: RaidSource;
  endpoint: string;
  sourceUrl: string;
  fetchedAt: string;
  sourceUpdatedAt?: string;
  contentHash?: string;
}

export interface FixtureAdapterOptions {
  fetch?: () => Promise<unknown>;
}

const sourceUrls: Record<RaidSource, string> = {
  pogoapi: "https://pogoapi.net/api/v1/raid_bosses.json",
  leekduck: "https://pokelitee.github.io/leak-duck/raid_bosses.json",
  "pokemon-go-api": "https://pokemon-go-api.github.io/pokemon-go-api/api/raidboss.json",
};

const normalizers: Record<
  RaidSource,
  (payload: unknown, provenance: NormalizationProvenance) => RaidBoss[]
> = {
  pogoapi: normalizePoGoApiRaids,
  leekduck: normalizeLeekDuckRaids,
  "pokemon-go-api": normalizePokemonGoApiRaids,
};

export function createFixtureAdapter(
  source: RaidSource,
  endpoint: string,
  fixture: unknown,
  options: FixtureAdapterOptions = {},
): RaidSourceAdapter {
  return {
    source,
    endpoint,
    sourceUrl: sourceUrls[source],
    fetchPayload: options.fetch ?? (async () => fixture),
    normalize: normalizers[source],
  };
}

export function createHttpRaidAdapters(
  fetcher: typeof fetch = fetch,
): RaidSourceAdapter[] {
  return (Object.keys(sourceUrls) as RaidSource[]).map((source) => ({
    source,
    endpoint: "raid_bosses.json",
    sourceUrl: sourceUrls[source],
    fetchPayload: async () => {
      const response = await fetcher(sourceUrls[source]);
      if (!response.ok) {
        throw new Error(`${source} returned HTTP ${response.status}`);
      }
      return response.json();
    },
    normalize: normalizers[source],
  }));
}

export function createProvenance(
  adapter: Pick<RaidSourceAdapter, "source" | "endpoint" | "sourceUrl">,
  fetchedAt: Date,
  contentHash?: string,
): RaidProvenance {
  return {
    source: adapter.source,
    endpoint: adapter.endpoint,
    sourceUrl: adapter.sourceUrl,
    fetchedAt: fetchedAt.toISOString(),
    contentHash,
  };
}
