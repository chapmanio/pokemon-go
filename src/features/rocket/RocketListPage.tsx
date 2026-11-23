import { useEffect, useState } from "react";
import type { Freshness } from "../../domain/raid";
import type { RocketMember, RocketRosterResult } from "../../domain/rocket";
import { fetchRocketRoster } from "../../client/rocket-api";
import { formatTheme, groupRocketMembers } from "./rocket";

const freshnessCopy: Record<Freshness, { label: string; detail: string }> = {
  fresh: { label: "Fresh data", detail: "Rocket lineups were recently fetched and validated." },
  stale: { label: "Stale data", detail: "The lineups are usable, but may have changed since the last refresh." },
  degraded: { label: "Degraded data", detail: "Showing the last known-good lineups because the source refresh failed." },
  unavailable: { label: "Unavailable", detail: "No validated Rocket lineups are currently available." },
};

function formatUpdatedAt(asOf?: string): string | undefined {
  if (!asOf) return undefined;
  const date = new Date(asOf);
  return Number.isNaN(date.getTime()) ? undefined : `Updated ${date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}`;
}

function MemberCard({ member }: { member: RocketMember }) {
  const encounterSlots = member.lineup.filter((slot) => slot.isEncounter).map((slot) => slot.slot);
  return (
    <article className="rocket-card">
      <div className="rocket-card__heading">
        <div>
          <p className="rocket-card__theme">{formatTheme(member)}</p>
          <h3><a href={`/rocket/${encodeURIComponent(member.memberId)}`}>{member.displayName}</a></h3>
        </div>
        <span className="rocket-card__count">{member.lineup.length} slots</span>
      </div>
      <p className="rocket-card__guidance">{member.guidance}</p>
      {encounterSlots.length > 0 && <p className="rocket-card__encounter">Possible encounter: slot {encounterSlots.join(", ")}</p>}
    </article>
  );
}

function StatusPanel({ result }: { result: RocketRosterResult }) {
  const status = freshnessCopy[result.freshness];
  return (
    <section className={`status-panel status-panel--${result.freshness}`} aria-label="Rocket data status">
      <div><p className="status-panel__label">{status.label}</p><p>{status.detail}</p></div>
      {formatUpdatedAt(result.asOf) && <p className="status-panel__time">{formatUpdatedAt(result.asOf)}</p>}
    </section>
  );
}

export default function RocketListPage() {
  const [result, setResult] = useState<RocketRosterResult>();
  const [error, setError] = useState<string>();
  const [reloadKey, setReloadKey] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(undefined);
    fetchRocketRoster(controller.signal)
      .then(setResult)
      .catch((cause: unknown) => {
        if (cause instanceof DOMException && cause.name === "AbortError") return;
        setError(cause instanceof Error ? cause.message : "Unable to load Rocket lineups");
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [reloadKey]);

  const groups = result ? groupRocketMembers(result.members) : [];
  return (
    <main className="app-shell">
      <header className="site-header">
        <a className="brand" href="/">PokéGO companion</a>
        <nav aria-label="Primary navigation">
          <a className="nav-link" href="/pokedex">Pokédex</a>
          <a className="nav-link" href="/raids">Raids</a>
          <a className="nav-link" href="/events">Events</a>
          <a className="nav-link nav-link--active" href="/rocket">Rocket</a>
        </nav>
      </header>
      <section className="page-heading"><p className="eyebrow">Current play</p><h1>Team GO Rocket</h1><p>Check current Grunt, Leader and Giovanni lineups before choosing a battle team.</p></section>
      {loading && !result && <p className="loading-state">Loading Rocket lineups…</p>}
      {error && <section className="error-panel" role="alert"><strong>We couldn’t load the Rocket lineups.</strong><p>{error}</p><button type="button" onClick={() => setReloadKey((key) => key + 1)}>Try again</button></section>}
      {result && <>
        <StatusPanel result={result} />
        {result.warnings.length > 0 && <section className="warning-panel" aria-label="Rocket warnings"><strong>Source notes</strong><ul>{result.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul></section>}
        <div className="roster-summary"><p><strong>{result.members.length}</strong> lineups listed</p><p>Source: {result.sources.join(", ") || "None"}</p><button type="button" onClick={() => setReloadKey((key) => key + 1)} disabled={loading}>{loading ? "Refreshing…" : "Refresh"}</button></div>
        {groups.map((group) => <section className="rocket-group" key={group.kind}><h2>{group.label}</h2><div className="rocket-grid">{group.members.map((member) => <MemberCard key={member.memberId} member={member} />)}</div></section>)}
      </>}
    </main>
  );
}
