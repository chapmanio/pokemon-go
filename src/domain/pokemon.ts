export type PokemonSource = "pogoapi";

export interface PokemonProvenance {
  source: PokemonSource;
  endpoint: string;
  sourceUrl: string;
  fetchedAt: string;
  sourceUpdatedAt?: string;
  contentHash?: string;
}

export interface PokemonStats {
  attack: number;
  defense: number;
  stamina: number;
}

export interface PokemonMovePools {
  fast: string[];
  charged: string[];
  eliteFast: string[];
  eliteCharged: string[];
}

export type PokemonFunctionalDifference = "none" | "moves" | "types" | "stats" | "multiple";

export interface PokemonReference {
  pokemonKey: string;
  pokemonId: number;
  displayName: string;
  formId: string;
  types: string[];
  stats?: PokemonStats;
  moves?: PokemonMovePools;
  assetUrl?: string;
  functionalDifference: PokemonFunctionalDifference;
  shinyAvailable?: boolean;
  provenance: PokemonProvenance;
}

export interface PokemonFormSummary {
  pokemonKey: string;
  formId: string;
  types: string[];
  assetUrl?: string;
  functionalDifference: PokemonFunctionalDifference;
}

export interface PokemonListEntry {
  pokemonKey: string;
  pokemonId: number;
  displayName: string;
  formId: string;
  types: string[];
  assetUrl?: string;
  formIds: string[];
  formCount: number;
  meaningfulFormCount: number;
}

export interface PokemonListResult {
  entries: PokemonListEntry[];
  freshness: Freshness;
  asOf?: string;
  warnings: string[];
}

export interface PokemonDetailResult extends PokemonReference {
  forms: PokemonFormSummary[];
  freshness: Freshness;
  warnings: string[];
}

export type Freshness = "fresh" | "stale" | "degraded" | "unavailable";
