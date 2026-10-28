import type { Freshness, PokemonDetailResult, PokemonListResult } from "../domain/pokemon";

const freshnessValues: Freshness[] = ["fresh", "stale", "degraded", "unavailable"];

function isPokemonListResult(value: unknown): value is PokemonListResult {
  if (!value || typeof value !== "object") return false;
  const result = value as Partial<PokemonListResult>;
  return Array.isArray(result.entries)
    && Array.isArray(result.warnings)
    && typeof result.freshness === "string"
    && freshnessValues.includes(result.freshness as Freshness);
}

function isPokemonDetailResult(value: unknown): value is PokemonDetailResult {
  if (!value || typeof value !== "object") return false;
  const result = value as Partial<PokemonDetailResult>;
  return typeof result.pokemonKey === "string"
    && typeof result.pokemonId === "number"
    && typeof result.displayName === "string"
    && typeof result.formId === "string"
    && Array.isArray(result.types)
    && typeof result.freshness === "string"
    && freshnessValues.includes(result.freshness as Freshness)
    && Array.isArray(result.warnings);
}

export async function fetchPokemonList(signal?: AbortSignal): Promise<PokemonListResult> {
  const response = await fetch("/api/v1/pokemon", {
    signal,
    cache: "no-store",
    headers: { accept: "application/json" },
  });
  if (!response.ok) throw new Error(`Pokédex service returned HTTP ${response.status}`);
  const payload: unknown = await response.json();
  if (!isPokemonListResult(payload)) throw new Error("Pokédex service returned an unexpected response");
  return payload;
}

export async function fetchPokemonDetail(
  pokemonKey: string,
  signal?: AbortSignal,
): Promise<PokemonDetailResult> {
  const response = await fetch(`/api/v1/pokemon/${encodeURIComponent(pokemonKey)}`, {
    signal,
    cache: "no-store",
    headers: { accept: "application/json" },
  });
  if (!response.ok) throw new Error(`Pokédex service returned HTTP ${response.status}`);
  const payload: unknown = await response.json();
  if (!isPokemonDetailResult(payload)) throw new Error("Pokédex service returned an unexpected detail response");
  return payload;
}
