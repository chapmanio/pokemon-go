import { describe, expect, it } from "vitest";
import { pokemonIconUrl } from "./pokemon-assets";

describe("Pokémon asset URLs", () => {
  it("builds base and form icon URLs using the community asset convention", () => {
    expect(pokemonIconUrl(1, "Normal")).toBe("https://raw.githubusercontent.com/pokemon-go-api/assets/main/Pokemon/pm1.icon.png");
    expect(pokemonIconUrl(1, "Fall_2019")).toBe("https://raw.githubusercontent.com/pokemon-go-api/assets/main/Pokemon/pm1.fFALL_2019.icon.png");
  });
});
