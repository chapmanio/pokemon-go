import { describe, expect, it } from "vitest";
import type { PokemonListEntry } from "../domain/pokemon";
import type { RaidBoss } from "../domain/raid";
import { canonicalRaidFormId, raidMergeKey, resolveRaidPokedexKey } from "./raid-identity";

const entry: PokemonListEntry = {
  pokemonKey: "52:normal",
  pokemonId: 52,
  displayName: "Meowth",
  formId: "Normal",
  formIds: ["Normal", "Alola", "Galarian"],
  types: ["Normal"],
  assetUrl: undefined,
  formCount: 3,
  meaningfulFormCount: 2,
};

function boss(overrides: Partial<RaidBoss>): RaidBoss {
  return {
    raidBossId: "meowth:normal:3:normal",
    speciesId: "MEOWTH",
    formId: "MEOWTH_ALOLA",
    displayName: "Alolan Meowth",
    tier: 3,
    isShadow: false,
    types: ["Dark"],
    provenance: {
      source: "pokemon-go-api",
      endpoint: "raids.json",
      sourceUrl: "https://example.test/raids.json",
      fetchedAt: "2026-11-25T00:00:00.000Z",
    },
    ...overrides,
  };
}

describe("raid identity helpers", () => {
  it("maps string source species and form identifiers to the Pokédex key", () => {
    expect(canonicalRaidFormId(boss({}))).toBe("alola");
    expect(resolveRaidPokedexKey(boss({}), [entry])).toBe("52:alola");
  });

  it("keeps regional forms separate while allowing different labels to merge", () => {
    expect(raidMergeKey(boss({ displayName: "Alolan Meowth" }))).toBe(
      raidMergeKey(boss({ displayName: "Meowth", formId: "MEOWTH_ALOLA" })),
    );
    expect(raidMergeKey(boss({ formId: "MEOWTH_GALARIAN", displayName: "Galarian Meowth" }))).not.toBe(
      raidMergeKey(boss({})),
    );
  });

  it("allows Shadow labels from different sources to merge", () => {
    expect(raidMergeKey(boss({ displayName: "Shadow Gastly", isShadow: true, speciesId: undefined, formId: undefined }))).toBe(
      raidMergeKey(boss({ displayName: "Gastly", isShadow: true, speciesId: "GASTLY", formId: undefined })),
    );
  });
});
