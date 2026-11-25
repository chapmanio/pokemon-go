import type { MaxBattleDetailResult, MaxBattleRosterResult } from "../domain/max-battle";
import type { Freshness } from "../domain/raid";

const freshnessValues: Freshness[] = ["fresh", "stale", "degraded", "unavailable"];

export class MaxBattleApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "MaxBattleApiError";
  }
}

function isRoster(value: unknown): value is MaxBattleRosterResult {
  if (!value || typeof value !== "object") return false;
  const result = value as Partial<MaxBattleRosterResult>;
  return Array.isArray(result.battles)
    && Array.isArray(result.sources)
    && Array.isArray(result.warnings)
    && typeof result.freshness === "string"
    && freshnessValues.includes(result.freshness as Freshness);
}

function isDetail(value: unknown): value is MaxBattleDetailResult {
  if (!value || typeof value !== "object") return false;
  const result = value as Partial<MaxBattleDetailResult>;
  return typeof result.maxBattleId === "string"
    && typeof result.displayName === "string"
    && Array.isArray(result.types)
    && typeof result.freshness === "string"
    && freshnessValues.includes(result.freshness as Freshness)
    && Array.isArray(result.warnings);
}

export async function fetchMaxBattleRoster(signal?: AbortSignal): Promise<MaxBattleRosterResult> {
  const response = await fetch("/api/v1/max-battles", {
    signal,
    cache: "default",
    headers: { accept: "application/json" },
  });
  if (!response.ok) throw new MaxBattleApiError(`Max Battle service returned HTTP ${response.status}`, response.status);
  const payload: unknown = await response.json();
  if (!isRoster(payload)) throw new Error("Max Battle service returned an unexpected response");
  return payload;
}

export async function fetchMaxBattle(
  maxBattleId: string,
  signal?: AbortSignal,
): Promise<MaxBattleDetailResult> {
  const response = await fetch(`/api/v1/max-battles/${encodeURIComponent(maxBattleId)}`, {
    signal,
    cache: "default",
    headers: { accept: "application/json" },
  });
  if (!response.ok) throw new MaxBattleApiError(`Max Battle service returned HTTP ${response.status}`, response.status);
  const payload: unknown = await response.json();
  if (!isDetail(payload)) throw new Error("Max Battle service returned an unexpected detail response");
  return payload;
}
