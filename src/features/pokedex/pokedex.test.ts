import { describe, expect, it } from "vitest";
import type { PokemonListEntry } from "../../domain/pokemon";
import { filterPokemon, formLabel } from "./pokedex";

const entries: PokemonListEntry[] = [
  { pokemonKey: "25:normal", pokemonId: 25, displayName: "Pikachu", formId: "Normal", types: ["Electric"] },
  { pokemonKey: "26:alola", pokemonId: 26, displayName: "Raichu", formId: "Alola", types: ["Electric", "Psychic"] },
];

describe("pokedex helpers", () => {
  it("formats form labels without showing Normal", () => {
    expect(formLabel("Normal")).toBeUndefined();
    expect(formLabel("Galarian")).toBe("Galarian");
    expect(formLabel("Summer_2023_a")).toBe("Summer 2023 A");
  });

  it("filters by name, form, or exact dex number", () => {
    expect(filterPokemon(entries, "rai").map((entry) => entry.displayName)).toEqual(["Raichu"]);
    expect(filterPokemon(entries, "alola").map((entry) => entry.displayName)).toEqual(["Raichu"]);
    expect(filterPokemon(entries, "25").map((entry) => entry.displayName)).toEqual(["Pikachu"]);
  });
});
