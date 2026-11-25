import type { MaxBattle, MaxBattleProvenance } from "../domain/max-battle";
import { normalizeMaxBattles } from "./max-battle-normalizer";

export interface MaxBattleSourceAdapter {
  source: "pokemon-go-api";
  endpoint: string;
  sourceUrl: string;
  fetchPayload: () => Promise<unknown>;
  normalize: (payload: unknown, provenance: MaxBattleProvenance) => MaxBattle[];
}

export const MAX_BATTLE_SOURCE_URL = "https://pokemon-go-api.github.io/pokemon-go-api/api/maxbattles.json";

export function createHttpMaxBattleAdapter(fetcher: typeof fetch = fetch): MaxBattleSourceAdapter {
  return {
    source: "pokemon-go-api",
    endpoint: "maxbattles.json",
    sourceUrl: MAX_BATTLE_SOURCE_URL,
    fetchPayload: async () => {
      const response = await fetcher(MAX_BATTLE_SOURCE_URL);
      if (!response.ok) throw new Error(`pokemon-go-api returned HTTP ${response.status}`);
      return response.json();
    },
    normalize: normalizeMaxBattles,
  };
}

export function createFixtureMaxBattleAdapter(
  payload: unknown,
  fetcher?: () => Promise<unknown>,
): MaxBattleSourceAdapter {
  const adapter = createHttpMaxBattleAdapter();
  return {
    ...adapter,
    fetchPayload: fetcher ?? (async () => payload),
  };
}
