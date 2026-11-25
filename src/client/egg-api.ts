import type { EggPoolsResult } from "../domain/egg";
import type { Freshness } from "../domain/raid";

const freshnessValues: Freshness[] = ["fresh", "stale", "degraded", "unavailable"];

function isEggPoolsResult(value: unknown): value is EggPoolsResult {
  if (!value || typeof value !== "object") return false;
  const result = value as Partial<EggPoolsResult>;
  return Array.isArray(result.pools)
    && Array.isArray(result.sources)
    && Array.isArray(result.warnings)
    && typeof result.freshness === "string"
    && freshnessValues.includes(result.freshness as Freshness);
}

export async function fetchEggPools(signal?: AbortSignal): Promise<EggPoolsResult> {
  const response = await fetch("/api/v1/eggs", {
    signal,
    cache: "default",
    headers: { accept: "application/json" },
  });
  if (!response.ok) throw new Error(`Egg service returned HTTP ${response.status}`);
  const payload: unknown = await response.json();
  if (!isEggPoolsResult(payload)) throw new Error("Egg service returned an unexpected response");
  return payload;
}
