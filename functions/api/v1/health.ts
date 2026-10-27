import type { RuntimeEnvironment } from "../../../src/server/runtime-service";

export const onRequestGet = async (_context: { env: RuntimeEnvironment }) =>
  new Response(JSON.stringify({ status: "ok", service: "pokemon-go-companion" }), {
    headers: { "content-type": "application/json; charset=utf-8" },
  });
