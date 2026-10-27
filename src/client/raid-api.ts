import type { Freshness, RaidRosterResult } from "../domain/raid";

const freshnessValues: Freshness[] = ["fresh", "stale", "degraded", "unavailable"];

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

export async function fetchRaidRoster(signal?: AbortSignal): Promise<RaidRosterResult> {
  const response = await fetch("/api/v1/raids", {
    signal,
    cache: "no-store",
    headers: { accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Raid service returned HTTP ${response.status}`);
  }

  const payload: unknown = await response.json();
  if (!isRaidRosterResult(payload)) {
    throw new Error("Raid service returned an unexpected response");
  }

  return payload;
}
