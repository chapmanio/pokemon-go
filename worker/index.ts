import {
  createRuntimeEventService,
  createRuntimeEggService,
  createRuntimePokemonService,
  createRuntimeRaidService,
  createRuntimeMaxBattleService,
} from "../src/server/runtime-service";
import { resolvePokedexKey, resolveRaidPokedexKey } from "../src/server/raid-identity";
import { fetchPokebattlerEstimate } from "../src/server/pokebattler-estimate";

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
    const [raids, maxBattles, pokemon, events, eggs] = await Promise.all([
      createRuntimeRaidService(environment).getRaids(),
      createRuntimeMaxBattleService(environment).getMaxBattles(),
      createRuntimePokemonService(environment).getPokedex(),
      createRuntimeEventService(environment).getEvents(),
      createRuntimeEggService(environment).getEggs(),
    ]);
    const values = [raids.freshness, maxBattles.freshness, pokemon.freshness, events.freshness, eggs.freshness];
    const status = values.includes("unavailable") ? "unavailable" : values.includes("degraded") ? "degraded" : values.includes("stale") ? "stale" : "ok";
    return jsonResponse({
      status,
      service: "pokemon-go",
      datasets: {
        raids: { freshness: raids.freshness, asOf: raids.asOf, sources: raids.sources, warnings: raids.warnings },
        maxBattles: { freshness: maxBattles.freshness, asOf: maxBattles.asOf, sources: maxBattles.sources, warnings: maxBattles.warnings },
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

  if (url.pathname === "/api/v1/max-battles") {
    const result = await createRuntimeMaxBattleService(environment).getMaxBattles();
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

    const sourceEstimate = boss.battleEstimator === undefined
      ? await fetchPokebattlerEstimate(boss)
      : undefined;
    const hydratedBoss = sourceEstimate === undefined ? boss : { ...boss, battleEstimator: sourceEstimate };

    const pokemonService = createRuntimePokemonService(environment);
    const pokedex = await pokemonService.getPokedex();
    const counterResult = hydratedBoss.counterTypes && hydratedBoss.counterTypes.length > 0
      ? await pokemonService.getCounterCandidates(hydratedBoss.counterTypes)
      : undefined;

    return jsonResponse({
      ...hydratedBoss,
      pokedexKey: resolveRaidPokedexKey(hydratedBoss, pokedex.entries),
      counterSuggestions: counterResult?.candidates ?? [],
      counterSuggestionsFreshness: counterResult?.freshness,
      freshness: result.freshness,
      warnings: [...result.warnings, ...(counterResult?.warnings ?? [])],
    });
  }

  const maxBattleMatch = url.pathname.match(/^\/api\/v1\/max-battles\/([^/]+)$/);
  if (maxBattleMatch) {
    const maxBattleId = decodeURIComponent(maxBattleMatch[1]);
    const result = await createRuntimeMaxBattleService(environment).getMaxBattles();
    const battle = result.battles.find((candidate) => candidate.maxBattleId === maxBattleId);

    if (!battle) return jsonResponse({ error: "Max Battle not found", ...result }, 404);

    const pokemonService = createRuntimePokemonService(environment);
    const pokedex = await pokemonService.getPokedex();
    const pokedexKey = resolvePokedexKey(battle, pokedex.entries);
    const pokemonDetail = pokedexKey ? await pokemonService.getPokemon(pokedexKey) : undefined;
    const counterTypes = battle.counterTypes && battle.counterTypes.length > 0
      ? battle.counterTypes
      : pokemonDetail?.battle.weaknesses
        .filter((matchup) => matchup.multiplier > 1)
        .map((matchup) => matchup.attackType);
    const counterResult = counterTypes && counterTypes.length > 0
      ? await pokemonService.getCounterCandidates(counterTypes)
      : undefined;

    return jsonResponse({
      ...battle,
      pokedexKey,
      counterTypes,
      counterSource: battle.counterSource ?? (counterTypes ? "pogoapi" : undefined),
      counterSuggestions: counterResult?.candidates ?? [],
      counterSuggestionsFreshness: counterResult?.freshness,
      freshness: result.freshness,
      warnings: [
        ...result.warnings,
        ...(counterResult?.warnings ?? []),
        ...(battle.battleEstimator === undefined
          ? ["The Max Battle source does not currently provide a machine-readable trainer estimate."]
          : []),
      ],
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
