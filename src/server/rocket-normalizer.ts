import type {
  RocketLineupSlot,
  RocketMember,
  RocketMemberKind,
  RocketPokemonOption,
  RocketProvenance,
} from "../domain/rocket";

type RecordValue = Record<string, unknown>;

function asRecord(value: unknown): RecordValue | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as RecordValue
    : undefined;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function memberKind(name: string): RocketMemberKind {
  if (name === "Giovanni") return "giovanni";
  if (["Arlo", "Cliff", "Sierra"].includes(name)) return "leader";
  if (name.includes("Grunt")) return "grunt";
  return "unknown";
}

const counterTypesByTheme: Record<string, string[]> = {
  bug: ["Fire", "Flying", "Rock"],
  dark: ["Fighting", "Bug", "Fairy"],
  dragon: ["Ice", "Dragon", "Fairy"],
  electric: ["Ground"],
  fairy: ["Poison", "Steel"],
  fighting: ["Flying", "Psychic", "Fairy"],
  fire: ["Water", "Ground", "Rock"],
  flying: ["Electric", "Ice", "Rock"],
  ghost: ["Dark", "Ghost"],
  grass: ["Fire", "Ice", "Poison", "Flying", "Bug"],
  ground: ["Water", "Grass", "Ice"],
  ice: ["Fire", "Fighting", "Rock", "Steel"],
  normal: ["Fighting"],
  poison: ["Ground", "Psychic"],
  psychic: ["Bug", "Ghost", "Dark"],
  rock: ["Water", "Grass", "Fighting", "Ground", "Steel"],
  steel: ["Fire", "Fighting", "Ground"],
  water: ["Electric", "Grass"],
};

function themeType(name: string): string | undefined {
  const match = name.match(/^([A-Za-z]+)-type /i);
  return match?.[1].toLowerCase();
}

function guidanceFor(kind: RocketMemberKind, theme: string | undefined, counterTypes: string[]): string {
  if (theme && counterTypes.length > 0) {
    return `This ${theme}-type lineup can include different Pokémon in each slot. Prefer Pokémon with ${counterTypes.join(", ")} attacks, then adjust after seeing the revealed lineup.`;
  }
  if (kind === "giovanni") {
    return "Giovanni's lineup can change by encounter. Use the revealed Pokémon's type weaknesses and adjust between battles.";
  }
  return "Leader lineups can change by encounter. Check each revealed Pokémon's type weaknesses and adjust your counters between battles.";
}

function normalizePokemon(value: unknown): RocketPokemonOption | undefined {
  const record = asRecord(value);
  const name = asString(record?.name);
  if (!name) return undefined;
  const pokemon: RocketPokemonOption = { name };
  const assetUrl = asString(record?.asset_url);
  if (assetUrl && /^https?:\/\//.test(assetUrl)) pokemon.assetUrl = assetUrl;
  if (typeof record?.shiny_available !== "boolean") return undefined;
  pokemon.shinyAvailable = record.shiny_available;
  return pokemon;
}

function normalizeSlot(value: unknown): RocketLineupSlot | undefined {
  const record = asRecord(value);
  const slot = typeof record?.slot === "number" && Number.isInteger(record.slot) && record.slot >= 1 && record.slot <= 3
    ? record.slot
    : undefined;
  if (slot === undefined || typeof record?.is_encounter !== "boolean" || !Array.isArray(record?.pokemons)) return undefined;
  const pokemons = record.pokemons.flatMap((pokemon) => {
    const normalized = normalizePokemon(pokemon);
    return normalized ? [normalized] : [];
  });
  if (pokemons.length === 0) return undefined;
  return {
    slot,
    isEncounter: record.is_encounter,
    pokemons,
  };
}

export function normalizeRocketPayload(payload: unknown, provenance: RocketProvenance): RocketMember[] {
  const categories = asRecord(payload);
  if (!categories) throw new Error("Rocket response was not an object");
  const members: RocketMember[] = [];

  for (const [displayName, rawLineup] of Object.entries(categories)) {
    if (!Array.isArray(rawLineup)) continue;
    const lineup = rawLineup.flatMap((slot) => {
      const normalized = normalizeSlot(slot);
      return normalized ? [normalized] : [];
    }).sort((left, right) => left.slot - right.slot);
    if (lineup.length === 0) continue;
    if (lineup.length !== rawLineup.length || new Set(lineup.map((slot) => slot.slot)).size !== lineup.length) {
      throw new Error(`Invalid Rocket lineup for ${displayName}`);
    }

    const kind = memberKind(displayName);
    const theme = themeType(displayName);
    const counterTypes = theme ? (counterTypesByTheme[theme] ?? []) : [];
    members.push({
      memberId: `leek-duck:rocket:${slug(displayName)}`,
      displayName,
      kind,
      themeType: theme,
      lineup,
      counterTypes,
      guidance: guidanceFor(kind, theme, counterTypes),
      provenance,
    });
  }

  return members;
}

export { counterTypesByTheme };
