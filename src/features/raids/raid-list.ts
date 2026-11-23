import type { PokemonCounterCandidate } from "../../domain/pokemon";
import type { RaidBoss, RaidTier } from "../../domain/raid";

export interface RaidTierGroup {
  tier: RaidTier;
  label: string;
  bosses: RaidBoss[];
}

export interface CounterSuggestionGroup {
  key: "primary" | "alternative";
  label: string;
  detail: string;
  suggestions: PokemonCounterCandidate[];
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

export function groupCounterSuggestions(suggestions: PokemonCounterCandidate[]): CounterSuggestionGroup[] {
  const groups: CounterSuggestionGroup[] = [
    {
      key: "primary",
      label: "Strong generic options",
      detail: "The strongest matches in the cached Pokédex based on attack types and move coverage.",
      suggestions: suggestions.slice(0, 3),
    },
    {
      key: "alternative",
      label: "Other effective options",
      detail: "Other Pokémon with matching moves. They may trade off damage, availability or durability.",
      suggestions: suggestions.slice(3),
    },
  ];

  return groups.filter((group) => group.suggestions.length > 0);
}

export function sourceLabel(source: string): string {
  const labels: Record<string, string> = {
    leekduck: "Leek Duck",
    pogoapi: "PoGoAPI",
    "pokemon-go-api": "Pokémon GO API",
  };
  return labels[source] ?? source;
}
