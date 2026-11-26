import type { PokemonListEntry } from "../domain/pokemon";
import type { RaidBoss } from "../domain/raid";

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function speciesToken(encounter: Pick<RaidBoss, "speciesId">): string | undefined {
  return typeof encounter.speciesId === "string" ? slug(encounter.speciesId) : undefined;
}

function normalizeFormToken(value: string): string {
  const normalized = slug(value)
    .replace(/-forme$/, "")
    .replace(/-form$/, "");
  const withoutEventPrefix = normalized.replace(/^gofest-\d{4}-/, "");

  const aliases: Record<string, string> = {
    normal: "normal",
    attack: "attack",
    defense: "defense",
    speed: "speed",
    sscarf: "sun-scarf",
    mscarf: "moon-scarf",
    stiara: "sun-crown",
    mtiara: "moon-crown",
    "sun-scarf": "sun-scarf",
    "moon-scarf": "moon-scarf",
    "sun-crown": "sun-crown",
    "moon-crown": "moon-crown",
  };

  return aliases[withoutEventPrefix] ?? withoutEventPrefix;
}

function inferFormFromName(displayName: string): string {
  const name = slug(displayName);
  if (name.startsWith("sun-crown-") || name.includes("-sun-crown-")) return "sun-crown";
  if (name.startsWith("moon-crown-") || name.includes("-moon-crown-")) return "moon-crown";
  if (name.includes("-wearing-a-sun-scarf")) return "sun-scarf";
  if (name.includes("-wearing-a-moon-scarf")) return "moon-scarf";
  if (name.endsWith("-attack") || name.endsWith("-attack-forme")) return "attack";
  if (name.endsWith("-defense") || name.endsWith("-defense-forme")) return "defense";
  if (name.endsWith("-speed") || name.endsWith("-speed-forme")) return "speed";
  if (name.endsWith("-normal") || name.endsWith("-normal-forme")) return "normal";
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

function displaySpeciesToken(displayName: string): string {
  let name = slug(displayName)
    .replace(/^shadow-/, "")
    .replace(/^(alolan|galarian|hisuian|paldean)-/, "")
    .replace(/^sun-crown-/, "")
    .replace(/^moon-crown-/, "")
    .replace(/-wearing-a-(sun|moon)-scarf$/, "");

  if (name.startsWith("mega-")) {
    name = name.slice("mega-".length).replace(/-[xy]$/, "");
  }

  return name
    .replace(/-(normal|attack|defense|speed|origin|therian|incarnate|zen)(-forme)?$/, "")
    .replace(/-forme$/, "");
}

export function canonicalRaidFormId(encounter: Pick<RaidBoss, "speciesId" | "formId" | "displayName">): string {
  const rawForm = slug(encounter.formId ?? "");
  const sourceSpecies = speciesToken(encounter);
  if (!rawForm || rawForm === "normal" || rawForm === slug(encounter.displayName) || rawForm === sourceSpecies) {
    return inferFormFromName(encounter.displayName);
  }

  if (sourceSpecies && rawForm.startsWith(`${sourceSpecies}-`)) {
    return normalizeFormToken(rawForm.slice(sourceSpecies.length + 1) || "normal");
  }

  return normalizeFormToken(rawForm);
}

export function raidMergeKey(boss: RaidBoss): string {
  const displayIdentity = speciesToken(boss) ?? displaySpeciesToken(boss.displayName);
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
