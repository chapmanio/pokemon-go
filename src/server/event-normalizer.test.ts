import { describe, expect, it } from "vitest";
import fixture from "../../docs/fixtures/events/leekduck.json";
import { normalizeEventPayload } from "./event-normalizer";

const provenance = {
  source: "leekduck" as const,
  endpoint: "events.json",
  sourceUrl: "https://example.test/events.json",
  fetchedAt: "2026-11-23T12:00:00.000Z",
  contentHash: "fixture-hash",
};

describe("event source normalizer", () => {
  it("normalizes local and Unix event times without changing local wall-clock values", () => {
    const events = normalizeEventPayload(fixture, provenance);
    const local = events.find((event) => event.title === "Dynamax Trails");
    const instant = events.find((event) => event.title === "Great League");

    expect(local).toMatchObject({
      eventId: "leak-duck:event:https://leekduck.com/events/dynamax-trails-2026",
      startsAt: "2026-11-16T10:00:00",
      endsAt: "2026-11-23T20:00:00",
      isLocalTime: true,
      articleUrl: "https://leekduck.com/events/dynamax-trails-2026/",
    });
    expect(instant?.startsAt).toBe("2026-11-18T11:06:40.000Z");
    expect(instant?.isLocalTime).toBe(false);
  });

  it("preserves optional related sections instead of dropping unknown sections", () => {
    const [event] = normalizeEventPayload(fixture, provenance);

    expect(event.details.bonuses).toEqual(["2× Catch Stardust"]);
    expect(event.details.related).toEqual([
      {
        section: "features",
        name: "Grookey",
        assetUrl: "https://cdn.leekduck.com/pokemon/grookey.png",
        shinyAvailable: true,
      },
      { section: "raids", name: "Mega Charizard X", shinyAvailable: true },
      { section: "new-section", name: "Future content", shinyAvailable: false },
    ]);
  });

  it("rejects duplicate canonical article URLs", () => {
    expect(() => normalizeEventPayload({ Event: [fixture.Event[0], fixture.Event[0]] }, provenance))
      .toThrow("Duplicate event article URL");
  });
});
