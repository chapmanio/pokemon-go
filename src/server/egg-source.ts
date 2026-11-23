import type { EggProvenance } from "../domain/egg";
import { normalizeEggPayload } from "./egg-normalizer";

export interface EggSourcePayload {
  payload: unknown;
  contentHash?: string;
  sourceUpdatedAt?: string;
}

export interface EggSourceAdapter {
  source: "leekduck";
  endpoint: string;
  sourceUrl: string;
  fetchPayload: () => Promise<EggSourcePayload>;
  normalize: typeof normalizeEggPayload;
}

const EGG_URL = "https://pokelitee.github.io/leak-duck/egg_pool.json";
const MANIFEST_URL = "https://pokelitee.github.io/leak-duck/manifest.json";

export interface FixtureEggAdapterOptions {
  fetch?: () => Promise<EggSourcePayload>;
}

export function createFixtureEggAdapter(payload: unknown, options: FixtureEggAdapterOptions = {}): EggSourceAdapter {
  return {
    source: "leekduck",
    endpoint: "egg_pool.json",
    sourceUrl: EGG_URL,
    fetchPayload: options.fetch ?? (async () => ({ payload })),
    normalize: normalizeEggPayload,
  };
}

function manifestMetadata(manifest: unknown): Pick<EggSourcePayload, "contentHash" | "sourceUpdatedAt"> {
  const files = manifest && typeof manifest === "object" ? (manifest as Record<string, unknown>).files : undefined;
  const file = files && typeof files === "object" ? (files as Record<string, unknown>)["egg_pool.json"] : undefined;
  if (!file || typeof file !== "object") return {};
  const record = file as Record<string, unknown>;
  return {
    contentHash: typeof record.sha256 === "string" ? record.sha256 : undefined,
    sourceUpdatedAt: typeof record.updated_at === "string" ? record.updated_at : undefined,
  };
}

export function createHttpEggAdapter(fetcher: typeof fetch = fetch): EggSourceAdapter {
  return {
    source: "leekduck",
    endpoint: "egg_pool.json",
    sourceUrl: EGG_URL,
    fetchPayload: async () => {
      const [eggResponse, manifestResponse] = await Promise.all([fetcher(EGG_URL), fetcher(MANIFEST_URL)]);
      if (!eggResponse.ok) throw new Error(`Leek Duck egg data returned HTTP ${eggResponse.status}`);
      if (!manifestResponse.ok) throw new Error(`Leek Duck manifest returned HTTP ${manifestResponse.status}`);
      return {
        payload: await eggResponse.json(),
        ...manifestMetadata(await manifestResponse.json()),
      };
    },
    normalize: normalizeEggPayload,
  };
}

export type EggNormalizationProvenance = EggProvenance;
