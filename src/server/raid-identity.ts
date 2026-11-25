import type { PokemonListEntry } from "../domain/pokemon";
import type { RaidBoss } from "../domain/raid";

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function speciesToken(encounter: Pick<RaidBoss, "speciesId">): string | undefined {
  return typeof encounter.speciesId === "string" ? slug(encounter.speciesId) : undefined;
}

function inferFormFromName(displayName: string): string {
  const name = slug(displayName);
  if (name.startsWith("alolan-")) return "alola";
  if (name.startsWith("galarian-")) return "galarian";
  if (name.startsWith("hisuian-")) return "hisuian";
  if (name.startsWith("paldean-")) return "paldea";
  if (name.startsWith("mega-")) {
    const suffix = name.endsWith("-x") ? "x" : name.endsWith("-y") ? "y" : "";
    return suffix ? `mega-${suffix}` : "mega";
  }
  if (name.includes("-origin")) return "origin";
  if (name.includes("-therian")) return "therian";
  if (name.includes("-incarnate")) return "incarnate";
  if (name.endsWith("-zen")) return "zen";
  return "normal";
}

export function canonicalRaidFormId(encounter: Pick<RaidBoss, "speciesId" | "formId" | "displayName">): string {
  const rawForm = slug(encounter.formId ?? "");
  const sourceSpecies = speciesToken(encounter);
  if (!rawForm || rawForm === "normal" || rawForm === slug(encounter.displayName) || rawForm === sourceSpecies) {
    return inferFormFromName(encounter.displayName);
  }

  if (sourceSpecies && rawForm.startsWith(`${sourceSpecies}-`)) {
    return rawForm.slice(sourceSpecies.length + 1) || "normal";
  }

  return rawForm;
}

export function raidMergeKey(boss: RaidBoss): string {
  const displayIdentity = slug(boss.displayName)
    .replace(/^(alolan|galarian|hisuian|paldean)-/, "")
    .replace(/^shadow-/, "")
    .replace(/^mega-/, "")
    .replace(/-(origin|therian|incarnate|zen)(-forme)?(-[xy])?$/, "");
  return `${displayIdentity}:${canonicalRaidFormId(boss)}:${boss.tier}:${boss.isShadow ? "shadow" : "normal"}`;
}

function matchesSpecies(
  encounter: Pick<RaidBoss, "speciesId" | "displayName">,
  entry: PokemonListEntry,
): boolean {
  if (typeof encounter.speciesId === "number") return encounter.speciesId === entry.pokemonId;
  const sourceSpecies = typeof encounter.speciesId === "string" ? slug(encounter.speciesId) : undefined;
  if (sourceSpecies && sourceSpecies === slug(entry.displayName)) return true;

  const displayName = slug(encounter.displayName).replace(/^(alolan|galarian|hisuian|paldean|shadow|mega)-/, "");
  return displayName === slug(entry.displayName);
}

export function resolvePokedexKey(
  encounter: Pick<RaidBoss, "speciesId" | "formId" | "displayName">,
  entries: PokemonListEntry[],
): string | undefined {
  const entry = entries.find((candidate) => matchesSpecies(encounter, candidate));
  if (!entry) return undefined;

  const form = canonicalRaidFormId(encounter);
  if (form === "normal") return entry.pokemonKey;

  const formId = entry.formIds.find((candidate) => slug(candidate) === form);
  return formId ? `${entry.pokemonId}:${slug(formId)}` : entry.pokemonKey;
}

export function resolveRaidPokedexKey(boss: RaidBoss, entries: PokemonListEntry[]): string | undefined {
  return resolvePokedexKey(boss, entries);
}
