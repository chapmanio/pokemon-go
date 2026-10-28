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

const files = ["pokemon_stats.json", "pokemon_types.json", "current_pokemon_moves.json"] as const;

async function fetchJson(url: string, fetcher: typeof fetch): Promise<unknown> {
  const response = await fetcher(url);
  if (!response.ok) throw new Error(`PoGoAPI returned HTTP ${response.status} for ${url}`);
  return response.json();
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

  const [stats, types, moves] = await Promise.all(
    files.map((file) => fetchJson(`${BASE_URL}/${file}`, fetcher)),
  );

  return { payload: { stats, types, moves }, upstreamHashes };
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
