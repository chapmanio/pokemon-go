import { createRuntimeRaidService, type RuntimeEnvironment } from "../../../../src/server/runtime-service";

export const onRequestGet = async ({
  env,
  params,
}: {
  env: RuntimeEnvironment;
  params: { raidBossId: string };
}) => {
  const raidBossId = params.raidBossId;
  const result = await createRuntimeRaidService(env).getRaids();
  const boss = result.bosses.find((candidate) => candidate.raidBossId === raidBossId);

  if (!boss) {
    return new Response(JSON.stringify({ error: "Raid boss not found", ...result }), {
      status: 404,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  }

  return new Response(JSON.stringify({ ...boss, freshness: result.freshness, warnings: result.warnings }), {
    headers: { "content-type": "application/json; charset=utf-8" },
  });
};
