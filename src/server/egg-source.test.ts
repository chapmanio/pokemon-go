import { describe, expect, it, vi } from "vitest";
import fixture from "../../docs/fixtures/eggs/egg_pool.json";
import { createHttpEggAdapter } from "./egg-source";

describe("egg source adapter", () => {
  it("uses the manifest hash and update timestamp", async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(fixture), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ files: { "egg_pool.json": {
        sha256: "manifest-hash",
        updated_at: "2026-11-16T02:45:51Z",
      } } }), { status: 200 }));

    const result = await createHttpEggAdapter(fetcher).fetchPayload();

    expect(result).toMatchObject({ contentHash: "manifest-hash", sourceUpdatedAt: "2026-11-16T02:45:51Z" });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
