import { describe, expect, it } from "vitest";
import fixture from "../../docs/fixtures/rocket/rocket_lineups.json";
import { createRocketService } from "./rocket-service";
import { createFixtureRocketAdapter } from "./rocket-source";
import { createMemoryRocketSnapshotStore } from "./rocket-snapshot-store";

describe("Rocket service", () => {
  it("uses manifest metadata and marks old source content stale", async () => {
    const service = createRocketService({
      store: createMemoryRocketSnapshotStore(),
      adapters: [createFixtureRocketAdapter(fixture, {
        fetch: async () => ({
          payload: fixture,
          contentHash: "rocket-hash",
          sourceUpdatedAt: "2026-10-12T17:30:07Z",
        }),
      })],
      now: () => new Date("2026-11-23T12:00:00.000Z"),
    });

    const result = await service.getRocket();

    expect(result.members).toHaveLength(2);
    expect(result.freshness).toBe("stale");
    expect(result.members[0].provenance).toMatchObject({ contentHash: "rocket-hash" });
  });

  it("retains last-known-good data after a refresh failure", async () => {
    let shouldFail = false;
    const adapter = createFixtureRocketAdapter(fixture, {
      fetch: async () => {
        if (shouldFail) throw new Error("source unavailable");
        return { payload: fixture, contentHash: "rocket-hash", sourceUpdatedAt: "2026-11-23T06:00:00Z" };
      },
    });
    const service = createRocketService({
      store: createMemoryRocketSnapshotStore(),
      adapters: [adapter],
      now: () => new Date("2026-11-23T12:00:00.000Z"),
    });

    const first = await service.getRocket();
    shouldFail = true;
    const second = await service.getRocket({ forceRefresh: true });

    expect(second.members).toEqual(first.members);
    expect(second.freshness).toBe("degraded");
  });
});
