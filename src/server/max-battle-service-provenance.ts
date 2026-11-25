import type { MaxBattleProvenance } from "../domain/max-battle";
import type { MaxBattleSourceAdapter } from "./max-battle-source";

export function createMaxBattleProvenance(
  adapter: Pick<MaxBattleSourceAdapter, "source" | "endpoint" | "sourceUrl">,
  fetchedAt: Date,
  contentHash?: string,
): MaxBattleProvenance {
  return {
    source: adapter.source,
    endpoint: adapter.endpoint,
    sourceUrl: adapter.sourceUrl,
    fetchedAt: fetchedAt.toISOString(),
    contentHash,
  };
}
