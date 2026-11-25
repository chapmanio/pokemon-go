import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import type { MouseEvent } from "react";
import type {
  PokemonDetailResult,
  PokemonMoveReference,
  PokemonStatRating,
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
      <span className={`move-energy__bars move-energy__bars--${bars}`} aria-hidden="true">
        {Array.from({ length: bars }, (_, index) => <span className="move-energy__bar" key={index} />)}
      </span>
    </span>
  );
}

function MoveList({ title, moves, charged = false }: { title: string; moves: PokemonMoveReference[]; charged?: boolean }) {
  if (moves.length === 0) return null;
  const orderedMoves = [...moves].sort((left, right) => (
    (right.power ?? 0) * (charged ? energyBarCount(right.energyDelta) ?? 1 : 1)
    - (left.power ?? 0) * (charged ? energyBarCount(left.energyDelta) ?? 1 : 1)
  ) || left.name.localeCompare(right.name));

  return (
    <div className="move-group">
      <h3>{title}</h3>
      <ul>{orderedMoves.map((move) => (
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

function MatchupRows({ rows, empty }: { rows: Array<{ label: string; multiplier: number }>; empty: string }) {
  return (
    rows.length > 0 ? (
      <ul className="matchup-list">
        {rows.map((row) => (
          <li className="matchup-list__row" key={row.label}>
            <span>{row.label}</span>
            <span className="matchup-list__multiplier">×{formatMultiplier(row.multiplier)}</span>
          </li>
        ))}
      </ul>
    ) : <p className="detail-panel__note">{empty}</p>
  );
}

function statRatingLabel(rating: PokemonStatRating): string {
  return rating === "strong" ? "Strong relative to the current Pokédex"
    : rating === "weak" ? "Weak relative to the current Pokédex"
      : "Average relative to the current Pokédex";
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
            <div className="detail-form-select">
              <select
                id="pokemon-form"
                className="form-select"
                aria-label="Choose a form"
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
            </div>
          )}
          <section className="detail-panel">
            <h2>Base stats</h2>
            {detail.stats ? (
              <>
                <dl className="detail-grid stats-grid">
                  <div><dt>Attack</dt><dd className={`stat-value stat-value--${detail.statRatings?.attack ?? "average"}`} title={statRatingLabel(detail.statRatings?.attack ?? "average")}>{detail.stats.attack}</dd></div>
                  <div><dt>Defense</dt><dd className={`stat-value stat-value--${detail.statRatings?.defense ?? "average"}`} title={statRatingLabel(detail.statRatings?.defense ?? "average")}>{detail.stats.defense}</dd></div>
                  <div><dt>Stamina</dt><dd className={`stat-value stat-value--${detail.statRatings?.stamina ?? "average"}`} title={statRatingLabel(detail.statRatings?.stamina ?? "average")}>{detail.stats.stamina}</dd></div>
                </dl>
              </>
            ) : <p className="detail-panel__note">Stats are not available for this form.</p>}
          </section>
          <section className="detail-panel">
            <h2>Battle</h2>
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
              {battleTab === "strong" && (
                <MatchupRows
                  rows={detail.battle.effectiveAgainst.map((matchup: PokemonTypeEffectiveness) => ({ label: matchup.defenderType, multiplier: matchup.multiplier }))}
                  empty="No strong matchups are available from the listed move types."
                />
              )}
              {battleTab === "weak" && (
                <MatchupRows
                  rows={detail.battle.weaknesses.map((matchup: PokemonTypeMatchup) => ({ label: matchup.attackType, multiplier: matchup.multiplier }))}
                  empty="Weakness data is not available for this form."
                />
              )}
              {battleTab === "resistant" && (
                <MatchupRows
                  rows={detail.battle.resistances.map((matchup: PokemonTypeMatchup) => ({ label: matchup.attackType, multiplier: matchup.multiplier }))}
                  empty="No resistances are listed for this form."
                />
              )}
            </div>
          </section>
          <section className="detail-panel">
            <h2>Moveset</h2>
            {detail.battle.moveDetails.fast.length + detail.battle.moveDetails.charged.length + detail.battle.moveDetails.eliteFast.length + detail.battle.moveDetails.eliteCharged.length > 0 ? (
              <div className="move-groups">
                <MoveList title="Fast" moves={detail.battle.moveDetails.fast} />
                <MoveList title="Charged" moves={detail.battle.moveDetails.charged} charged />
                <MoveList title="Elite fast" moves={detail.battle.moveDetails.eliteFast} />
                <MoveList title="Elite charged" moves={detail.battle.moveDetails.eliteCharged} charged />
              </div>
            ) : <p className="detail-panel__note">Move pools are not available for this form.</p>}
          </section>
        </>
      )}
    </AppShell>
  );
}
