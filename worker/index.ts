import { createRuntimePokemonService, createRuntimeRaidService } from "../src/server/runtime-service";

const jsonHeaders = { "content-type": "application/json; charset=utf-8" };

function jsonResponse(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: jsonHeaders,
  });
}

async function handleApiRequest(request: Request, environment: Env): Promise<Response> {
  const url = new URL(request.url);

  if (request.method !== "GET") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  if (url.pathname === "/api/v1/health") {
    return jsonResponse({ status: "ok", service: "pokemon-go" });
  }

  if (url.pathname === "/api/v1/raids") {
    const result = await createRuntimeRaidService(environment).getRaids({
      forceRefresh: url.searchParams.get("refresh") === "1",
    });
    return jsonResponse(result);
  }

  if (url.pathname === "/api/v1/pokemon") {
    const result = await createRuntimePokemonService(environment).getPokedex({
      forceRefresh: url.searchParams.get("refresh") === "1",
    });
    return jsonResponse(result);
  }

  const pokemonMatch = url.pathname.match(/^\/api\/v1\/pokemon\/([^/]+)$/);
  if (pokemonMatch) {
    const pokemonKey = decodeURIComponent(pokemonMatch[1]);
    const result = await createRuntimePokemonService(environment).getPokemon(pokemonKey);

    if (!result) {
      return jsonResponse({ error: "Pokémon not found" }, 404);
    }

    return jsonResponse(result);
  }

  const bossMatch = url.pathname.match(/^\/api\/v1\/raids\/([^/]+)$/);
  if (bossMatch) {
    const raidBossId = decodeURIComponent(bossMatch[1]);
    const result = await createRuntimeRaidService(environment).getRaids();
    const boss = result.bosses.find((candidate) => candidate.raidBossId === raidBossId);

    if (!boss) {
      return jsonResponse({ error: "Raid boss not found", ...result }, 404);
    }

    return jsonResponse({ ...boss, freshness: result.freshness, warnings: result.warnings });
  }

  return jsonResponse({ error: "Not found" }, 404);
}

export default {
  async fetch(request: Request, environment: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/api/")) {
      return handleApiRequest(request, environment);
    }

    return environment.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
