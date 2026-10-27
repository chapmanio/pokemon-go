import { describe, expect, it } from "vitest";
import type { RaidBoss } from "../../domain/raid";
import { formatCpRange, groupRaidsByTier } from "./raid-list";

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
});
