import type { PokemonListEntry } from "../../domain/pokemon";

export function formLabel(formId: string): string | undefined {
  if (formId.toLowerCase() === "normal") return undefined;
  return formId.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function filterPokemon(entries: PokemonListEntry[], query: string): PokemonListEntry[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return entries;
  return entries.filter((entry) => (
    entry.displayName.toLowerCase().includes(normalizedQuery)
    || entry.formId.toLowerCase().includes(normalizedQuery)
    || String(entry.pokemonId) === normalizedQuery
  ));
}
