import { useEffect, useState } from "react";
import type { Freshness, RaidRange } from "../../domain/raid";
import type { MaxBattle, MaxBattleRosterResult } from "../../domain/max-battle";
import { fetchMaxBattleRoster } from "../../client/max-battle-api";
import AppShell from "../shared/AppShell";
import BattleTabs from "./BattleTabs";
import FallbackImage from "../shared/FallbackImage";

const freshnessCopy: Record<Freshness, { label: string; detail: string }> = {
  fresh: { label: "Fresh data", detail: "The Max Battle roster was recently fetched and validated." },
  stale: { label: "Stale data", detail: "The roster is usable, but may have changed since the last refresh." },
  degraded: { label: "Degraded data", detail: "Showing the last known-good roster because the source refresh failed." },
  unavailable: { label: "Unavailable", detail: "No validated Max Battle roster is currently available." },
};

function formatUpdatedAt(asOf?: string): string | undefined {
  if (!asOf) return undefined;
  const date = new Date(asOf);
  return Number.isNaN(date.getTime()) ? undefined : `Updated ${date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}`;
}

function formatCpRange(range?: RaidRange): string | undefined {
  return range ? `${range.min.toLocaleString()}–${range.max.toLocaleString()}` : undefined;
}

function groupBattles(battles: MaxBattle[]): Array<{ level: number; kind: MaxBattle["kind"]; battles: MaxBattle[] }> {
  const groups = new Map<string, { level: number; kind: MaxBattle["kind"]; battles: MaxBattle[] }>();
  for (const battle of battles) {
    const key = `${battle.kind}:${battle.level}`;
    const group = groups.get(key) ?? { level: battle.level, kind: battle.kind, battles: [] };
    group.battles.push(battle);
    groups.set(key, group);
  }
  return [...groups.values()].sort((left, right) => left.level - right.level);
}

function MaxBattleCard({ battle }: { battle: MaxBattle }) {
  return (
    <article className="raid-card">
      <div className="raid-card__header">
        <FallbackImage className="raid-card__image" src={battle.assetUrl} alt="" />
        <div>
          <h3><a className="raid-card__link" href={`/max-battles/${encodeURIComponent(battle.maxBattleId)}`}>{battle.displayName}</a></h3>
          <p className="raid-card__types">{battle.types.join(" · ") || "Types not listed"}</p>
        </div>
      </div>
      <dl className="raid-card__details">
        <div>
          <dt>Catch CP</dt>
          <dd>{formatCpRange(battle.catchCp) ?? "Not available"}</dd>
        </div>
        <div>
          <dt>Estimate</dt>
          <dd>{battle.battleEstimator === undefined ? "Unknown" : `${Math.ceil(battle.battleEstimator)} trainers`}</dd>
        </div>
      </dl>
      <p className="raid-card__tag">{battle.kind === "gigantamax" ? "Gigantamax" : "Dynamax"}</p>
    </article>
  );
}

export default function MaxBattleListPage() {
  const [result, setResult] = useState<MaxBattleRosterResult>();
  const [error, setError] = useState<string>();
  const [reloadKey, setReloadKey] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(undefined);
    fetchMaxBattleRoster(controller.signal)
      .then(setResult)
      .catch((cause: unknown) => {
        if (cause instanceof DOMException && cause.name === "AbortError") return;
        setError(cause instanceof Error ? cause.message : "Unable to load Max Battles");
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [reloadKey]);

  const groups = result ? groupBattles(result.battles) : [];

  return (
    <AppShell activeSection="battles">
      <BattleTabs active="max-battles" />
      <section className="page-heading">
        <p className="eyebrow">Current play</p>
        <h1>Max Battles</h1>
        <p>See the current Dynamax and Gigantamax encounters, then prepare with generic counters and group guidance.</p>
      </section>

      {loading && !result && <p className="loading-state">Loading the current Max Battle roster…</p>}
      {error && (
        <section className="error-panel" role="alert">
          <strong>We couldn’t load Max Battles.</strong>
          <p>{error}</p>
          <button type="button" onClick={() => setReloadKey((key) => key + 1)}>Try again</button>
        </section>
      )}
      {result && (
        <>
          <section className={`status-panel status-panel--${result.freshness}`} aria-label="Max Battle data status">
            <div>
              <p className="status-panel__label">{freshnessCopy[result.freshness].label}</p>
              <p>{freshnessCopy[result.freshness].detail}</p>
            </div>
            {formatUpdatedAt(result.asOf) && <p className="status-panel__time">{formatUpdatedAt(result.asOf)}</p>}
          </section>
          {result.warnings.length > 0 && <section className="warning-panel" aria-label="Max Battle warnings"><strong>Source notes</strong><ul>{result.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul></section>}
          <div className="roster-summary">
            <p><strong>{result.battles.length}</strong> Max Battles listed</p>
            <p>Sources: {result.sources.join(", ") || "None"}</p>
            <button type="button" onClick={() => setReloadKey((key) => key + 1)} disabled={loading}>{loading ? "Refreshing…" : "Refresh"}</button>
          </div>
          {groups.length > 0 ? groups.map((group) => (
            <section className="raid-tier" key={`${group.kind}:${group.level}`}>
              <div className="raid-tier__heading"><h2>{group.kind === "gigantamax" ? "Gigantamax" : "Dynamax"} · Tier {group.level}</h2><span>{group.battles.length}</span></div>
              <div className="raid-grid">{group.battles.map((battle) => <MaxBattleCard key={battle.maxBattleId} battle={battle} />)}</div>
            </section>
          )) : <p className="empty-state">No current Max Battles are listed by the source right now.</p>}
        </>
      )}
    </AppShell>
  );
}
