import { useEffect, useState } from "react";
import type { MaxBattleDetailResult } from "../../domain/max-battle";
import type { Freshness } from "../../domain/raid";
import { fetchMaxBattle, MaxBattleApiError } from "../../client/max-battle-api";
import { CounterGuidance, EstimatePanel } from "./BattleDetailSections";
import BattleTabs from "./BattleTabs";
import AppShell from "../shared/AppShell";
import FallbackImage from "../shared/FallbackImage";
import ShinyIndicator from "../shared/ShinyIndicator";

const freshnessCopy: Record<Freshness, { label: string; detail: string }> = {
  fresh: { label: "Fresh data", detail: "This Max Battle detail was recently fetched and validated." },
  stale: { label: "Stale data", detail: "This detail is usable, but may have changed since the last refresh." },
  degraded: { label: "Degraded data", detail: "Showing last known-good data because the source refresh failed." },
  unavailable: { label: "Unavailable", detail: "No validated Max Battle detail is currently available." },
};

function formatCpRange(range?: { min: number; max: number }): string | undefined {
  return range ? `${range.min.toLocaleString()}–${range.max.toLocaleString()}` : undefined;
}

function MaxBattleOverview({ detail }: { detail: MaxBattleDetailResult }) {
  return (
    <section className="detail-panel">
      <h2>Overview</h2>
      <dl className="detail-grid">
        <div><dt>Kind</dt><dd>{detail.kind === "gigantamax" ? "Gigantamax" : "Dynamax"}</dd></div>
        <div><dt>Tier</dt><dd>Tier {detail.level}</dd></div>
        <div><dt>Types</dt><dd>{detail.types.length > 0 ? detail.types.join(" · ") : "Not listed"}</dd></div>
        <div><dt>Catch CP</dt><dd>{formatCpRange(detail.catchCp) ?? "Not available"}</dd></div>
        {detail.shinyAvailable !== undefined && <div><dt>Shiny</dt><dd><ShinyIndicator available={detail.shinyAvailable} /></dd></div>}
      </dl>
      {detail.pokedexKey && <p><a href={`/pokedex/${encodeURIComponent(detail.pokedexKey)}`}>Open this Pokémon in the Pokédex</a></p>}
      <details className="source-disclosure source-disclosure--detail">
        <summary><span>Source details</span><span className="source-disclosure__icon" aria-hidden="true">ⓘ</span></summary>
        <div className="source-disclosure__content"><p>Max Battle data is supplied by a community-maintained source.</p><a href={detail.provenance.sourceUrl} target="_blank" rel="noreferrer">Open source</a></div>
      </details>
    </section>
  );
}

export default function MaxBattleDetailPage({ maxBattleId }: { maxBattleId: string }) {
  const [detail, setDetail] = useState<MaxBattleDetailResult>();
  const [error, setError] = useState<{ message: string; status?: number }>();
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setDetail(undefined);
    setError(undefined);
    fetchMaxBattle(maxBattleId, controller.signal)
      .then(setDetail)
      .catch((cause: unknown) => {
        if (cause instanceof DOMException && cause.name === "AbortError") return;
        setError({ message: cause instanceof Error ? cause.message : "Unable to load Max Battle details", status: cause instanceof MaxBattleApiError ? cause.status : undefined });
      });
    return () => controller.abort();
  }, [maxBattleId, reloadKey]);

  return (
    <AppShell activeSection="battles">
      <BattleTabs active="max-battles" />
      <p className="back-link"><a href="/max-battles">← Back to Max Battles</a></p>
      {error && <section className="error-panel" role="alert"><strong>{error.status === 404 ? "This Max Battle is no longer current." : "We couldn’t load this Max Battle."}</strong><p>{error.message}</p><button type="button" onClick={() => setReloadKey((key) => key + 1)}>Try again</button><p><a href="/max-battles">Return to Max Battles</a></p></section>}
      {!detail && !error && <p className="loading-state">Loading Max Battle details…</p>}
      {detail && (
        <>
          <section className="detail-heading">
            <div className="detail-heading__identity">
              <FallbackImage className="detail-heading__image" src={detail.assetUrl} alt="" />
              <div><p className="eyebrow">Max Battle details</p><h1>{detail.displayName}</h1><p>{detail.kind === "gigantamax" ? "Gigantamax" : "Dynamax"} · Tier {detail.level}</p></div>
            </div>
          </section>
          <section className={`status-panel status-panel--${detail.freshness}`} aria-label="Max Battle data status"><div><p className="status-panel__label">{freshnessCopy[detail.freshness].label}</p><p>{freshnessCopy[detail.freshness].detail}</p></div></section>
          {detail.warnings.length > 0 && <section className="warning-panel" aria-label="Max Battle warnings"><strong>Source notes</strong><ul>{detail.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul></section>}
          <MaxBattleOverview detail={detail} />
          <CounterGuidance detail={detail} />
          <EstimatePanel detail={detail} label="Can 4 capable players beat it?" partyPlay={false} />
        </>
      )}
    </AppShell>
  );
}
