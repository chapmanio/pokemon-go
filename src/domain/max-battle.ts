import type { PokemonCounterCandidate } from "./pokemon";
import type { Freshness, RaidRange } from "./raid";

export type MaxBattleSource = "pokemon-go-api";
export type MaxBattleKind = "dynamax" | "gigantamax";

export interface MaxBattleProvenance {
  source: MaxBattleSource;
  endpoint: string;
  sourceUrl: string;
  fetchedAt: string;
  sourceUpdatedAt?: string;
  contentHash?: string;
}

export interface MaxBattle {
  maxBattleId: string;
  speciesId?: number | string;
  formId?: string;
  displayName: string;
  level: number;
  kind: MaxBattleKind;
  shinyAvailable?: boolean;
  types: string[];
  catchCp?: RaidRange;
  assetUrl?: string;
  pokedexKey?: string;
  battleEstimator?: number;
  counterSource?: string;
  counterTypes?: string[];
  provenance: MaxBattleProvenance;
  sourceReferences?: MaxBattleProvenance[];
}

export interface MaxBattleRosterResult {
  battles: MaxBattle[];
  sources: MaxBattleSource[];
  freshness: Freshness;
  asOf?: string;
  warnings: string[];
}

export interface MaxBattleDetailResult extends MaxBattle {
  counterSuggestions?: PokemonCounterCandidate[];
  counterSuggestionsFreshness?: Freshness;
  freshness: Freshness;
  warnings: string[];
}
