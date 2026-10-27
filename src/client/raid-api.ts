import type { Freshness, RaidBossDetailResult, RaidRosterResult } from "../domain/raid";

const freshnessValues: Freshness[] = ["fresh", "stale", "degraded", "unavailable"];

export class RaidApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "RaidApiError";
  }
}

function isRaidRosterResult(value: unknown): value is RaidRosterResult {
  if (!value || typeof value !== "object") return false;

  const result = value as Partial<RaidRosterResult>;
  return (
    Array.isArray(result.bosses) &&
    Array.isArray(result.sources) &&
    Array.isArray(result.warnings) &&
    typeof result.freshness === "string" &&
    freshnessValues.includes(result.freshness as Freshness)
  );
}

function isRaidBossDetailResult(value: unknown): value is RaidBossDetailResult {
  if (!value || typeof value !== "object") return false;

  const result = value as Partial<RaidBossDetailResult>;
  return (
    typeof result.raidBossId === "string" &&
    typeof result.displayName === "string" &&
    Array.isArray(result.types) &&
    typeof result.freshness === "string" &&
    freshnessValues.includes(result.freshness as Freshness) &&
    Array.isArray(result.warnings)
  );
}

export async function fetchRaidRoster(signal?: AbortSignal): Promise<RaidRosterResult> {
  const response = await fetch("/api/v1/raids", {
    signal,
    cache: "no-store",
    headers: { accept: "application/json" },
  });

  if (!response.ok) {
    throw new RaidApiError(`Raid service returned HTTP ${response.status}`, response.status);
  }

  const payload: unknown = await response.json();
  if (!isRaidRosterResult(payload)) {
    throw new Error("Raid service returned an unexpected response");
  }

  return payload;
}

export async function fetchRaidBoss(
  raidBossId: string,
  signal?: AbortSignal,
): Promise<RaidBossDetailResult> {
  const response = await fetch(`/api/v1/raids/${encodeURIComponent(raidBossId)}`, {
    signal,
    cache: "no-store",
    headers: { accept: "application/json" },
  });

  if (!response.ok) {
    throw new RaidApiError(`Raid service returned HTTP ${response.status}`, response.status);
  }

  const payload: unknown = await response.json();
  if (!isRaidBossDetailResult(payload)) {
    throw new Error("Raid service returned an unexpected raid detail response");
  }

  return payload;
}
