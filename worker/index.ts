import {
  createRuntimeEventService,
  createRuntimeEggService,
  createRuntimePokemonService,
  createRuntimeRaidService,
} from "../src/server/runtime-service";
import { resolveRaidPokedexKey } from "../src/server/raid-identity";

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
    const [raids, pokemon, events, eggs] = await Promise.all([
      createRuntimeRaidService(environment).getRaids(),
      createRuntimePokemonService(environment).getPokedex(),
      createRuntimeEventService(environment).getEvents(),
      createRuntimeEggService(environment).getEggs(),
    ]);
    const values = [raids.freshness, pokemon.freshness, events.freshness, eggs.freshness];
    const status = values.includes("unavailable") ? "unavailable" : values.includes("degraded") ? "degraded" : values.includes("stale") ? "stale" : "ok";
    return jsonResponse({
      status,
      service: "pokemon-go",
      datasets: {
        raids: { freshness: raids.freshness, asOf: raids.asOf, sources: raids.sources, warnings: raids.warnings },
        pokemon: { freshness: pokemon.freshness, asOf: pokemon.asOf, warnings: pokemon.warnings },
        events: { freshness: events.freshness, asOf: events.asOf, sources: events.sources, warnings: events.warnings },
        eggs: { freshness: eggs.freshness, asOf: eggs.asOf, sources: eggs.sources, warnings: eggs.warnings },
      },
    }, status === "ok" ? 200 : 503);
  }

  if (url.pathname === "/api/v1/raids") {
    const result = await createRuntimeRaidService(environment).getRaids();
    return jsonResponse(result);
  }

  if (url.pathname === "/api/v1/pokemon") {
    const result = await createRuntimePokemonService(environment).getPokedex();
    return jsonResponse(result);
  }

  if (url.pathname === "/api/v1/events") {
    const result = await createRuntimeEventService(environment).getEvents();
    return jsonResponse(result);
  }

  if (url.pathname === "/api/v1/eggs") {
    const result = await createRuntimeEggService(environment).getEggs();
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

  const eventMatch = url.pathname.match(/^\/api\/v1\/events\/(.+)$/);
  if (eventMatch) {
    const eventId = decodeURIComponent(eventMatch[1]);
    const result = await createRuntimeEventService(environment).getEvent(eventId);

    if (!result) return jsonResponse({ error: "Event not found" }, 404);
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

    const pokemonService = createRuntimePokemonService(environment);
    const pokedex = await pokemonService.getPokedex();
    const counterResult = boss.counterTypes && boss.counterTypes.length > 0
      ? await pokemonService.getCounterCandidates(boss.counterTypes)
      : undefined;

    return jsonResponse({
      ...boss,
      pokedexKey: resolveRaidPokedexKey(boss, pokedex.entries),
      counterSuggestions: counterResult?.candidates ?? [],
      counterSuggestionsFreshness: counterResult?.freshness,
      freshness: result.freshness,
      warnings: [...result.warnings, ...(counterResult?.warnings ?? [])],
    });
  }

  return jsonResponse({ error: "Not found" }, 404);
}

export default {
  async fetch(request: Request, environment: Env): Promise<Response> {
    const url = new URL(request.url);

    try {
      if (url.pathname.startsWith("/api/")) {
        return await handleApiRequest(request, environment);
      }
    } catch (error) {
      console.error("Unhandled API request error", error);
      return jsonResponse({ error: "Internal server error" }, 500);
    }

    return environment.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
