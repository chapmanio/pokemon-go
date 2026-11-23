import { describe, expect, it, vi } from "vitest";
import fixture from "../../docs/fixtures/events/leekduck.json";
import { createHttpEventAdapter } from "./event-source";

describe("event source adapter", () => {
  it("uses the published manifest hash and update time", async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(fixture), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        files: {
          "events.json": {
            sha256: "manifest-hash",
            updated_at: "2026-11-23T06:53:56Z",
          },
        },
      }), { status: 200 }));

    const result = await createHttpEventAdapter(fetcher).fetchPayload();

    expect(result).toMatchObject({
      payload: fixture,
      contentHash: "manifest-hash",
      sourceUpdatedAt: "2026-11-23T06:53:56Z",
    });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
