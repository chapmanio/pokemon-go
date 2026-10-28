import { describe, expect, it } from "vitest";
import fixture from "../../docs/fixtures/pokedex/pogoapi.json";
import { createMemoryPokemonSnapshotStore } from "./pokemon-snapshot-store";
import { createPokemonService } from "./pokemon-service";

const hashes = {
  "pokemon_stats.json": { hash_sha256: "stats-hash" },
  "pokemon_types.json": { hash_sha256: "types-hash" },
  "current_pokemon_moves.json": { hash_sha256: "moves-hash" },
};

function createFetcher(options: { fail?: boolean } = {}): typeof fetch {
  return (async (input: RequestInfo | URL) => {
    if (options.fail) throw new Error("source unavailable");
    const url = String(input);
    const value = url.endsWith("api_hashes.json")
      ? hashes
      : url.endsWith("pokemon_stats.json")
        ? fixture.stats
        : url.endsWith("pokemon_types.json")
          ? fixture.types
          : fixture.moves;
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
