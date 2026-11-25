import { describe, expect, it } from "vitest";
import type { RaidBoss } from "../domain/raid";
import { fetchPokebattlerEstimate } from "./pokebattler-estimate";

const boss: RaidBoss = {
  raidBossId: "deino:normal:1:normal",
  speciesId: "DEINO",
  formId: "DEINO",
  displayName: "Deino",
  tier: 1,
  isShadow: false,
  types: ["Dark", "Dragon"],
  provenance: {
    source: "pokemon-go-api",
    endpoint: "raidboss.json",
    sourceUrl: "https://example.test/raidboss.json",
    fetchedAt: "2026-11-25T12:00:00.000Z",
  },
};

describe("Pokébattler estimate adapter", () => {
  it("extracts the best estimator from the nested response", async () => {
    const estimate = await fetchPokebattlerEstimate(boss, async () => new Response(JSON.stringify({
      attackers: [{ byMove: [{ defenders: [
        { total: { estimator: 2.4 } },
        { total: { estimator: 1.8 } },
      ] }] }],
    })));

    expect(estimate).toBe(1.8);
  });

  it("does not guess a Pokébattler shadow identifier", async () => {
    const estimate = await fetchPokebattlerEstimate({ ...boss, isShadow: true }, async () => {
      throw new Error("should not fetch");
    });

    expect(estimate).toBeUndefined();
  });
});
