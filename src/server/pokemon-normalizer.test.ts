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

  it("marks equivalent event forms separately from forms with gameplay differences", () => {
    const entries = normalizePokemonReference({
      ...fixture,
      stats: [
        ...fixture.stats,
        { pokemon_id: 25, pokemon_name: "Pikachu", form: "Copy_2019", base_attack: 112, base_defense: 96, base_stamina: 111 },
        { pokemon_id: 26, pokemon_name: "Raichu", form: "Normal", base_attack: 193, base_defense: 151, base_stamina: 155 },
      ],
      types: [
        ...fixture.types,
        { pokemon_id: 25, pokemon_name: "Pikachu", form: "Copy_2019", type: ["Electric"] },
        { pokemon_id: 26, pokemon_name: "Raichu", form: "Normal", type: ["Electric"] },
      ],
      moves: [
        ...fixture.moves,
        { pokemon_id: 25, pokemon_name: "Pikachu", form: "Copy_2019", fast_moves: ["Thunder Shock"], charged_moves: ["Wild Charge"], elite_fast_moves: ["Present"], elite_charged_moves: ["Surf"] },
        { pokemon_id: 26, pokemon_name: "Raichu", form: "Normal", fast_moves: ["Volt Switch"], charged_moves: ["Thunder Punch"], elite_fast_moves: [], elite_charged_moves: [] },
      ],
    }, provenance);

    expect(entries.find((entry) => entry.pokemonKey === "25:copy-2019")?.functionalDifference).toBe("none");
    expect(entries.find((entry) => entry.pokemonKey === "26:alola")?.functionalDifference).toBe("multiple");
  });
});
