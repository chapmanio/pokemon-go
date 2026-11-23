import type { PokemonCounterCandidate } from "./pokemon";
import type { Freshness } from "./raid";

export type RocketMemberKind = "giovanni" | "leader" | "grunt" | "unknown";
export type RocketSource = "leekduck";

export interface RocketProvenance {
  source: RocketSource;
  endpoint: string;
  sourceUrl: string;
  fetchedAt: string;
  sourceUpdatedAt?: string;
  contentHash?: string;
}

export interface RocketPokemonOption {
  name: string;
  assetUrl?: string;
  shinyAvailable?: boolean;
}

export interface RocketLineupSlot {
  slot: number;
  isEncounter: boolean;
  pokemons: RocketPokemonOption[];
}

export interface RocketMember {
  memberId: string;
  displayName: string;
  kind: RocketMemberKind;
  themeType?: string;
  lineup: RocketLineupSlot[];
  counterTypes: string[];
  guidance: string;
  provenance: RocketProvenance;
}

export interface RocketRosterResult {
  members: RocketMember[];
  sources: RocketSource[];
  freshness: Freshness;
  asOf?: string;
  warnings: string[];
}

export interface RocketMemberDetailResult extends RocketMember {
  counterSuggestions: PokemonCounterCandidate[];
  counterSuggestionsFreshness: Freshness;
  freshness: Freshness;
  warnings: string[];
}
