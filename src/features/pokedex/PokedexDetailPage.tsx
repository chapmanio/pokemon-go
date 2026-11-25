import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import type { MouseEvent } from "react";
import type {
  PokemonDetailResult,
  PokemonMoveReference,
  PokemonTypeEffectiveness,
  PokemonTypeMatchup,
} from "../../domain/pokemon";
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

function energyBarCount(energyDelta?: number): number | undefined {
  if (energyDelta === undefined || energyDelta >= 0) return undefined;
  const energyCost = Math.abs(energyDelta);
  if (energyCost <= 45) return 3;
  if (energyCost <= 75) return 2;
  return 1;
}

function EnergyBars({ energyDelta }: { energyDelta?: number }) {
  const energyCost = energyDelta === undefined ? undefined : Math.abs(energyDelta);
  const bars = energyBarCount(energyDelta);
  if (energyCost === undefined || bars === undefined) return null;

  return (
    <span className="move-energy" aria-label={`Uses ${energyCost} energy`}>
      <span aria-hidden="true">×</span>
      <span className={`move-energy__bars move-energy__bars--${bars}`} aria-hidden="true">
        {Array.from({ length: bars }, (_, index) => <span className="move-energy__bar" key={index} />)}
      </span>
    </span>
  );
}

function MoveList({ title, moves, charged = false }: { title: string; moves: PokemonMoveReference[]; charged?: boolean }) {
  if (moves.length === 0) return null;
  return (
    <div className="move-group">
      <h3>{title}</h3>
      <ul>{moves.map((move) => (
        <li key={move.name}>
          <span className="move-info">
            <span className="move-name">{move.name}</span>
            {move.type && <span className="move-type">{move.type}</span>}
          </span>
          {(move.power !== undefined || (charged && move.energyDelta !== undefined)) && (
            <span className="move-meta">
              {move.power !== undefined && <span className="move-power">{move.power}</span>}
              {charged && <EnergyBars energyDelta={move.energyDelta} />}
            </span>
          )}
        </li>
      ))}</ul>
    </div>
  );
}

function formatMultiplier(multiplier: number): string {
  return multiplier.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

function MatchupList({ title, matchups, empty }: { title: string; matchups: PokemonTypeMatchup[]; empty: string }) {
  return (
    <div className="battle-matchups">
      <h3>{title}</h3>
      {matchups.length > 0 ? (
        <div className="type-pills" aria-label={title}>
          {matchups.map((matchup) => (
            <span className="type-pill" key={matchup.attackType}>
              {matchup.attackType} ×{formatMultiplier(matchup.multiplier)}
            </span>
          ))}
        </div>
      ) : <p className="detail-panel__note">{empty}</p>}
    </div>
  );
}

function EffectiveAgainstList({ matchups }: { matchups: PokemonTypeEffectiveness[] }) {
  return (
    <div className="battle-matchups">
      <h3>Effective against</h3>
      {matchups.length > 0 ? (
        <div className="type-pills" aria-label="Effective against">
          {matchups.map((matchup) => (
            <span className="type-pill" key={matchup.defenderType}>
              {matchup.defenderType} ×{formatMultiplier(matchup.multiplier)}
            </span>
          ))}
        </div>
      ) : <p className="detail-panel__note">No effective matchups are available from the listed move types.</p>}
    </div>
  );
}

function differenceLabel(difference: PokemonDetailResult["functionalDifference"]): string {
  return functionalDifferenceLabel(difference);
}

type BattleTab = "strong" | "weak" | "resistant";

export default function PokedexDetailPage({ pokemonKey }: { pokemonKey: string }) {
  const [detail, setDetail] = useState<PokemonDetailResult>();
  const [error, setError] = useState<string>();
  const [reloadKey, setReloadKey] = useState(0);
  const [battleTab, setBattleTab] = useState<BattleTab>("strong");

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
      <p className="back-link pokedex-back-link"><a href="/pokedex" onClick={handleBackToPokedex}>← Back to Pokédex</a></p>

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
                <p className="eyebrow">#{String(detail.pokemonId).padStart(4, "0")}</p>
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
            <h2>Base stats</h2>
            {detail.stats ? (
              <>
                <dl className="detail-grid">
                  <div><dt>Attack</dt><dd>{detail.stats.attack}</dd></div>
                  <div><dt>Defense</dt><dd>{detail.stats.defense}</dd></div>
                  <div><dt>Stamina</dt><dd>{detail.stats.stamina}</dd></div>
                </dl>
                <p className="detail-panel__note detail-panel__explanation">These are base battle stats used in Pokémon GO’s damage, CP, and HP calculations. They are not scores out of a fixed total, and the three stats use different scales.</p>
              </>
            ) : <p className="detail-panel__note">Stats are not available for this form.</p>}
          </section>
          <section className="detail-panel">
            <h2>Battle reference</h2>
            <p className="detail-panel__note detail-panel__explanation">Multipliers show damage from an attacking type: above 1× is super effective, below 1× is resisted. “Effective against” uses the types of this Pokémon’s listed moves.</p>
            <div className="battle-tabs" role="tablist" aria-label="Battle matchups">
              {([
                ["strong", "Strong vs"],
                ["weak", "Weak vs"],
                ["resistant", "Resistant to"],
              ] as const).map(([tab, label]) => (
                <button
                  className={`battle-tab${battleTab === tab ? " battle-tab--active" : ""}`}
                  key={tab}
                  type="button"
                  role="tab"
                  aria-selected={battleTab === tab}
                  onClick={() => setBattleTab(tab)}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="battle-tab-panel">
              {battleTab === "strong" && <EffectiveAgainstList matchups={detail.battle.effectiveAgainst} />}
              {battleTab === "weak" && (
                <MatchupList
                  title="Weaknesses"
                  matchups={detail.battle.weaknesses}
                  empty="Weakness data is not available for this form."
                />
              )}
              {battleTab === "resistant" && (
                <MatchupList
                  title="Resistances"
                  matchups={detail.battle.resistances}
                  empty="No resistances are listed for this form."
                />
              )}
            </div>
          </section>
          <section className="detail-panel">
            <h2>Moveset</h2>
            {detail.battle.moveDetails.fast.length + detail.battle.moveDetails.charged.length + detail.battle.moveDetails.eliteFast.length + detail.battle.moveDetails.eliteCharged.length > 0 ? (
              <div className="move-groups">
                <MoveList title="Fast moves" moves={detail.battle.moveDetails.fast} />
                <MoveList title="Charged moves" moves={detail.battle.moveDetails.charged} charged />
                <MoveList title="Elite fast moves" moves={detail.battle.moveDetails.eliteFast} />
                <MoveList title="Elite charged moves" moves={detail.battle.moveDetails.eliteCharged} charged />
              </div>
            ) : <p className="detail-panel__note">Move pools are not available for this form.</p>}
          </section>
        </>
      )}
    </AppShell>
  );
}
