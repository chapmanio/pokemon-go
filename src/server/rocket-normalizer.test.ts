import { describe, expect, it } from "vitest";
import fixture from "../../docs/fixtures/rocket/rocket_lineups.json";
import { normalizeRocketPayload } from "./rocket-normalizer";

const provenance = {
  source: "leekduck" as const,
  endpoint: "rocket_lineups.json",
  sourceUrl: "https://example.test/rocket_lineups.json",
  fetchedAt: "2026-11-23T12:00:00.000Z",
  contentHash: "fixture-hash",
};

describe("Rocket source normalizer", () => {
  it("classifies members and derives transparent type-theme guidance", () => {
    const members = normalizeRocketPayload(fixture, provenance);
    const grunt = members.find((member) => member.displayName === "Fire-type Female Grunt");
    const giovanni = members.find((member) => member.displayName === "Giovanni");

    expect(grunt).toMatchObject({
      kind: "grunt",
      themeType: "fire",
      counterTypes: ["Water", "Ground", "Rock"],
      lineup: [
        { slot: 1, isEncounter: true },
        { slot: 2, isEncounter: false },
        { slot: 3, isEncounter: false },
      ],
    });
    expect(giovanni).toMatchObject({
      kind: "giovanni",
      counterTypes: [],
      lineup: [{ slot: 1, isEncounter: false }, { slot: 2, isEncounter: false }],
    });
  });

  it("rejects malformed or duplicate lineup slots", () => {
    expect(() => normalizeRocketPayload({ Test: [
      { slot: 1, is_encounter: true, pokemons: [{ name: "A", shiny_available: true }] },
      { slot: 1, is_encounter: false, pokemons: [{ name: "B", shiny_available: true }] },
    ] }, provenance)).toThrow("Invalid Rocket lineup");
  });
});
