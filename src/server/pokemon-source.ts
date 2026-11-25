import type { PokemonSource } from "../domain/pokemon";
import type { PokemonReferencePayload } from "./pokemon-normalizer";

export interface PokemonNormalizationProvenance {
  source: PokemonSource;
  endpoint: string;
  sourceUrl: string;
  fetchedAt: string;
  sourceUpdatedAt?: string;
  contentHash?: string;
}

export interface PokemonSourcePayload {
  payload: PokemonReferencePayload;
  upstreamHashes: Record<string, string>;
}

const BASE_URL = "https://pogoapi.net/api/v1";
const SOURCE_URL = "https://pogoapi.net/documentation/";

const files = [
  "pokemon_stats.json",
  "pokemon_types.json",
  "current_pokemon_moves.json",
  "fast_moves.json",
  "charged_moves.json",
  "type_effectiveness.json",
] as const;

async function fetchJson(url: string, fetcher: typeof fetch): Promise<unknown> {
  const response = await fetcher(url);
  if (!response.ok) throw new Error(`PoGoAPI returned HTTP ${response.status} for ${url}`);
  return response.json();
}

function validatePayloadShape(payload: Record<string, unknown>): void {
  for (const file of ["stats", "types", "moves", "fastMoves", "chargedMoves"] as const) {
    if (!Array.isArray(payload[file])) throw new Error(`PoGoAPI ${file} response was not an array`);
  }
  const effectiveness = payload.typeEffectiveness;
  if (!effectiveness || typeof effectiveness !== "object" || Array.isArray(effectiveness)) {
    throw new Error("PoGoAPI type effectiveness response was not an object");
  }
  if (!Array.isArray(payload.stats) || !Array.isArray(payload.types) || !Array.isArray(payload.moves)
    || payload.stats.length === 0 || payload.types.length === 0 || payload.moves.length === 0) {
    throw new Error("PoGoAPI required Pokédex files were empty");
  }
}

function hashForManifest(manifest: unknown, file: string): string | undefined {
  if (!manifest || typeof manifest !== "object") return undefined;
  const item = (manifest as Record<string, unknown>)[file];
  if (!item || typeof item !== "object") return undefined;
  const hash = (item as Record<string, unknown>).hash_sha256;
  return typeof hash === "string" && hash.length > 0 ? hash : undefined;
}

export async function fetchPokemonSourcePayload(fetcher: typeof fetch = fetch): Promise<PokemonSourcePayload> {
  const manifest = await fetchJson(`${BASE_URL}/api_hashes.json`, fetcher);
  const upstreamHashes: Record<string, string> = {};
  for (const file of files) {
    const hash = hashForManifest(manifest, file);
    if (!hash) throw new Error("PoGoAPI hash manifest did not contain all Pokédex files");
    upstreamHashes[file] = hash;
  }

  const [stats, types, moves, fastMoves, chargedMoves, typeEffectiveness] = await Promise.all(
    files.map((file) => fetchJson(`${BASE_URL}/${file}`, fetcher)),
  );

  const payload = { stats, types, moves, fastMoves, chargedMoves, typeEffectiveness };
  validatePayloadShape(payload);
  return { payload, upstreamHashes };
}

export function pokemonProvenance(fetchedAt: Date, contentHash?: string): PokemonNormalizationProvenance {
  return {
    source: "pogoapi",
    endpoint: files.join(","),
    sourceUrl: SOURCE_URL,
    fetchedAt: fetchedAt.toISOString(),
    contentHash,
  };
}

export { files as pokemonSourceFiles };
