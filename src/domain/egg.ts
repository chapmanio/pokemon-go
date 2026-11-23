import type { Freshness } from "./raid";

export type EggSource = "leekduck";

export interface EggProvenance {
  source: EggSource;
  endpoint: string;
  sourceUrl: string;
  fetchedAt: string;
  sourceUpdatedAt?: string;
  contentHash?: string;
}

export interface EggPoolEntry {
  name: string;
  rarityTier?: number;
  shinyAvailable: boolean;
  assetUrl?: string;
}

export interface EggPool {
  eggPoolId: string;
  displayName: string;
  hatchDistanceKm: number | null;
  entries: EggPoolEntry[];
  provenance: EggProvenance;
}

export interface EggPoolsResult {
  pools: EggPool[];
  sources: EggSource[];
  freshness: Freshness;
  asOf?: string;
  warnings: string[];
}
