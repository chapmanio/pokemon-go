import type { RocketMemberDetailResult, RocketRosterResult } from "../domain/rocket";
import type { Freshness } from "../domain/raid";

const freshnessValues: Freshness[] = ["fresh", "stale", "degraded", "unavailable"];

function isRocketRosterResult(value: unknown): value is RocketRosterResult {
  if (!value || typeof value !== "object") return false;
  const result = value as Partial<RocketRosterResult>;
  return Array.isArray(result.members)
    && Array.isArray(result.sources)
    && Array.isArray(result.warnings)
    && typeof result.freshness === "string"
    && freshnessValues.includes(result.freshness as Freshness);
}

function isRocketMemberDetailResult(value: unknown): value is RocketMemberDetailResult {
  if (!value || typeof value !== "object") return false;
  const result = value as Partial<RocketMemberDetailResult>;
  return typeof result.memberId === "string"
    && typeof result.displayName === "string"
    && Array.isArray(result.lineup)
    && Array.isArray(result.counterSuggestions)
    && typeof result.freshness === "string"
    && freshnessValues.includes(result.freshness as Freshness)
    && Array.isArray(result.warnings);
}

export async function fetchRocketRoster(signal?: AbortSignal): Promise<RocketRosterResult> {
  const response = await fetch("/api/v1/rocket", {
    signal,
    cache: "no-store",
    headers: { accept: "application/json" },
  });
  if (!response.ok) throw new Error(`Rocket service returned HTTP ${response.status}`);
  const payload: unknown = await response.json();
  if (!isRocketRosterResult(payload)) throw new Error("Rocket service returned an unexpected response");
  return payload;
}

export async function fetchRocketMember(memberId: string, signal?: AbortSignal): Promise<RocketMemberDetailResult> {
  const response = await fetch(`/api/v1/rocket/${encodeURIComponent(memberId)}`, {
    signal,
    cache: "no-store",
    headers: { accept: "application/json" },
  });
  if (!response.ok) throw new Error(`Rocket service returned HTTP ${response.status}`);
  const payload: unknown = await response.json();
  if (!isRocketMemberDetailResult(payload)) throw new Error("Rocket service returned an unexpected member response");
  return payload;
}
