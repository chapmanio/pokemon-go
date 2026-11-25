import { describe, expect, it } from "vitest";
import fixture from "../../docs/fixtures/eggs/egg_pool.json";
import { normalizeEggPayload } from "./egg-normalizer";

const provenance = {
  source: "leekduck" as const,
  endpoint: "egg_pool.json",
  sourceUrl: "https://example.test/egg_pool.json",
  fetchedAt: "2026-11-23T12:00:00.000Z",
  contentHash: "fixture-hash",
};

describe("egg source normalizer", () => {
  it("preserves distinct group identities, distances and rarity labels", () => {
    const pools = normalizeEggPayload(fixture, provenance);

    expect(pools).toHaveLength(2);
    expect(pools[0]).toMatchObject({
      eggPoolId: "leek-duck:egg:2-km-eggs",
      displayName: "2 km Eggs",
      hatchDistanceKm: 2,
      entries: [
        { name: "Pichu", shinyAvailable: true, rarityTier: 1, assetUrl: "https://cdn.example.test/pichu.png" },
        { name: "Smoochum", shinyAvailable: false, rarityTier: 4 },
      ],
    });
    expect(pools[1].eggPoolId).toBe("leek-duck:egg:7-km-eggs-from-friend-gifts");
  });

  it("rejects inconsistent group distances", () => {
    expect(() => normalizeEggPayload({ "2 km Eggs": [
      { name: "Pichu", shiny_available: true, hatch_distance: 2 },
      { name: "Smoochum", shiny_available: true, hatch_distance: 5 },
    ] }, provenance)).toThrow("Inconsistent egg hatch distance");
  });

  it("rejects duplicate names within one egg group", () => {
    expect(() => normalizeEggPayload({ "2 km Eggs": [
      { name: "Pichu", shiny_available: true, hatch_distance: 2 },
      { name: "pichu", shiny_available: false, hatch_distance: 2 },
    ] }, provenance)).toThrow("Duplicate egg entry");
  });
});
