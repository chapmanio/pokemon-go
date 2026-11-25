import { describe, expect, it } from "vitest";
import { createMaxBattleService } from "./max-battle-service";
import { createFixtureMaxBattleAdapter } from "./max-battle-source";
import { createMemoryMaxBattleSnapshotStore } from "./max-battle-snapshot-store";

describe("Max Battle service", () => {
  it("treats an empty current list as valid fresh data", async () => {
    const result = await createMaxBattleService({
      store: createMemoryMaxBattleSnapshotStore(),
      adapters: [createFixtureMaxBattleAdapter({ currentList: [] })],
      now: () => new Date("2026-11-25T12:00:00.000Z"),
    }).getMaxBattles();

    expect(result.battles).toEqual([]);
    expect(result.freshness).toBe("fresh");
    expect(result.warnings).toEqual([]);
  });
});
