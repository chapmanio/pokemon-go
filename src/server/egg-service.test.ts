import { describe, expect, it } from "vitest";
import fixture from "../../docs/fixtures/eggs/egg_pool.json";
import { createEggService } from "./egg-service";
import { createFixtureEggAdapter } from "./egg-source";
import { createMemoryEggSnapshotStore } from "./egg-snapshot-store";

describe("egg service", () => {
  it("marks old manifest content stale while retaining the pools", async () => {
    const service = createEggService({
      store: createMemoryEggSnapshotStore(),
      adapters: [createFixtureEggAdapter(fixture, {
        fetch: async () => ({ payload: fixture, contentHash: "egg-hash", sourceUpdatedAt: "2026-11-16T02:45:51Z" }),
      })],
      now: () => new Date("2026-11-23T12:00:00.000Z"),
    });

    const result = await service.getEggs();

    expect(result.pools).toHaveLength(2);
    expect(result.freshness).toBe("stale");
  });

  it("retains last-known-good pools after refresh failure", async () => {
    let shouldFail = false;
    const adapter = createFixtureEggAdapter(fixture, {
      fetch: async () => {
        if (shouldFail) throw new Error("source unavailable");
        return { payload: fixture, contentHash: "egg-hash", sourceUpdatedAt: "2026-11-23T11:00:00Z" };
      },
    });
    const service = createEggService({
      store: createMemoryEggSnapshotStore(),
      adapters: [adapter],
      now: () => new Date("2026-11-23T12:00:00.000Z"),
    });

    const first = await service.getEggs();
    shouldFail = true;
    const second = await service.getEggs({ forceRefresh: true });

    expect(second.pools).toEqual(first.pools);
    expect(second.freshness).toBe("degraded");
  });
});
