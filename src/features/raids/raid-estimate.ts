import type { RaidBoss } from "../../domain/raid";

export type RaidEstimateMode = "generic" | "our-group";
export type RaidGroupStrength = "casual" | "capable" | "optimised";
export type RaidRemoteMix = "local" | "mixed" | "remote";

export interface RaidEstimateSettings {
  mode: RaidEstimateMode;
  trainerCount: number;
  strength: RaidGroupStrength;
  remoteMix: RaidRemoteMix;
  partyPlay: boolean;
}

export interface RaidEstimateResult {
  band?: "likely" | "borderline" | "unlikely";
  headline: string;
  detail: string;
}

export const defaultRaidEstimateSettings: RaidEstimateSettings = {
  mode: "generic",
  trainerCount: 2,
  strength: "capable",
  remoteMix: "local",
  partyPlay: false,
};

const strengthMultiplier: Record<RaidGroupStrength, number> = {
  casual: 0.75,
  capable: 1,
  optimised: 1.25,
};

const remoteMultiplier: Record<RaidRemoteMix, number> = {
  local: 1,
  mixed: 0.95,
  remote: 0.9,
};

function displayEstimate(value: number): string {
  return value.toFixed(1).replace(/\.0$/, "");
}

export function estimateRaid(boss: RaidBoss, settings: RaidEstimateSettings): RaidEstimateResult {
  const sourceEstimate = boss.battleEstimator;
  if (sourceEstimate === undefined) {
    return {
      headline: "No source estimate available",
      detail: "The current raid sources do not provide enough battle data for a useful trainer estimate.",
    };
  }

  if (settings.mode === "generic") {
    return {
      headline: `About ${displayEstimate(sourceEstimate)} capable trainers`,
      detail: "Source-based estimate using the available battle data.",
    };
  }

  const partyMultiplier = settings.partyPlay ? 1.15 : 1;
  const effectiveStrength = settings.trainerCount
    * strengthMultiplier[settings.strength]
    * remoteMultiplier[settings.remoteMix]
    * partyMultiplier;
  const ratio = effectiveStrength / sourceEstimate;
  const band = ratio >= 1.1 ? "likely" : ratio >= 0.85 ? "borderline" : "unlikely";
  const bandLabel = band[0].toUpperCase() + band.slice(1);

  return {
    band,
    headline: `${bandLabel} with this group setup`,
    detail: `About ${displayEstimate(sourceEstimate)} capable trainers are estimated; your setup contributes roughly ${displayEstimate(effectiveStrength)} capable-trainer equivalents.`,
  };
}
