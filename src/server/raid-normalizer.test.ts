import { describe, expect, it } from "vitest";
import leekDuckFixture from "../../docs/fixtures/raid/leekduck.json";
import pokemonGoApiFixture from "../../docs/fixtures/raid/pokemon-go-api.json";
import pogoApiFixture from "../../docs/fixtures/raid/pogoapi.json";
import {
  normalizeLeekDuckRaids,
  normalizePokemonGoApiRaids,
  normalizePoGoApiRaids,
} from "./raid-normalizer";

const provenance = {
  source: "leekduck" as const,
  endpoint: "raid_bosses.json",
  sourceUrl: "https://example.test/raids.json",
  fetchedAt: "2026-10-27T12:00:00.000Z",
  contentHash: "fixture-hash",
};

describe("raid source normalizers", () => {
  it("normalizes PoGoAPI CP and weather fields", () => {
    const [deino] = normalizePoGoApiRaids(pogoApiFixture, provenance);

    expect(deino).toMatchObject({
      displayName: "Deino",
      speciesId: 633,
      tier: 1,
      types: ["Dark", "Dragon"],
      catchCp: { min: 560, max: 606 },
      boostedCatchCp: { min: 701, max: 758 },
      boostedWeather: ["Fog", "Windy"],
      isShadow: false,
    });
  });

  it("preserves Shadow identity from Leek Duck", () => {
    const raids = normalizeLeekDuckRaids(leekDuckFixture, provenance);
    const shadowGastly = raids.find((raid) => raid.displayName === "Shadow Gastly");

    expect(shadowGastly).toMatchObject({
      displayName: "Shadow Gastly",
      isShadow: true,
      tier: 1,
      types: ["Ghost", "Poison"],
    });
  });

  it("preserves form and precomputed estimates from pokemon-go-api", () => {
    const [megaCharizard] = normalizePokemonGoApiRaids(pokemonGoApiFixture, provenance);

    expect(megaCharizard).toMatchObject({
      displayName: "Mega Charizard X",
      speciesId: "CHARIZARD",
      formId: "CHARIZARD_MEGA_X",
      tier: "mega",
      battleEstimator: 1.8743833,
      counterTypes: ["Dragon", "Ground", "Rock"],
    });
  });
});
