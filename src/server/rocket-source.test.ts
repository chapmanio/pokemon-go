import { describe, expect, it, vi } from "vitest";
import fixture from "../../docs/fixtures/rocket/rocket_lineups.json";
import { createHttpRocketAdapter } from "./rocket-source";

describe("Rocket source adapter", () => {
  it("uses the published manifest hash and content update time", async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(fixture), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        files: {
          "rocket_lineups.json": {
            sha256: "manifest-hash",
            updated_at: "2026-10-12T17:30:07Z",
          },
        },
      }), { status: 200 }));

    const result = await createHttpRocketAdapter(fetcher).fetchPayload();

    expect(result).toMatchObject({
      payload: fixture,
      contentHash: "manifest-hash",
      sourceUpdatedAt: "2026-10-12T17:30:07Z",
    });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
