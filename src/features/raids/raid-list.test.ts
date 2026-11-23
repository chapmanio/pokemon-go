import { describe, expect, it } from "vitest";
import type { RaidBoss } from "../../domain/raid";
import { formatCpRange, groupCounterSuggestions, groupRaidsByTier } from "./raid-list";

function boss(tier: RaidBoss["tier"], displayName: string): RaidBoss {
  return {
    raidBossId: displayName.toLowerCase(),
    displayName,
    tier,
    isShadow: false,
    types: ["Dragon"],
    provenance: {
      source: "leekduck",
      endpoint: "raid_bosses.json",
      sourceUrl: "https://example.test/raid_bosses.json",
      fetchedAt: "2026-10-27T12:00:00.000Z",
    },
  };
}

describe("raid list helpers", () => {
  it("groups tiers in raid order and keeps bosses together", () => {
    const groups = groupRaidsByTier([
      boss("mega", "Mega Charizard X"),
      boss(5, "Palkia"),
      boss(1, "Axew"),
      boss(1, "Goomy"),
    ]);

    expect(groups.map((group) => group.label)).toEqual([
      "Tier 1 raids",
      "Tier 5 raids",
      "Mega raids",
    ]);
    expect(groups[0].bosses.map((raidBoss) => raidBoss.displayName)).toEqual(["Axew", "Goomy"]);
  });

  it("formats optional catch CP ranges", () => {
    expect(formatCpRange({ min: 1_234, max: 2_345 })).toBe("1,234–2,345 CP");
    expect(formatCpRange()).toBeUndefined();
  });

  it("separates the strongest counter matches from alternatives", () => {
    const suggestions = Array.from({ length: 5 }, (_, index) => ({
      pokemonKey: `pokemon-${index}`,
      pokemonId: index + 1,
      displayName: `Pokémon ${index}`,
      formId: "normal",
      types: ["Ground"],
      matchingMoveTypes: ["Ground"],
      matchingMoves: ["Mud Shot"],
    }));

    const groups = groupCounterSuggestions(suggestions);

    expect(groups.map((group) => group.key)).toEqual(["primary", "alternative"]);
    expect(groups[0].suggestions).toHaveLength(3);
    expect(groups[1].suggestions.map((suggestion) => suggestion.displayName)).toEqual([
      "Pokémon 3",
      "Pokémon 4",
    ]);
  });
});
