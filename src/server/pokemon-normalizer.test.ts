import { describe, expect, it } from "vitest";
import fixture from "../../docs/fixtures/pokedex/pogoapi.json";
import { normalizePokemonReference } from "./pokemon-normalizer";

const provenance = {
  source: "pogoapi" as const,
  endpoint: "pokemon_stats.json,pokemon_types.json,current_pokemon_moves.json",
  sourceUrl: "https://example.test/pogoapi",
  fetchedAt: "2026-10-28T12:00:00.000Z",
  contentHash: "fixture-hash",
};

describe("Pokédex normalizer", () => {
  it("joins form-aware stats, types, and moves into app-owned records", () => {
    const entries = normalizePokemonReference(fixture, provenance);
    const pikachu = entries.find((entry) => entry.pokemonKey === "25:normal");
    const raichu = entries.find((entry) => entry.pokemonKey === "26:alola");

    expect(pikachu).toMatchObject({
      pokemonId: 25,
      displayName: "Pikachu",
      formId: "Normal",
      types: ["Electric"],
      stats: { attack: 112, defense: 96, stamina: 111 },
      moves: {
        fast: ["Thunder Shock"],
        charged: ["Wild Charge"],
        eliteFast: ["Present"],
        eliteCharged: ["Surf"],
      },
    });
    expect(raichu?.types).toEqual(["Electric", "Psychic"]);
  });
});
