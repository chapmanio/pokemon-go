import { useEffect, useMemo, useState } from "react";
import type { Freshness, PokemonListResult } from "../../domain/pokemon";
import { fetchPokemonList } from "../../client/pokemon-api";
import { filterPokemon, formLabel } from "./pokedex";

const freshnessCopy: Record<Freshness, { label: string; detail: string }> = {
  fresh: { label: "Fresh data", detail: "The Pokédex was recently fetched and validated." },
  stale: { label: "Stale data", detail: "The Pokédex is usable, but may have changed since the last refresh." },
  degraded: { label: "Degraded data", detail: "Showing the last known-good Pokédex because the source refresh failed." },
  unavailable: { label: "Unavailable", detail: "No validated Pokédex data is currently available." },
};

function formatUpdatedAt(asOf?: string): string | undefined {
  if (!asOf) return undefined;
  const date = new Date(asOf);
  if (Number.isNaN(date.getTime())) return undefined;
  return `Updated ${date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}`;
}

function StatusPanel({ result }: { result: PokemonListResult }) {
  const status = freshnessCopy[result.freshness];
  const updatedAt = formatUpdatedAt(result.asOf);
  return (
    <section className={`status-panel status-panel--${result.freshness}`} aria-label="Pokédex data status">
      <div>
        <p className="status-panel__label">{status.label}</p>
        <p>{status.detail}</p>
      </div>
      {updatedAt && <p className="status-panel__time">{updatedAt}</p>}
    </section>
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
    <main className="app-shell">
      <header className="site-header">
        <a className="brand" href="/">PokéGO companion</a>
        <nav aria-label="Primary navigation">
          <a className="nav-link nav-link--active" href="/pokedex">Pokédex</a>
          <a className="nav-link" href="/raids">Raids</a>
        </nav>
      </header>

      <section className="page-heading">
        <p className="eyebrow">Reference</p>
        <h1>Pokémon GO Pokédex</h1>
        <p>Search Pokémon species and forms for Pokémon GO-specific stats, types, and move pools.</p>
      </section>

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
          <StatusPanel result={result} />
          {result.warnings.length > 0 && (
            <section className="warning-panel" aria-label="Pokédex warnings">
              <strong>Source notes</strong>
              <ul>{result.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>
            </section>
          )}
          <div className="pokedex-toolbar">
            <label className="search-label" htmlFor="pokemon-search">Search species or form</label>
            <input
              id="pokemon-search"
              className="search-input"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Try Pikachu, Alola, or 25"
            />
            <p>{entries.length.toLocaleString()} of {result.entries.length.toLocaleString()} entries</p>
          </div>
          {entries.length > 0 ? (
            <div className="pokedex-grid">
              {entries.map((entry) => (
                <article className="pokedex-card" key={entry.pokemonKey}>
                  <p className="pokedex-card__number">#{String(entry.pokemonId).padStart(4, "0")}</p>
                  <h2><a href={`/pokedex/${encodeURIComponent(entry.pokemonKey)}`}>{entry.displayName}</a></h2>
                  {formLabel(entry.formId) && <p className="pokedex-card__form">{formLabel(entry.formId)}</p>}
                  <p className="pokedex-card__types">{entry.types.join(" · ") || "Types not listed"}</p>
                </article>
              ))}
            </div>
          ) : (
            <p className="empty-state">No Pokémon or forms matched “{query}”.</p>
          )}
        </>
      )}
    </main>
  );
}
