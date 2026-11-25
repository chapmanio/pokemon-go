import type { MaxBattle, MaxBattleKind, MaxBattleProvenance } from "../domain/max-battle";
import type { RaidRange } from "../domain/raid";

type RecordValue = Record<string, unknown>;

function asRecord(value: unknown): RecordValue | undefined {
  return typeof value === "object" && value !== null ? value as RecordValue : undefined;
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

function asStringKeys(value: unknown): string[] {
  const record = asRecord(value);
  return record ? Object.keys(record) : asStringArray(value);
}

function asArrayRange(value: unknown): RaidRange | undefined {
  if (!Array.isArray(value) || value.length < 2) return undefined;
  const min = asNumber(value[0]);
  const max = asNumber(value[1]);
  return min !== undefined && max !== undefined && min <= max ? { min, max } : undefined;
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function entriesFromPayload(root: RecordValue): Array<{ key: string; record: RecordValue }> {
  const currentList = root.currentList;
  if (Array.isArray(currentList)) {
    return currentList.flatMap((value) => {
      const record = asRecord(value);
      return record ? [{ key: "", record }] : [];
    });
  }

  const source = asRecord(currentList) ?? root;
  return Object.entries(source).flatMap(([key, value]) => {
    if (!Array.isArray(value)) return [];
    return value.flatMap((item) => {
      const record = asRecord(item);
      return record ? [{ key, record }] : [];
    });
  });
}

function levelFor(key: string, record: RecordValue): number | undefined {
  const value = asNumber(record.level) ?? Number(asString(record.level));
  if (value && Number.isFinite(value)) return value;
  const match = /(?:tier|lvl)_(\d+)|(?:tier|lvl)(\d+)/i.exec(key);
  return match ? Number(match[1] ?? match[2]) : undefined;
}

function nameFor(record: RecordValue): string | undefined {
  const names = asRecord(record.names);
  return asString(names?.English) ?? asString(record.name);
}

function kindFor(level: number, displayName: string, formId?: string): MaxBattleKind {
  return level >= 6 || /gigantamax/i.test(`${displayName} ${formId ?? ""}`) ? "gigantamax" : "dynamax";
}

export function normalizeMaxBattles(
  payload: unknown,
  provenance: MaxBattleProvenance,
): MaxBattle[] {
  const root = asRecord(payload);
  if (!root) return [];

  return entriesFromPayload(root).flatMap(({ key, record }): MaxBattle[] => {
    const displayName = nameFor(record);
    const level = levelFor(key, record);
    if (!displayName || level === undefined) return [];

    const speciesId = asString(record.id) ?? asNumber(record.id);
    const formId = asString(record.form);
    const kind = kindFor(level, displayName, formId);
    const battleResult = asRecord(record.battleResult);
    const estimateResult = asRecord(battleResult?.normal) ?? asRecord(battleResult?.easy) ?? asRecord(battleResult?.hard);
    const id = [speciesId ?? slug(displayName), formId ?? kind, level].join(":");

    return [{
      maxBattleId: id,
      speciesId,
      formId,
      displayName,
      level,
      kind,
      shinyAvailable: asBoolean(record.shiny),
      types: asStringArray(record.types),
      catchCp: asArrayRange(record.cpRange),
      assetUrl: asString(asRecord(record.assets)?.image),
      battleEstimator: asNumber(estimateResult?.totalEstimator),
      counterTypes: asStringKeys(record.counter),
      counterSource: asString(record.counterSource) ?? (asStringKeys(record.counter).length > 0 ? "pokemon-go-api" : undefined),
      provenance,
      sourceReferences: [provenance],
    }];
  });
}
