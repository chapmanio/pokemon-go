import type { RaidBoss, RaidTier } from "../../domain/raid";

export interface RaidTierGroup {
  tier: RaidTier;
  label: string;
  bosses: RaidBoss[];
}

function tierSortValue(tier: RaidTier): number {
  return tier === "mega" ? 6 : tier;
}

export function tierLabel(tier: RaidTier): string {
  return tier === "mega" ? "Mega raids" : `Tier ${tier} raids`;
}

export function groupRaidsByTier(bosses: RaidBoss[]): RaidTierGroup[] {
  const grouped = new Map<string, RaidTierGroup>();

  for (const boss of bosses) {
    const key = String(boss.tier);
    const group = grouped.get(key) ?? {
      tier: boss.tier,
      label: tierLabel(boss.tier),
      bosses: [],
    };
    group.bosses.push(boss);
    grouped.set(key, group);
  }

  return [...grouped.values()].sort((left, right) => tierSortValue(left.tier) - tierSortValue(right.tier));
}

export function formatCpRange(range?: { min: number; max: number }): string | undefined {
  if (!range) return undefined;
  return `${range.min.toLocaleString()}–${range.max.toLocaleString()} CP`;
}

export function sourceLabel(source: string): string {
  const labels: Record<string, string> = {
    leekduck: "Leek Duck",
    pogoapi: "PoGoAPI",
    "pokemon-go-api": "Pokémon GO API",
  };
  return labels[source] ?? source;
}
