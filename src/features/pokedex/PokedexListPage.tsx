import { useEffect, useMemo, useState } from "react";
import { ArrowUp, RefreshCw } from "lucide-react";
import type { PokemonListResult } from "../../domain/pokemon";
import { fetchPokemonList } from "../../client/pokemon-api";
import { filterPokemon } from "./pokedex";
import PokemonImage from "./PokemonImage";
import AppShell from "../shared/AppShell";

function formatUpdatedAt(asOf?: string): string | undefined {
  if (!asOf) return undefined;
  const date = new Date(asOf);
  if (Number.isNaN(date.getTime())) return undefined;
  return `Updated ${date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}`;
}

function StatusPanel({ result }: { result: PokemonListResult }) {
  const updatedAt = formatUpdatedAt(result.asOf);
  if (!updatedAt) return null;

  return (
    <section className={`status-panel pokedex-status-panel status-panel--${result.freshness}`} aria-label="Pokédex data status">
      <p className="status-panel__time">
        <RefreshCw aria-hidden="true" size={14} strokeWidth={2.5} />
        {updatedAt}
      </p>
    </section>
  );
}

function ScrollToTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const updateVisibility = () => setVisible(window.scrollY > window.innerHeight * 2);
    updateVisibility();
    window.addEventListener("scroll", updateVisibility, { passive: true });
    return () => window.removeEventListener("scroll", updateVisibility);
  }, []);

  if (!visible) return null;

  return (
    <button
      className="scroll-top-button"
      type="button"
      aria-label="Scroll back to the top"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
    >
      <ArrowUp aria-hidden="true" size={20} strokeWidth={2.5} />
    </button>
  );
}

export default function PokedexListPage() {
  const [result, setResult] = useState<PokemonListResult>();
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string>();
  const [reloadKey, setReloadKey] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(undefined);
    fetchPokemonList(controller.signal)
      .then(setResult)
      .catch((cause: unknown) => {
        if (cause instanceof DOMException && cause.name === "AbortError") return;
        setError(cause instanceof Error ? cause.message : "Unable to load the Pokédex");
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [reloadKey]);

  const entries = useMemo(() => filterPokemon(result?.entries ?? [], query), [result?.entries, query]);

  return (
    <AppShell activeSection="pokedex">
      {loading && !result && <p className="loading-state">Loading the Pokédex…</p>}

      {error && (
        <section className="error-panel" role="alert">
          <strong>We couldn’t load the Pokédex.</strong>
          <p>{error}</p>
          <button type="button" onClick={() => setReloadKey((key) => key + 1)}>Try again</button>
        </section>
      )}

      {result && (
        <>
          <div className="pokedex-toolbar">
            <label className="search-label" htmlFor="pokemon-search">Search Pokémon, form, or number</label>
            <input
              id="pokemon-search"
              className="search-input"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Try Pikachu, Alola, or 25"
            />
          </div>
          <StatusPanel result={result} />
          {result.warnings.length > 0 && (
            <section className="warning-panel" aria-label="Pokédex warnings">
              <strong>Source notes</strong>
              <ul>{result.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>
            </section>
          )}
          {entries.length > 0 ? (
            <div className="pokedex-grid">
              {entries.map((entry) => (
                <article className="pokedex-card" key={entry.pokemonId}>
                  <a className="pokedex-card__link" href={`/pokedex/${encodeURIComponent(entry.pokemonKey)}`}>
                    <PokemonImage className="pokedex-card__image" src={entry.assetUrl} alt={`${entry.displayName} icon`} />
                    <div className="pokedex-card__content">
                      <p className="pokedex-card__number">#{String(entry.pokemonId).padStart(4, "0")}</p>
                      <div className="pokedex-card__details">
                        <h2>{entry.displayName}</h2>
                        <p className="pokedex-card__types">{entry.types.join(" · ") || "Types not listed"}</p>
                      </div>
                    </div>
                  </a>
                </article>
              ))}
            </div>
          ) : (
            <p className="empty-state">No Pokémon or forms matched “{query}”.</p>
          )}
        </>
      )}
      <ScrollToTopButton />
    </AppShell>
  );
}
