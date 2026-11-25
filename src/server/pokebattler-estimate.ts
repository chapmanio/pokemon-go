import type { RaidBoss } from "../domain/raid";

const BASE_URL = "https://fight.pokebattler.com/raids/defenders";
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const estimateCache = new Map<string, { expiresAt: number; value?: number }>();

function slug(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function defenderId(boss: RaidBoss): string | undefined {
  if (boss.isShadow) return undefined;
  if (typeof boss.formId === "string" && boss.formId.length > 0 && boss.formId.toLowerCase() !== "normal") {
    return slug(boss.formId);
  }
  if (typeof boss.speciesId === "string" && boss.speciesId.length > 0) return slug(boss.speciesId);
  const displayName = boss.displayName
    .replace(/^Shadow\s+/i, "")
    .replace(/^Mega\s+/i, "")
    .replace(/^(?:Sun|Moon) Crown\s+/i, "")
    .replace(/\s+wearing a .+$/i, "");
  return displayName ? slug(displayName) : undefined;
}

function tierId(boss: RaidBoss): string {
  return `RAID_LEVEL_${boss.tier === "mega" ? 5 : boss.tier}`;
}

function minEstimator(value: unknown): number | undefined {
  const estimates: number[] = [];
  const visit = (candidate: unknown): void => {
    if (Array.isArray(candidate)) {
      candidate.forEach(visit);
      return;
    }
    if (!candidate || typeof candidate !== "object") return;
    const record = candidate as Record<string, unknown>;
    if (typeof record.estimator === "number" && Number.isFinite(record.estimator)) estimates.push(record.estimator);
    Object.values(record).forEach(visit);
  };
  visit(value);
  return estimates.length > 0 ? Math.min(...estimates) : undefined;
}

export async function fetchPokebattlerEstimate(
  boss: RaidBoss,
  fetcher: typeof fetch = fetch,
): Promise<number | undefined> {
  const id = defenderId(boss);
  if (!id) return undefined;

  const url = `${BASE_URL}/${encodeURIComponent(id)}/levels/${tierId(boss)}/attackers/levels/40/strategies/CINEMATIC_ATTACK_WHEN_POSSIBLE/DEFENSE_RANDOM_MC?sort=ESTIMATOR&weatherCondition=NO_WEATHER&dodgeStrategy=DODGE_REACTION_TIME&aggregation=AVERAGE`;
  const cached = estimateCache.get(url);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  try {
    const response = await fetcher(url, {
      headers: { accept: "application/json", "user-agent": "PoGo Buddy estimate adapter" },
    });
    if (!response.ok) {
      estimateCache.set(url, { expiresAt: Date.now() + CACHE_TTL_MS });
      return undefined;
    }
    const estimate = minEstimator(await response.json());
    estimateCache.set(url, { expiresAt: Date.now() + CACHE_TTL_MS, value: estimate });
    return estimate;
  } catch {
    estimateCache.set(url, { expiresAt: Date.now() + CACHE_TTL_MS });
    return undefined;
  }
}
