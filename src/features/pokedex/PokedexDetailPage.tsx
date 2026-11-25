import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import type { MouseEvent } from "react";
import type { PokemonDetailResult, PokemonMoveReference, PokemonTypeMatchup } from "../../domain/pokemon";
import { fetchPokemonDetail } from "../../client/pokemon-api";
import { formLabel, functionalDifferenceLabel } from "./pokedex";
import PokemonImage from "./PokemonImage";
import AppShell from "../shared/AppShell";

function DetailStatus({ detail }: { detail: PokemonDetailResult }) {
  const date = new Date(detail.provenance.fetchedAt);
  const fetchedAt = Number.isNaN(date.getTime())
    ? undefined
    : `Updated ${date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}`;
  if (!fetchedAt) return null;

  return (
    <section className={`status-panel status-panel--${detail.freshness}`} aria-label="Pokédex data status">
      <p className="status-panel__time">
        <RefreshCw aria-hidden="true" size={14} strokeWidth={2.5} />
        {fetchedAt}
      </p>
    </section>
  );
}

function MoveList({ title, moves }: { title: string; moves: PokemonMoveReference[] }) {
  if (moves.length === 0) return null;
  return (
    <div className="move-group">
      <h3>{title}</h3>
      <ul>{moves.map((move) => (
        <li key={move.name}>
          <span>{move.name}</span>
          {(move.type || move.power !== undefined || move.energyDelta !== undefined) && (
            <span className="move-meta">
              {[move.type, move.power !== undefined ? `Power ${move.power}` : undefined, move.energyDelta !== undefined ? `Energy ${move.energyDelta}` : undefined]
                .filter((value): value is string => value !== undefined)
                .join(" · ")}
            </span>
          )}
        </li>
      ))}</ul>
    </div>
  );
}

function MatchupList({ title, matchups, empty }: { title: string; matchups: PokemonTypeMatchup[]; empty: string }) {
  return (
    <div className="battle-matchups">
      <h3>{title}</h3>
      {matchups.length > 0 ? (
        <div className="type-pills" aria-label={title}>
          {matchups.map((matchup) => (
            <span className="type-pill" key={matchup.attackType}>
              {matchup.attackType} ×{matchup.multiplier.toFixed(2).replace(/0+$/, "").replace(/\.$/, "")}
            </span>
          ))}
        </div>
      ) : <p className="detail-panel__note">{empty}</p>}
    </div>
  );
}

function differenceLabel(difference: PokemonDetailResult["functionalDifference"]): string {
  return functionalDifferenceLabel(difference);
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

  function handleBackToPokedex(event: MouseEvent<HTMLAnchorElement>) {
    const referrer = document.referrer;
    const cameFromPokedex = referrer.startsWith(window.location.origin)
      && new URL(referrer).pathname.replace(/\/$/, "") === "/pokedex";
    if (cameFromPokedex) {
      event.preventDefault();
      window.history.back();
    }
  }

  return (
    <AppShell activeSection="pokedex">
      <p className="back-link"><a href="/pokedex" onClick={handleBackToPokedex}>← Back to Pokédex</a></p>

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
            <div className="detail-heading__identity">
              <PokemonImage className="detail-heading__image" src={detail.assetUrl} alt={`${detail.displayName} icon`} />
              <div>
                <p className="eyebrow">Pokédex entry #{detail.pokemonId}</p>
                <h1>{detail.displayName}</h1>
                {formLabel(detail.formId) && <p className="detail-heading__subheading">{formLabel(detail.formId)} form</p>}
                <div className="type-pills" aria-label="Pokémon types">
                  {detail.types.map((type) => <span className="type-pill" key={type}>{type}</span>)}
                </div>
              </div>
            </div>
          </section>
          <DetailStatus detail={detail} />
          {detail.warnings.length > 0 && (
            <section className="warning-panel" aria-label="Pokédex warnings">
              <strong>Source notes</strong>
              <ul>{detail.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>
            </section>
          )}
          {detail.forms.length > 1 && (
            <section className="detail-panel form-panel">
              <h2>Forms</h2>
              <label className="search-label" htmlFor="pokemon-form">Choose a form</label>
              <select
                id="pokemon-form"
                className="form-select"
                value={detail.pokemonKey}
                onChange={(event) => { window.location.href = `/pokedex/${encodeURIComponent(event.target.value)}`; }}
              >
                {detail.forms.map((form) => (
                  <option key={form.pokemonKey} value={form.pokemonKey}>
                    {form.formId.toLowerCase() === "normal" ? "Normal" : formLabel(form.formId)}
                    {form.formId.toLowerCase() === "normal"
                      ? " — default form"
                      : form.functionalDifference !== "none"
                        ? ` — ${differenceLabel(form.functionalDifference)}`
                        : " — equivalent battle data"}
                  </option>
                ))}
              </select>
              {detail.functionalDifference !== "none" && (
                <p className="detail-panel__note">This form has {differenceLabel(detail.functionalDifference).toLowerCase()} compared with the default form.</p>
              )}
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
            <h2>Battle reference</h2>
            <MatchupList
              title="Weaknesses"
              matchups={detail.battle.weaknesses}
              empty="Weakness data is not available for this form."
            />
            <MatchupList
              title="Resistances"
              matchups={detail.battle.resistances}
              empty="No resistances are listed for this form."
            />
          </section>
          <section className="detail-panel">
            <h2>Move pools</h2>
            {detail.battle.moveDetails.fast.length + detail.battle.moveDetails.charged.length + detail.battle.moveDetails.eliteFast.length + detail.battle.moveDetails.eliteCharged.length > 0 ? (
              <div className="move-groups">
                <MoveList title="Fast moves" moves={detail.battle.moveDetails.fast} />
                <MoveList title="Charged moves" moves={detail.battle.moveDetails.charged} />
                <MoveList title="Elite fast moves" moves={detail.battle.moveDetails.eliteFast} />
                <MoveList title="Elite charged moves" moves={detail.battle.moveDetails.eliteCharged} />
              </div>
            ) : <p className="detail-panel__note">Move pools are not available for this form.</p>}
          </section>
        </>
      )}
    </AppShell>
  );
}
