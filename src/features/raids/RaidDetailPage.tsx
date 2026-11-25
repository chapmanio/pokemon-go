import { useEffect, useState } from "react";
import type { Freshness, RaidBossDetailResult, RaidProvenance } from "../../domain/raid";
import { fetchRaidBoss, RaidApiError } from "../../client/raid-api";
import { formatCpRange, sourceLabel } from "./raid-list";
import ShinyIndicator from "../shared/ShinyIndicator";
import FallbackImage from "../shared/FallbackImage";
import AppShell from "../shared/AppShell";
import { CounterGuidance, EstimatePanel } from "../battles/BattleDetailSections";
import BattleTabs from "../battles/BattleTabs";

const freshnessCopy: Record<Freshness, { label: string; detail: string }> = {
  fresh: { label: "Fresh data", detail: "This raid detail was recently fetched and validated." },
  stale: { label: "Stale data", detail: "This detail is usable, but may have changed since the last refresh." },
  degraded: { label: "Degraded data", detail: "Showing last known-good data because a source refresh failed." },
  unavailable: { label: "Unavailable", detail: "No validated detail is currently available." },
};

function formatUpdatedAt(provenance: RaidProvenance): string | undefined {
  const date = new Date(provenance.fetchedAt);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function pokedexUrl(detail: RaidBossDetailResult): string | undefined {
  return detail.pokedexKey ? `/pokedex/${encodeURIComponent(detail.pokedexKey)}` : undefined;
}

function DetailStatus({ detail }: { detail: RaidBossDetailResult }) {
  const status = freshnessCopy[detail.freshness];
  const updatedAt = formatUpdatedAt(detail.provenance);

  return (
    <section className={`status-panel status-panel--${detail.freshness}`} aria-label="Raid data status">
      <div>
        <p className="status-panel__label">{status.label}</p>
        <p>{status.detail}</p>
      </div>
      {updatedAt && <p className="status-panel__time">Fetched {updatedAt}</p>}
    </section>
  );
}

function SourceDisclosure({ detail }: { detail: RaidBossDetailResult }) {
  const sourceReferences = detail.sourceReferences?.length ? detail.sourceReferences : [detail.provenance];

  return (
    <details className="source-disclosure source-disclosure--detail">
      <summary>
        <span>Listed by {sourceReferences.length} {sourceReferences.length === 1 ? "source" : "sources"}</span>
        <span className="source-disclosure__icon" aria-hidden="true">ⓘ</span>
      </summary>
      <div className="source-disclosure__content">
        <p>Community feeds that currently list this raid boss:</p>
        <ul>
          {sourceReferences.map((reference) => (
            <li key={reference.source}>
              <a href={reference.sourceUrl} target="_blank" rel="noreferrer">{sourceLabel(reference.source)}</a>
            </li>
          ))}
        </ul>
      </div>
    </details>
  );
}

function DisagreementDisclosure({ detail }: { detail: RaidBossDetailResult }) {
  const disagreements = detail.sourceDisagreements ?? [];
  if (disagreements.length === 0) return null;

  return (
    <details className="source-disclosure source-disclosure--detail">
      <summary>
        <span>Sources differ on {disagreements.length} {disagreements.length === 1 ? "fact" : "facts"}</span>
        <span className="source-disclosure__icon" aria-hidden="true">ⓘ</span>
      </summary>
      <div className="source-disclosure__content">
        <p>These feeds currently report different values:</p>
        <ul className="disagreement-list">
          {disagreements.map((disagreement) => (
            <li key={disagreement.field}>
              <strong>{disagreement.label}</strong>
              <ul>
                {disagreement.values.map((value) => (
                  <li key={value.source}>{sourceLabel(value.source)}: {value.value}</li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </div>
    </details>
  );
}

function RaidOverview({ detail }: { detail: RaidBossDetailResult }) {
  const pokemonLink = pokedexUrl(detail);

  return (
    <section className="detail-panel">
      <h2>Overview</h2>
      <dl className="detail-grid">
        <div>
          <dt>Tier</dt>
          <dd>{detail.tier === "mega" ? "Mega" : `Tier ${detail.tier}`}</dd>
        </div>
        <div>
          <dt>Types</dt>
          <dd>{detail.types.length > 0 ? detail.types.join(" · ") : "Not listed"}</dd>
        </div>
        <div>
          <dt>Catch CP</dt>
          <dd>{formatCpRange(detail.catchCp) ?? "Not available"}</dd>
        </div>
        {detail.boostedCatchCp && (
          <div>
            <dt>Weather-boosted CP</dt>
            <dd>{formatCpRange(detail.boostedCatchCp)}</dd>
          </div>
        )}
        {detail.boostedWeather && detail.boostedWeather.length > 0 && (
          <div>
            <dt>Boosted by</dt>
            <dd>{detail.boostedWeather.join(" · ")}</dd>
          </div>
        )}
        {detail.shinyAvailable !== undefined && (
          <div>
            <dt>Shiny</dt>
            <dd><ShinyIndicator available={detail.shinyAvailable} /></dd>
          </div>
        )}
        {detail.isShadow && (
          <div>
            <dt>Variant</dt>
            <dd>Shadow raid</dd>
          </div>
        )}
      </dl>
      {pokemonLink && <p><a href={pokemonLink}>Open this Pokémon in the Pokédex</a></p>}
      <SourceDisclosure detail={detail} />
      <DisagreementDisclosure detail={detail} />
    </section>
  );
}

export default function RaidDetailPage({ raidBossId }: { raidBossId: string }) {
  const [detail, setDetail] = useState<RaidBossDetailResult>();
  const [error, setError] = useState<{ message: string; status?: number }>();
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setDetail(undefined);
    setError(undefined);

    fetchRaidBoss(raidBossId, controller.signal)
      .then(setDetail)
      .catch((cause: unknown) => {
        if (cause instanceof DOMException && cause.name === "AbortError") return;
        setError({
          message: cause instanceof Error ? cause.message : "Unable to load raid details",
          status: cause instanceof RaidApiError ? cause.status : undefined,
        });
      });

    return () => controller.abort();
  }, [raidBossId, reloadKey]);

  return (
    <AppShell activeSection="battles">
      <BattleTabs active="raids" />
      <p className="back-link"><a href="/raids">← Back to raid roster</a></p>

      {error && (
        <section className="error-panel" role="alert">
          <strong>{error.status === 404 ? "This raid is no longer in the current roster." : "We couldn’t load this raid."}</strong>
          <p>{error.status === 404 ? "It may have rotated out or is temporarily unavailable." : error.message}</p>
          <button type="button" onClick={() => setReloadKey((key) => key + 1)}>Try again</button>
          <p><a href="/raids">Return to the raid roster</a></p>
        </section>
      )}

      {!detail && !error && <p className="loading-state">Loading raid details…</p>}

      {detail && (
        <>
          <section className="detail-heading">
            <div className="detail-heading__identity">
              <FallbackImage className="detail-heading__image" src={detail.assetUrl} alt="" />
              <div>
                <p className="eyebrow">Raid details</p>
                <h1>{detail.displayName}</h1>
                <p>{detail.isShadow ? "Shadow raid" : detail.tier === "mega" ? "Mega raid" : `Tier ${detail.tier} raid`}</p>
              </div>
            </div>
          </section>
          <DetailStatus detail={detail} />
          {detail.warnings.length > 0 && (
            <section className="warning-panel" aria-label="Raid warnings">
              <strong>Source notes</strong>
              <ul>{detail.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>
            </section>
          )}
          <RaidOverview detail={detail} />
          <CounterGuidance detail={detail} />
          <EstimatePanel detail={detail} />
        </>
      )}
    </AppShell>
  );
}
