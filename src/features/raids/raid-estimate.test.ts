import { describe, expect, it } from "vitest";
import type { RaidBoss } from "../../domain/raid";
import { estimateRaid } from "./raid-estimate";

const boss: RaidBoss = {
  raidBossId: "palkia:normal:5:normal",
  displayName: "Palkia",
  tier: 5,
  isShadow: false,
  types: ["Water", "Dragon"],
  battleEstimator: 2,
  provenance: {
    source: "pokemon-go-api",
    endpoint: "raidboss.json",
    sourceUrl: "https://example.test/raidboss.json",
    fetchedAt: "2026-10-27T12:00:00.000Z",
  },
};

describe("raid estimates", () => {
  it("shows the source estimate in generic mode", () => {
    expect(estimateRaid(boss, {
      mode: "generic",
      trainerCount: 2,
      strength: "capable",
      remoteMix: "local",
      partyPlay: false,
    })).toMatchObject({
      headline: "About 2 capable trainers",
    });
  });

  it("changes the family estimate when Party Play is enabled", () => {
    const withoutPartyPlay = estimateRaid(boss, {
      mode: "our-group",
      trainerCount: 2,
      strength: "capable",
      remoteMix: "local",
      partyPlay: false,
    });
    const withPartyPlay = estimateRaid(boss, {
      mode: "our-group",
      trainerCount: 2,
      strength: "capable",
      remoteMix: "local",
      partyPlay: true,
    });

    expect(withoutPartyPlay.band).toBe("borderline");
    expect(withPartyPlay.band).toBe("likely");
    expect(withPartyPlay.detail).not.toBe(withoutPartyPlay.detail);
  });

  it("does not invent a trainer estimate when the source has none", () => {
    const result = estimateRaid({ ...boss, battleEstimator: undefined }, {
      mode: "generic",
      trainerCount: 2,
      strength: "capable",
      remoteMix: "local",
      partyPlay: false,
    });

    expect(result.headline).toBe("No source estimate available");
  });
});
