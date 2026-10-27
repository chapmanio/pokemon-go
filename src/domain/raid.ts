export type RaidSource = "pogoapi" | "leekduck" | "pokemon-go-api";
export type RaidTier = number | "mega";
export type Freshness = "fresh" | "stale" | "degraded" | "unavailable";

export interface RaidRange {
  min: number;
  max: number;
}

export interface RaidProvenance {
  source: RaidSource;
  endpoint: string;
  sourceUrl: string;
  fetchedAt: string;
  sourceUpdatedAt?: string;
  contentHash?: string;
}

export type RaidDisagreementField =
  | "displayName"
  | "tier"
  | "isShadow"
  | "shinyAvailable"
  | "types"
  | "catchCp"
  | "boostedCatchCp"
  | "boostedWeather"
  | "battleEstimator";

export interface RaidSourceValue {
  source: RaidSource;
  value: string;
}

export interface RaidSourceDisagreement {
  field: RaidDisagreementField;
  label: string;
  values: RaidSourceValue[];
}

export interface RaidBoss {
  raidBossId: string;
  speciesId?: number | string;
  formId?: string;
  displayName: string;
  tier: RaidTier;
  isShadow: boolean;
  shinyAvailable?: boolean;
  types: string[];
  catchCp?: RaidRange;
  boostedCatchCp?: RaidRange;
  boostedWeather?: string[];
  assetUrl?: string;
  startsAt?: string;
  endsAt?: string;
  isLocalTime?: boolean;
  battleEstimator?: number;
  counterSource?: string;
  counterTypes?: string[];
  provenance: RaidProvenance;
  sourceReferences?: RaidProvenance[];
  sourceDisagreements?: RaidSourceDisagreement[];
}

export interface RaidRosterResult {
  bosses: RaidBoss[];
  sources: RaidSource[];
  freshness: Freshness;
  asOf?: string;
  warnings: string[];
}

export interface RaidBossDetailResult extends RaidBoss {
  freshness: Freshness;
  warnings: string[];
}
