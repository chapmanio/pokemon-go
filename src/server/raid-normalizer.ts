import type { RaidBoss, RaidRange, RaidTier } from "../domain/raid";
import type { NormalizationProvenance } from "./source-adapter";

type RecordValue = Record<string, unknown>;

function asRecord(value: unknown): RecordValue | undefined {
  return typeof value === "object" && value !== null ? (value as RecordValue) : undefined;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function asBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function asRange(value: unknown): RaidRange | undefined {
  const record = asRecord(value);
  const min = asNumber(record?.min);
  const max = asNumber(record?.max);
  return min !== undefined && max !== undefined ? { min, max } : undefined;
}

function asArrayRange(value: unknown): RaidRange | undefined {
  if (!Array.isArray(value) || value.length < 2) return undefined;
  const min = asNumber(value[0]);
  const max = asNumber(value[1]);
  return min !== undefined && max !== undefined ? { min, max } : undefined;
}

function asValueRange(minValue: unknown, maxValue: unknown): RaidRange | undefined {
  const min = asNumber(minValue);
  const max = asNumber(maxValue);
  return min !== undefined && max !== undefined ? { min, max } : undefined;
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function raidBossId(
  speciesId: number | string | undefined,
  formId: string | undefined,
  displayName: string,
  tier: RaidTier,
  isShadow: boolean,
): string {
  const identity = speciesId === undefined ? slug(displayName) : String(speciesId).toLowerCase();
  return [identity, formId ? slug(formId) : "normal", tier, isShadow ? "shadow" : "normal"].join(":");
}

function withIdentity(
  values: Omit<RaidBoss, "raidBossId" | "provenance">,
  provenance: NormalizationProvenance,
): RaidBoss {
  return {
    ...values,
    raidBossId: raidBossId(values.speciesId, values.formId, values.displayName, values.tier, values.isShadow),
    provenance,
  };
}

function tierFromKey(key: string): RaidTier | undefined {
  if (key === "mega") return "mega";
  const match = /^\d+$/.exec(key.replace(/^lvl/, ""));
  return match ? Number(match[0]) : undefined;
}

export function normalizePoGoApiRaids(
  payload: unknown,
  provenance: NormalizationProvenance,
): RaidBoss[] {
  const root = asRecord(payload);
  const current = asRecord(root?.current);
  if (!current) return [];

  return Object.entries(current).flatMap(([tierKey, entries]) => {
    const tier = tierFromKey(tierKey);
    if (tier === undefined || !Array.isArray(entries)) return [];

    return entries.flatMap((entry): RaidBoss[] => {
      const record = asRecord(entry);
      const displayName = asString(record?.name);
      if (!displayName) return [];
      const speciesId = asNumber(record?.id);
      return [
        withIdentity(
          {
            speciesId,
            formId: asString(record?.form),
            displayName,
            tier,
            isShadow: false,
            shinyAvailable: asBoolean(record?.possible_shiny),
            types: asStringArray(record?.type),
            catchCp: asValueRange(record?.min_unboosted_cp, record?.max_unboosted_cp),
            boostedCatchCp: asValueRange(record?.min_boosted_cp, record?.max_boosted_cp),
            boostedWeather: asStringArray(record?.boosted_weather),
          },
          provenance,
        ),
      ];
    });
  });
}

function normalizeLeekDuckTier(category: string, record: RecordValue): RaidTier | undefined {
  const itemTier = asNumber(record.tier);
  if (itemTier !== undefined) return itemTier;
  const match = /^(\d+)-Star/.exec(category);
  if (match) return Number(match[1]);
  return category === "Mega Raids" ? "mega" : undefined;
}

export function normalizeLeekDuckRaids(
  payload: unknown,
  provenance: NormalizationProvenance,
): RaidBoss[] {
  const root = asRecord(payload);
  if (!root) return [];

  return Object.entries(root).flatMap(([category, entries]) => {
    if (!Array.isArray(entries)) return [];
    return entries.flatMap((entry): RaidBoss[] => {
      const record = asRecord(entry);
      const displayName = asString(record?.name);
      const tier = record ? normalizeLeekDuckTier(category, record) : undefined;
      if (!displayName || tier === undefined) return [];
      const isShadow = asBoolean(record?.is_shadow) ?? false;
      return [
        withIdentity(
          {
            displayName,
            tier,
            isShadow,
            shinyAvailable: asBoolean(record?.shiny_available),
            types: asStringArray(record?.types),
            catchCp: asRange(record?.cp_range),
            boostedCatchCp: asRange(record?.boosted_cp_range),
            assetUrl: asString(record?.asset_url),
          },
          provenance,
        ),
      ];
    });
  });
}

function pokemonGoApiTier(key: string, record: RecordValue): RaidTier | undefined {
  const level = asString(record.level);
  if (level === "mega" || key === "mega") return "mega";
  return tierFromKey(key);
}

function englishName(value: unknown): string | undefined {
  const names = asRecord(value);
  return asString(names?.English);
}

export function normalizePokemonGoApiRaids(
  payload: unknown,
  provenance: NormalizationProvenance,
): RaidBoss[] {
  const root = asRecord(payload);
  const currentList = asRecord(root?.currentList);
  if (!currentList) return [];

  return Object.entries(currentList).flatMap(([listKey, entries]) => {
    if (!Array.isArray(entries)) return [];
    const listIsShadow = listKey.startsWith("shadow_");

    return entries.flatMap((entry): RaidBoss[] => {
      const record = asRecord(entry);
      if (!record) return [];
      const tier = pokemonGoApiTier(listKey, record);
      const speciesId = asString(record.id);
      const displayName = englishName(record.names) ?? speciesId;
      if (tier === undefined || !speciesId || !displayName) return [];
      const battleResult = asRecord(record.battleResult);
      const estimateResult =
        asRecord(battleResult?.normal) ?? asRecord(battleResult?.easy) ?? asRecord(battleResult?.hard);

      return [
        withIdentity(
          {
            speciesId,
            formId: asString(record.form),
            displayName,
            tier,
            isShadow: listIsShadow,
            shinyAvailable: asBoolean(record.shiny),
            types: asStringArray(record.types),
            catchCp: asArrayRange(record.cpRange),
            boostedCatchCp: asArrayRange(record.cpRangeBoost),
            boostedWeather: asStringArray(record.weather),
            assetUrl: asString(asRecord(record.assets)?.image),
            battleEstimator: asNumber(estimateResult?.totalEstimator),
            counterSource: "pokemon-go-api",
          },
          provenance,
        ),
      ];
    });
  });
}
