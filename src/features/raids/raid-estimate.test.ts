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
  it("rounds the source estimate up to whole capable trainers", () => {
    expect(estimateRaid({ ...boss, battleEstimator: 2.1 })).toMatchObject({
      capableTrainersNeeded: 3,
    });
  });

  it("checks whether four capable trainers with Party Play are enough", () => {
    expect(estimateRaid(boss).partyOfFour).toMatchObject({
      result: "likely",
      headline: "Likely yes",
    });
    expect(estimateRaid({ ...boss, battleEstimator: 5 }).partyOfFour).toMatchObject({
      result: "unlikely",
      headline: "Probably not",
    });
  });

  it("does not invent either answer when the source has no estimate", () => {
    const result = estimateRaid({ ...boss, battleEstimator: undefined });

    expect(result.capableTrainersNeeded).toBeUndefined();
    expect(result.partyOfFour.result).toBe("unknown");
  });
});
