import { useEffect, useState } from "react";
import type { RocketMemberDetailResult } from "../../domain/rocket";
import { fetchRocketMember } from "../../client/rocket-api";
import { formatTheme } from "./rocket";

export default function RocketDetailPage({ memberId }: { memberId: string }) {
  const [result, setResult] = useState<RocketMemberDetailResult>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    const controller = new AbortController();
    setError(undefined);
    fetchRocketMember(memberId, controller.signal)
      .then(setResult)
      .catch((cause: unknown) => {
        if (cause instanceof DOMException && cause.name === "AbortError") return;
        setError(cause instanceof Error ? cause.message : "Unable to load this Rocket lineup");
      });
    return () => controller.abort();
  }, [memberId]);

  return (
    <main className="app-shell">
      <header className="site-header"><a className="brand" href="/">PokéGO companion</a><nav aria-label="Primary navigation"><a className="nav-link" href="/pokedex">Pokédex</a><a className="nav-link" href="/raids">Raids</a><a className="nav-link" href="/events">Events</a><a className="nav-link nav-link--active" href="/rocket">Rocket</a></nav></header>
      <p className="back-link"><a href="/rocket">← Back to Rocket lineups</a></p>
      {error && <section className="error-panel" role="alert"><strong>We couldn’t load this lineup.</strong><p>{error}</p><p><a href="/rocket">Return to Rocket lineups</a></p></section>}
      {!result && !error && <p className="loading-state">Loading lineup…</p>}
      {result && <RocketDetails result={result} />}
    </main>
  );
}

function RocketDetails({ result }: { result: RocketMemberDetailResult }) {
  return <>
    <section className="page-heading rocket-detail__heading"><p className="eyebrow">{result.kind} · {formatTheme(result)}</p><h1>{result.displayName}</h1><p>{result.guidance}</p></section>
    {result.warnings.length > 0 && <section className="warning-panel" aria-label="Rocket warnings"><ul>{result.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul></section>}
    {result.counterTypes.length > 0 && <section className="rocket-detail__section"><h2>Recommended attack types</h2><p>{result.counterTypes.join(" · ")}</p><p className="muted-note">These are generic type suggestions based on the lineup theme, not a guaranteed answer for every possible slot.</p>{result.counterSuggestions.length > 0 && <div className="counter-suggestion-grid">{result.counterSuggestions.map((suggestion) => <article className="counter-suggestion" key={suggestion.pokemonKey}>{suggestion.assetUrl && <img className="counter-suggestion__image" src={suggestion.assetUrl} alt="" loading="lazy" />}<div><h3><a href={`/pokedex/${encodeURIComponent(suggestion.pokemonKey)}`}>{suggestion.displayName}</a></h3><p className="counter-suggestion__types">{suggestion.types.join(" · ")}</p><p className="counter-suggestion__moves">{suggestion.matchingMoves.join(", ")}</p></div></article>)}</div>}</section>}
    <section className="rocket-detail__section"><h2>Possible lineup</h2><div className="rocket-slots">{result.lineup.map((slot) => <article className="rocket-slot" key={slot.slot}><div className="rocket-slot__heading"><h3>Slot {slot.slot}</h3>{slot.isEncounter && <span>Possible encounter</span>}</div><div className="rocket-slot__pokemon">{slot.pokemons.map((pokemon) => <div className="rocket-pokemon" key={pokemon.name}>{pokemon.assetUrl && <img src={pokemon.assetUrl} alt="" loading="lazy" />}<div><strong>{pokemon.name}</strong>{pokemon.shinyAvailable !== undefined && <small>{pokemon.shinyAvailable ? "Shiny possible" : "Shiny not listed"}</small>}</div></div>)}</div></article>)}</div></section>
  </>;
}
