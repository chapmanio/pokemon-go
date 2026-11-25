import type { RaidBoss } from "../../domain/raid";

export type RaidPartyResult = "likely" | "unlikely" | "unknown";

export interface RaidEstimateResult {
  capableTrainersNeeded?: number;
  capableDetail: string;
  partyOfFour: {
    result: RaidPartyResult;
    headline: string;
    detail: string;
  };
}

const PARTY_SIZE = 4;
const PARTY_PLAY_MULTIPLIER = 1.15;
const PARTY_CAPABLE_EQUIVALENTS = PARTY_SIZE * PARTY_PLAY_MULTIPLIER;

export function estimateRaid(
  boss: Pick<RaidBoss, "battleEstimator">,
  options: { partyPlay?: boolean } = {},
): RaidEstimateResult {
  const sourceEstimate = boss.battleEstimator;
  if (sourceEstimate === undefined) {
    return {
      capableDetail: "The current raid sources do not provide a capable-trainer estimate.",
      partyOfFour: {
        result: "unknown",
        headline: "Unknown",
        detail: "We cannot assess a four-trainer party without a source estimate.",
      },
    };
  }

  const capableTrainersNeeded = Math.max(1, Math.ceil(sourceEstimate));
  const partyPlay = options.partyPlay ?? true;
  const partyCanWin = sourceEstimate <= (partyPlay ? PARTY_CAPABLE_EQUIVALENTS : PARTY_SIZE);

  return {
    capableTrainersNeeded,
    capableDetail: `Rounded up from the source estimate of ${sourceEstimate.toFixed(1)} capable-trainer equivalents.`,
    partyOfFour: {
      result: partyCanWin ? "likely" : "unlikely",
      headline: partyCanWin ? "Likely yes" : "Probably not",
      detail: partyCanWin
        ? partyPlay
          ? "Four capable trainers with Party Play should have enough estimated strength."
          : "Four capable players should have enough estimated strength."
        : partyPlay
          ? "Four capable trainers with Party Play are unlikely to have enough estimated strength."
          : "Four capable players are unlikely to have enough estimated strength.",
    },
  };
}
