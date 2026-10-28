import { useEffect, useState } from "react";
import type { Freshness, PokemonDetailResult } from "../../domain/pokemon";
import { fetchPokemonDetail } from "../../client/pokemon-api";
import { formLabel } from "./pokedex";

const freshnessCopy: Record<Freshness, { label: string; detail: string }> = {
  fresh: { label: "Fresh data", detail: "This Pokémon detail was recently fetched and validated." },
  stale: { label: "Stale data", detail: "This detail is usable, but may have changed since the last refresh." },
  degraded: { label: "Degraded data", detail: "Showing last known-good data because the source refresh failed." },
  unavailable: { label: "Unavailable", detail: "No validated detail is currently available." },
};

function DetailStatus({ detail }: { detail: PokemonDetailResult }) {
  const status = freshnessCopy[detail.freshness];
  const date = new Date(detail.provenance.fetchedAt);
  const fetchedAt = Number.isNaN(date.getTime())
    ? undefined
    : date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  return (
    <section className={`status-panel status-panel--${detail.freshness}`} aria-label="Pokédex data status">
      <div>
        <p className="status-panel__label">{status.label}</p>
        <p>{status.detail}</p>
      </div>
      {fetchedAt && <p className="status-panel__time">Fetched {fetchedAt}</p>}
    </section>
  );
}

function MoveList({ title, moves }: { title: string; moves: string[] }) {
  if (moves.length === 0) return null;
  return (
    <div className="move-group">
      <h3>{title}</h3>
      <ul>{moves.map((move) => <li key={move}>{move}</li>)}</ul>
    </div>
  );
}

export default function PokedexDetailPage({ pokemonKey }: { pokemonKey: string }) {
  const [detail, setDetail] = useState<PokemonDetailResult>();
  const [error, setError] = useState<string>();
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setDetail(undefined);
    setError(undefined);
    fetchPokemonDetail(pokemonKey, controller.signal)
      .then(setDetail)
      .catch((cause: unknown) => {
        if (cause instanceof DOMException && cause.name === "AbortError") return;
        setError(cause instanceof Error ? cause.message : "Unable to load Pokémon details");
      });
    return () => controller.abort();
  }, [pokemonKey, reloadKey]);

  return (
    <main className="app-shell">
      <header className="site-header">
        <a className="brand" href="/">PokéGO companion</a>
        <nav aria-label="Primary navigation">
          <a className="nav-link nav-link--active" href="/pokedex">Pokédex</a>
          <a className="nav-link" href="/raids">Raids</a>
        </nav>
      </header>

      <p className="back-link"><a href="/pokedex">← Back to Pokédex</a></p>

      {error && (
        <section className="error-panel" role="alert">
          <strong>We couldn’t load this Pokémon.</strong>
          <p>{error}</p>
          <button type="button" onClick={() => setReloadKey((key) => key + 1)}>Try again</button>
          <p><a href="/pokedex">Return to the Pokédex</a></p>
        </section>
      )}

      {!detail && !error && <p className="loading-state">Loading Pokémon details…</p>}

      {detail && (
        <>
          <section className="detail-heading">
            <p className="eyebrow">Pokédex entry #{detail.pokemonId}</p>
            <h1>{detail.displayName}</h1>
            {formLabel(detail.formId) && <p className="detail-heading__subheading">{formLabel(detail.formId)} form</p>}
            <div className="type-pills" aria-label="Pokémon types">
              {detail.types.map((type) => <span className="type-pill" key={type}>{type}</span>)}
            </div>
          </section>
          <DetailStatus detail={detail} />
          {detail.warnings.length > 0 && (
            <section className="warning-panel" aria-label="Pokédex warnings">
              <strong>Source notes</strong>
              <ul>{detail.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>
            </section>
          )}
          <section className="detail-panel">
            <h2>Overview</h2>
            {detail.stats ? (
              <dl className="detail-grid">
                <div><dt>Attack</dt><dd>{detail.stats.attack}</dd></div>
                <div><dt>Defense</dt><dd>{detail.stats.defense}</dd></div>
                <div><dt>Stamina</dt><dd>{detail.stats.stamina}</dd></div>
              </dl>
            ) : <p className="detail-panel__note">Stats are not available for this form.</p>}
          </section>
          <section className="detail-panel">
            <h2>Move pools</h2>
            {detail.moves && (detail.moves.fast.length + detail.moves.charged.length + detail.moves.eliteFast.length + detail.moves.eliteCharged.length > 0) ? (
              <div className="move-groups">
                <MoveList title="Fast moves" moves={detail.moves.fast} />
                <MoveList title="Charged moves" moves={detail.moves.charged} />
                <MoveList title="Elite fast moves" moves={detail.moves.eliteFast} />
                <MoveList title="Elite charged moves" moves={detail.moves.eliteCharged} />
              </div>
            ) : <p className="detail-panel__note">Move pools are not available for this form.</p>}
          </section>
          <section className="detail-panel detail-panel--placeholder">
            <h2>More about this Pokémon</h2>
            <p>Evolution, availability, CP, and battle guidance will be added as the shared Pokédex model grows.</p>
          </section>
        </>
      )}
    </main>
  );
}
