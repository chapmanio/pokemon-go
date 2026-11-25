import { describe, expect, it } from "vitest";
import { fetchPokemonSourcePayload, pokemonSourceFiles } from "./pokemon-source";

function sourceFetcher(overrides: Record<string, unknown> = {}): typeof fetch {
  const manifest = Object.fromEntries(pokemonSourceFiles.map((file) => [file, { hash_sha256: `${file}-hash` }]));
  return (async (input: RequestInfo | URL) => {
    const url = String(input);
    const file = url.split("/").pop() ?? "";
    const payload = file === "api_hashes.json"
      ? manifest
      : overrides[file] ?? (file === "type_effectiveness.json" ? { Fire: { Grass: 1.6 } } : [{ name: file }] );
    return new Response(JSON.stringify(payload), { status: 200, headers: { "content-type": "application/json" } });
  }) as typeof fetch;
}

describe("PokéAPI source validation", () => {
  it("rejects a changed file shape before normalization can publish it", async () => {
    await expect(fetchPokemonSourcePayload(sourceFetcher({ "pokemon_types.json": { broken: true } })))
      .rejects.toThrow("PoGoAPI types response was not an array");
  });

  it("rejects empty required reference files", async () => {
    await expect(fetchPokemonSourcePayload(sourceFetcher({ "pokemon_stats.json": [] })))
      .rejects.toThrow("required Pokédex files were empty");
  });
});
