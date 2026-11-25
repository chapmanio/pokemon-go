import type { PokemonCounterCandidate } from "../../domain/pokemon";
import { estimateRaid } from "../raids/raid-estimate";
import { groupCounterSuggestions, sourceLabel } from "../raids/raid-list";
import FallbackImage from "../shared/FallbackImage";

export interface BattleDetailLike {
  displayName: string;
  types: string[];
  pokedexKey?: string;
  counterTypes?: string[];
  counterSource?: string;
  counterSuggestions?: PokemonCounterCandidate[];
  battleEstimator?: number;
}

export function CounterGuidance({ detail }: { detail: BattleDetailLike }) {
  const suggestions = detail.counterSuggestions ?? [];
  const suggestionGroups = groupCounterSuggestions(suggestions);

  return (
    <section className="detail-panel">
      <h2>Counters</h2>
      {detail.counterTypes && detail.counterTypes.length > 0 ? (
        <>
          <p>Prioritise Pokémon using these attack types:</p>
          <div className="type-pills" aria-label="Recommended counter types">
            {detail.counterTypes.map((type) => <span className="type-pill" key={type}>{type}</span>)}
          </div>
          <p className="detail-panel__note">
            This is source-based type guidance from {detail.counterSource ? sourceLabel(detail.counterSource) : "the current battle data"}.
          </p>
          {suggestions.length > 0 ? (
            <>
              <p>Generic Pokémon examples that can use these attack types:</p>
              <div className="counter-suggestion-groups">
                {suggestionGroups.map((group) => (
                  <section className="counter-suggestion-group" key={group.key}>
                    <div className="counter-suggestion-group__heading">
                      <h3>{group.label}</h3>
                      <p>{group.detail}</p>
                    </div>
                    <div className="counter-suggestion-grid">
                      {group.suggestions.map((suggestion) => (
                        <article className="counter-suggestion" key={suggestion.pokemonKey}>
                          <FallbackImage className="counter-suggestion__image" src={suggestion.assetUrl} alt="" />
                          <div>
                            <h4>
                              <a href={`/pokedex/${encodeURIComponent(suggestion.pokemonKey)}`}>{suggestion.displayName}</a>
                            </h4>
                            {suggestion.formId.toLowerCase() !== "normal" && <p className="counter-suggestion__form">{suggestion.formId.replace(/_/g, " ")}</p>}
                            <p className="counter-suggestion__types">{suggestion.types.join(" · ") || "Type not listed"}</p>
                            <p className="counter-suggestion__moves">Moves: {suggestion.matchingMoves.join(", ")}</p>
                          </div>
                        </article>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
              <p className="detail-panel__note">These are generic examples, not recommendations based on anyone’s collection. The ordering is a cached-data match, not a battle simulation or exact ranking.</p>
            </>
          ) : (
            <p className="detail-panel__note">Matching Pokémon examples are not available from the current Pokédex snapshot.</p>
          )}
        </>
      ) : (
        <p className="detail-panel__note">Counter guidance is not available from the current battle sources.</p>
      )}
    </section>
  );
}

export function EstimatePanel({ detail, label = "Can 4 capable trainers beat it?", partyPlay = true }: { detail: BattleDetailLike; label?: string; partyPlay?: boolean }) {
  const estimate = estimateRaid(detail, { partyPlay });

  return (
    <section className="detail-panel">
      <h2>Estimate</h2>
      <div className="estimate-summary">
        <div className="estimate-card">
          <p className="estimate-card__label">Capable trainers needed</p>
          <strong className="estimate-card__value">{estimate.capableTrainersNeeded ?? "Unknown"}</strong>
          <p>{estimate.capableDetail}</p>
        </div>
        <div className={`estimate-card estimate-card--${estimate.partyOfFour.result}`}>
          <p className="estimate-card__label">{label}</p>
          <strong className="estimate-card__value">{estimate.partyOfFour.headline}</strong>
          <p>{estimate.partyOfFour.detail}</p>
        </div>
      </div>
      <p className="detail-panel__note">
        Approximate guidance only. {partyPlay ? "The four-trainer check assumes Party Play is active. " : "Max Battles are in-person and this check does not apply a Party Play multiplier. "}It does not inspect anyone’s Pokémon or guarantee a win.
      </p>
    </section>
  );
}
