import { describe, expect, it } from "vitest";
import { normalizeMaxBattles } from "./max-battle-normalizer";

const provenance = {
  source: "pokemon-go-api" as const,
  endpoint: "maxbattles.json",
  sourceUrl: "https://example.test/maxbattles.json",
  fetchedAt: "2026-11-25T12:00:00.000Z",
};

describe("Max Battle source normalizer", () => {
  it("normalizes tiered Dynamax and Gigantamax records", () => {
    const battles = normalizeMaxBattles({
      currentList: {
        tier_3: [{
          id: "BULBASAUR",
          names: { English: "Bulbasaur" },
          level: 3,
          shiny: true,
          types: ["Grass", "Poison"],
          cpRange: [590, 737],
          assets: { image: "https://example.test/bulbasaur.png" },
        }],
        tier_6: [{
          id: "CHARIZARD",
          names: { English: "Gigantamax Charizard" },
          level: 6,
          shiny: false,
          types: ["Fire", "Flying"],
        }],
      },
    }, provenance);

    expect(battles).toMatchObject([
      { displayName: "Bulbasaur", level: 3, kind: "dynamax", catchCp: { min: 590, max: 737 } },
      { displayName: "Gigantamax Charizard", level: 6, kind: "gigantamax" },
    ]);
  });

  it("accepts the currentList array shape", () => {
    expect(normalizeMaxBattles({ currentList: [] }, provenance)).toEqual([]);
  });
});
