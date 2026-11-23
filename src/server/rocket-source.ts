import type { RocketProvenance } from "../domain/rocket";
import { normalizeRocketPayload } from "./rocket-normalizer";

export interface RocketSourcePayload {
  payload: unknown;
  contentHash?: string;
  sourceUpdatedAt?: string;
}

export interface RocketSourceAdapter {
  source: "leekduck";
  endpoint: string;
  sourceUrl: string;
  fetchPayload: () => Promise<RocketSourcePayload>;
  normalize: typeof normalizeRocketPayload;
}

const ROCKET_URL = "https://pokelitee.github.io/leak-duck/rocket_lineups.json";
const MANIFEST_URL = "https://pokelitee.github.io/leak-duck/manifest.json";

export interface FixtureRocketAdapterOptions {
  fetch?: () => Promise<RocketSourcePayload>;
}

export function createFixtureRocketAdapter(
  payload: unknown,
  options: FixtureRocketAdapterOptions = {},
): RocketSourceAdapter {
  return {
    source: "leekduck",
    endpoint: "rocket_lineups.json",
    sourceUrl: ROCKET_URL,
    fetchPayload: options.fetch ?? (async () => ({ payload })),
    normalize: normalizeRocketPayload,
  };
}

function manifestMetadata(manifest: unknown): Pick<RocketSourcePayload, "contentHash" | "sourceUpdatedAt"> {
  const files = manifest && typeof manifest === "object" ? (manifest as Record<string, unknown>).files : undefined;
  const file = files && typeof files === "object" ? (files as Record<string, unknown>)["rocket_lineups.json"] : undefined;
  if (!file || typeof file !== "object") return {};
  const record = file as Record<string, unknown>;
  return {
    contentHash: typeof record.sha256 === "string" ? record.sha256 : undefined,
    sourceUpdatedAt: typeof record.updated_at === "string" ? record.updated_at : undefined,
  };
}

export function createHttpRocketAdapter(fetcher: typeof fetch = fetch): RocketSourceAdapter {
  return {
    source: "leekduck",
    endpoint: "rocket_lineups.json",
    sourceUrl: ROCKET_URL,
    fetchPayload: async () => {
      const [rocketResponse, manifestResponse] = await Promise.all([fetcher(ROCKET_URL), fetcher(MANIFEST_URL)]);
      if (!rocketResponse.ok) throw new Error(`Leek Duck Rocket data returned HTTP ${rocketResponse.status}`);
      if (!manifestResponse.ok) throw new Error(`Leek Duck manifest returned HTTP ${manifestResponse.status}`);
      return {
        payload: await rocketResponse.json(),
        ...manifestMetadata(await manifestResponse.json()),
      };
    },
    normalize: normalizeRocketPayload,
  };
}

export type RocketNormalizationProvenance = RocketProvenance;
