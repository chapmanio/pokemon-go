import { useEffect, useState } from "react";
import type { Freshness, RaidBoss, RaidRosterResult } from "../../domain/raid";
import { fetchRaidRoster } from "../../client/raid-api";
import { formatCpRange, groupRaidsByTier, sourceLabel } from "./raid-list";

const freshnessCopy: Record<Freshness, { label: string; detail: string }> = {
  fresh: { label: "Fresh data", detail: "The roster was recently fetched and validated." },
  stale: { label: "Stale data", detail: "The roster is usable, but may have changed since the last refresh." },
  degraded: { label: "Degraded data", detail: "Showing the last known-good roster because a source refresh failed." },
  unavailable: { label: "Unavailable", detail: "No validated raid roster is currently available." },
};

function formatUpdatedAt(asOf?: string): string | undefined {
  if (!asOf) return undefined;
  const date = new Date(asOf);
  if (Number.isNaN(date.getTime())) return undefined;
  return `Updated ${date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}`;
}

function RaidCard({ boss }: { boss: RaidBoss }) {
  const sourceReferences = boss.sourceReferences?.length ? boss.sourceReferences : [boss.provenance];

  return (
    <article className="raid-card">
      <div className="raid-card__header">
        {boss.assetUrl ? (
          <img className="raid-card__image" src={boss.assetUrl} alt="" loading="lazy" />
        ) : (
          <div className="raid-card__image raid-card__image--empty" aria-hidden="true">?</div>
        )}
        <div>
          <h3><a className="raid-card__link" href={`/raids/${encodeURIComponent(boss.raidBossId)}`}>{boss.displayName}</a></h3>
          <p className="raid-card__types">{boss.types.join(" · ")}</p>
        </div>
      </div>
      <dl className="raid-card__details">
        <div>
          <dt>Catch CP</dt>
          <dd>{formatCpRange(boss.catchCp) ?? "Not available"}</dd>
        </div>
        {boss.shinyAvailable !== undefined && (
          <div>
            <dt>Shiny</dt>
            <dd>{boss.shinyAvailable ? "Available" : "Not listed"}</dd>
          </div>
        )}
      </dl>
      {boss.isShadow && <p className="raid-card__tag">Shadow raid</p>}
      <details className="source-disclosure">
        <summary>
          <span>Listed by {sourceReferences.length} {sourceReferences.length === 1 ? "source" : "sources"}</span>
          <span className="source-disclosure__icon" aria-hidden="true">ⓘ</span>
        </summary>
        <div className="source-disclosure__content">
          <p>Community feeds that currently list this raid boss:</p>
          <ul>
            {sourceReferences.map((reference) => (
              <li key={reference.source}>
                <a href={reference.sourceUrl} target="_blank" rel="noreferrer">
                  {sourceLabel(reference.source)}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </details>
    </article>
  );
}

function StatusPanel({ result }: { result: RaidRosterResult }) {
  const status = freshnessCopy[result.freshness];
  const updatedAt = formatUpdatedAt(result.asOf);

  return (
    <section className={`status-panel status-panel--${result.freshness}`} aria-label="Raid data status">
      <div>
        <p className="status-panel__label">{status.label}</p>
        <p>{status.detail}</p>
      </div>
      {updatedAt && <p className="status-panel__time">{updatedAt}</p>}
    </section>
  );
}

export default function RaidListPage() {
  const [result, setResult] = useState<RaidRosterResult>();
  const [error, setError] = useState<string>();
  const [reloadKey, setReloadKey] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(undefined);

    fetchRaidRoster(controller.signal)
      .then(setResult)
      .catch((cause: unknown) => {
        if (cause instanceof DOMException && cause.name === "AbortError") return;
        setError(cause instanceof Error ? cause.message : "Unable to load raids");
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [reloadKey]);

  const groups = result ? groupRaidsByTier(result.bosses) : [];

  return (
    <main className="app-shell">
      <header className="site-header">
        <a className="brand" href="/">PokéGO companion</a>
        <nav aria-label="Primary navigation">
          <a className="nav-link nav-link--active" href="/raids">Raids</a>
        </nav>
      </header>

      <section className="page-heading">
        <p className="eyebrow">Current play</p>
        <h1>Raid roster</h1>
        <p>See the current raid bosses and prepare with your family.</p>
      </section>

      {loading && !result && <p className="loading-state">Loading the current raid roster…</p>}

      {error && (
        <section className="error-panel" role="alert">
          <strong>We couldn’t load the raid roster.</strong>
          <p>{error}</p>
          <button type="button" onClick={() => setReloadKey((key) => key + 1)}>Try again</button>
        </section>
      )}

      {result && (
        <>
          <StatusPanel result={result} />
          {result.warnings.length > 0 && (
            <section className="warning-panel" aria-label="Raid warnings">
              <strong>Source notes</strong>
              <ul>
                {result.warnings.map((warning) => <li key={warning}>{warning}</li>)}
              </ul>
            </section>
          )}
          <div className="roster-summary">
            <p><strong>{result.bosses.length}</strong> bosses listed</p>
            <p>Sources: {result.sources.map(sourceLabel).join(", ") || "None"}</p>
            <button type="button" onClick={() => setReloadKey((key) => key + 1)} disabled={loading}>
              {loading ? "Refreshing…" : "Refresh"}
            </button>
          </div>
          {groups.length > 0 ? (
            <div className="raid-groups">
              {groups.map((group) => (
                <section className="raid-tier" key={String(group.tier)}>
                  <div className="raid-tier__heading">
                    <h2>{group.label}</h2>
                    <span>{group.bosses.length}</span>
                  </div>
                  <div className="raid-grid">
                    {group.bosses.map((boss) => <RaidCard key={boss.raidBossId} boss={boss} />)}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <p className="empty-state">No raid bosses are available right now.</p>
          )}
        </>
      )}
    </main>
  );
}
