import { describe, expect, it } from "vitest";
import leekDuckFixture from "../../docs/fixtures/raid/leekduck.json";
import pogoApiFixture from "../../docs/fixtures/raid/pogoapi.json";
import { createMemorySnapshotStore } from "./snapshot-store";
import { createFixtureAdapter } from "./source-adapter";
import { createRaidService } from "./raid-service";

describe("raid service", () => {
  it("serves a normalized roster and reports source disagreement", async () => {
    const service = createRaidService({
      store: createMemorySnapshotStore(),
      adapters: [
        createFixtureAdapter("pogoapi", "raid_bosses.json", pogoApiFixture),
        createFixtureAdapter("leekduck", "raid_bosses.json", leekDuckFixture),
      ],
      now: () => new Date("2026-10-27T12:00:00.000Z"),
    });

    const result = await service.getRaids();

    expect(result.bosses.length).toBeGreaterThan(0);
    expect(result.freshness).toBe("fresh");
    expect(result.warnings).toContain("Raid sources disagree");
    expect(result.sources).toEqual(["pogoapi", "leekduck"]);
  });

  it("retains last-known-good data after a refresh failure", async () => {
    let shouldFail = false;
    const adapter = createFixtureAdapter("leekduck", "raid_bosses.json", leekDuckFixture, {
      fetch: async () => {
        if (shouldFail) throw new Error("source unavailable");
        return leekDuckFixture;
      },
    });
    const store = createMemorySnapshotStore();
    const service = createRaidService({
      store,
      adapters: [adapter],
      now: () => new Date("2026-10-27T12:00:00.000Z"),
    });

    const first = await service.getRaids();
    shouldFail = true;
    const second = await service.getRaids({ forceRefresh: true });

    expect(first.bosses.length).toBeGreaterThan(0);
    expect(second.bosses).toEqual(first.bosses);
    expect(second.freshness).toBe("degraded");
  });

  it("does not publish an empty normalized response", async () => {
    let shouldReturnEmpty = false;
    const adapter = createFixtureAdapter("leekduck", "raid_bosses.json", leekDuckFixture, {
      fetch: async () => (shouldReturnEmpty ? {} : leekDuckFixture),
    });
    const service = createRaidService({
      store: createMemorySnapshotStore(),
      adapters: [adapter],
      now: () => new Date("2026-10-27T12:00:00.000Z"),
    });

    const first = await service.getRaids();
    shouldReturnEmpty = true;
    const second = await service.getRaids({ forceRefresh: true });

    expect(second.bosses).toEqual(first.bosses);
    expect(second.freshness).toBe("degraded");
  });
});
