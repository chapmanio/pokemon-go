import { describe, expect, it } from "vitest";
import fixture from "../../docs/fixtures/pokedex/pogoapi.json";
import { createMemoryPokemonSnapshotStore } from "./pokemon-snapshot-store";
import { createPokemonService } from "./pokemon-service";

const hashes = {
  "pokemon_stats.json": { hash_sha256: "stats-hash" },
  "pokemon_types.json": { hash_sha256: "types-hash" },
  "current_pokemon_moves.json": { hash_sha256: "moves-hash" },
  "fast_moves.json": { hash_sha256: "fast-moves-hash" },
  "charged_moves.json": { hash_sha256: "charged-moves-hash" },
  "type_effectiveness.json": { hash_sha256: "type-effectiveness-hash" },
};

function createFetcher(options: { fail?: boolean; payload?: typeof fixture } = {}): typeof fetch {
  return (async (input: RequestInfo | URL) => {
    if (options.fail) throw new Error("source unavailable");
    const payload = options.payload ?? fixture;
    const url = String(input);
    const value = url.endsWith("api_hashes.json")
      ? hashes
      : url.endsWith("pokemon_stats.json")
        ? payload.stats
        : url.endsWith("pokemon_types.json")
          ? payload.types
          : url.endsWith("current_pokemon_moves.json")
            ? payload.moves
            : url.endsWith("fast_moves.json")
              ? payload.fastMoves
              : url.endsWith("charged_moves.json")
                ? payload.chargedMoves
                : payload.typeEffectiveness;
    return new Response(JSON.stringify(value), { status: 200 });
  }) as typeof fetch;
}

describe("Pokédex service", () => {
  it("caches the normalized reference snapshot and serves details", async () => {
    const service = createPokemonService({
      store: createMemoryPokemonSnapshotStore(),
      fetcher: createFetcher(),
      now: () => new Date("2026-10-28T12:00:00.000Z"),
    });

    const list = await service.getPokedex();
    const detail = await service.getPokemon("25:normal");

    expect(list.freshness).toBe("fresh");
    expect(list.entries).toHaveLength(2);
    expect(detail?.displayName).toBe("Pikachu");
    expect(detail?.freshness).toBe("fresh");
    expect(detail?.forms).toHaveLength(1);
    expect(detail?.battle.moveDetails.fast[0]).toMatchObject({ name: "Thunder Shock", type: "Electric", power: 5 });
    expect(detail?.battle.weaknesses).toEqual([{ attackType: "Ground", multiplier: 1.6 }]);
  });

  it("returns one list entry per number while retaining all forms in detail", async () => {
    const duplicateFixture = {
      ...fixture,
      stats: [
        ...fixture.stats,
        { pokemon_id: 25, pokemon_name: "Pikachu", form: "Copy_2019", base_attack: 112, base_defense: 96, base_stamina: 111 },
      ],
      types: [
        ...fixture.types,
        { pokemon_id: 25, pokemon_name: "Pikachu", form: "Copy_2019", type: ["Electric"] },
      ],
      moves: [
        ...fixture.moves,
        { pokemon_id: 25, pokemon_name: "Pikachu", form: "Copy_2019", fast_moves: ["Thunder Shock"], charged_moves: ["Wild Charge"], elite_fast_moves: ["Present"], elite_charged_moves: ["Surf"] },
      ],
    };
    const service = createPokemonService({
      store: createMemoryPokemonSnapshotStore(),
      fetcher: createFetcher({ payload: duplicateFixture }),
      now: () => new Date("2026-10-28T12:00:00.000Z"),
    });
    const list = await service.getPokedex();
    const detail = await service.getPokemon("25:normal");

    expect(list.entries.map((entry) => entry.pokemonId)).toEqual([25, 26]);
    expect(list.entries.find((entry) => entry.pokemonId === 25)?.formCount).toBe(2);
    expect(detail?.forms).toHaveLength(2);
  });

  it("returns generic counter candidates from matching move types", async () => {
    const service = createPokemonService({
      store: createMemoryPokemonSnapshotStore(),
      fetcher: createFetcher(),
      now: () => new Date("2026-10-28T12:00:00.000Z"),
    });

    const result = await service.getCounterCandidates(["Electric"]);

    expect(result.freshness).toBe("fresh");
    expect(result.candidates.map((candidate) => candidate.displayName)).toEqual(["Raichu", "Pikachu"]);
    expect(result.candidates[1]?.matchingMoves).toContain("Thunder Shock");
  });

  it("retains last-known-good data after a refresh failure", async () => {
    const store = createMemoryPokemonSnapshotStore();
    const service = createPokemonService({
      store,
      fetcher: createFetcher(),
      now: () => new Date("2026-10-28T12:00:00.000Z"),
    });
    await service.getPokedex();

    const failedService = createPokemonService({
      store,
      fetcher: createFetcher({ fail: true }),
      now: () => new Date("2026-10-29T12:00:00.000Z"),
    });
    const result = await failedService.getPokedex({ forceRefresh: true });

    expect(result.entries).toHaveLength(2);
    expect(result.freshness).toBe("degraded");
    expect(result.warnings).toHaveLength(1);
  });
});
