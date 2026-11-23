import { describe, expect, it } from "vitest";
import fixture from "../../docs/fixtures/events/leekduck.json";
import { createEventService } from "./event-service";
import { createFixtureEventAdapter } from "./event-source";
import { createMemoryEventSnapshotStore } from "./event-snapshot-store";

describe("event service", () => {
  it("caches normalized events and uses the source hash for change tracking", async () => {
    const service = createEventService({
      store: createMemoryEventSnapshotStore(),
      adapters: [createFixtureEventAdapter(fixture, {
        fetch: async () => ({
          payload: fixture,
          contentHash: "events-hash",
          sourceUpdatedAt: "2026-11-23T06:53:56Z",
        }),
      })],
      now: () => new Date("2026-11-23T12:00:00.000Z"),
    });

    const result = await service.getEvents();

    expect(result.events).toHaveLength(3);
    expect(result.freshness).toBe("fresh");
    expect(result.sources).toEqual(["leekduck"]);
    expect(result.events[0].provenance).toMatchObject({
      contentHash: "events-hash",
      sourceUpdatedAt: "2026-11-23T06:53:56Z",
    });
  });

  it("retains last-known-good data after refresh failure", async () => {
    let shouldFail = false;
    const adapter = createFixtureEventAdapter(fixture, {
      fetch: async () => {
        if (shouldFail) throw new Error("source unavailable");
        return { payload: fixture, contentHash: "events-hash" };
      },
    });
    const service = createEventService({
      store: createMemoryEventSnapshotStore(),
      adapters: [adapter],
      now: () => new Date("2026-11-23T12:00:00.000Z"),
    });

    const first = await service.getEvents();
    shouldFail = true;
    const second = await service.getEvents({ forceRefresh: true });

    expect(second.events).toEqual(first.events);
    expect(second.freshness).toBe("degraded");
    expect(second.warnings).toEqual([
      "The event source could not be refreshed; showing the last known-good calendar.",
    ]);
  });
});
