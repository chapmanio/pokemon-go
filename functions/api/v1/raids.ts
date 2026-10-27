import { createRuntimeRaidService, type RuntimeEnvironment } from "../../../src/server/runtime-service";

export const onRequestGet = async ({ request, env }: { request: Request; env: RuntimeEnvironment }) => {
  const url = new URL(request.url);
  const result = await createRuntimeRaidService(env).getRaids({
    forceRefresh: url.searchParams.get("refresh") === "1",
  });

  return new Response(JSON.stringify(result), {
    headers: { "content-type": "application/json; charset=utf-8" },
  });
};
