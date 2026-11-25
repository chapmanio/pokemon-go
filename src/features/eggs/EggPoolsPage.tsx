import { useEffect, useState } from "react";
import type { EggPool, EggPoolEntry, EggPoolsResult } from "../../domain/egg";
import type { Freshness } from "../../domain/raid";
import { fetchEggPools } from "../../client/egg-api";
import ShinyIndicator from "../shared/ShinyIndicator";
import FallbackImage from "../shared/FallbackImage";
import AppShell from "../shared/AppShell";

const freshnessCopy: Record<Freshness, { label: string; detail: string }> = {
  fresh: { label: "Fresh data", detail: "Egg pools were recently fetched and validated." },
  stale: { label: "Stale data", detail: "The pools are usable, but may have changed since the source last updated." },
  degraded: { label: "Degraded data", detail: "Showing the last known-good pools because the source refresh failed." },
  unavailable: { label: "Unavailable", detail: "No validated egg pools are currently available." },
};

function formatUpdatedAt(asOf?: string): string | undefined {
  if (!asOf) return undefined;
  const date = new Date(asOf);
  return Number.isNaN(date.getTime()) ? undefined : `Fetched ${date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}`;
}

interface EggRarityGroup {
  key: string;
  label: string;
  tier?: number;
  entries: EggPoolEntry[];
}

function groupEntriesByRarity(entries: EggPoolEntry[]): EggRarityGroup[] {
  const groups = new Map<string, EggRarityGroup>();

  for (const entry of entries) {
    const key = entry.rarityTier === undefined ? "unknown" : `tier-${entry.rarityTier}`;
    const group = groups.get(key);
    if (group) {
      group.entries.push(entry);
      continue;
    }

    groups.set(key, {
      key,
      label: entry.rarityTier === undefined ? "Rarity not listed" : `Rarity tier ${entry.rarityTier}`,
      tier: entry.rarityTier,
      entries: [entry],
    });
  }

  return [...groups.values()].sort((first, second) => {
    if (first.tier === undefined) return 1;
    if (second.tier === undefined) return -1;
    return first.tier - second.tier;
  });
}

function EggPoolSection({ pool }: { pool: EggPool }) {
  return (
    <section className="egg-pool">
      <div className="egg-pool__heading">
        <div><h2>{pool.displayName}</h2><p>{pool.hatchDistanceKm === null ? "Distance not specified" : `${pool.hatchDistanceKm} km hatch distance`}</p></div>
        <span>{pool.entries.length} Pokémon</span>
      </div>
      <div className="egg-rarity-groups">
        {groupEntriesByRarity(pool.entries).map((group) => <section className="egg-rarity-group" key={group.key}>
          <h3>{group.label}</h3>
          <div className="egg-grid">
            {group.entries.map((entry) => <article className="egg-card" key={entry.name}>
              <FallbackImage className="egg-card__image" src={entry.assetUrl} alt="" />
              <div><h4>{entry.name}</h4><ShinyIndicator available={entry.shinyAvailable} /></div>
            </article>)}
          </div>
        </section>)}
      </div>
    </section>
  );
}

export default function EggPoolsPage() {
  const [result, setResult] = useState<EggPoolsResult>();
  const [error, setError] = useState<string>();
  const [reloadKey, setReloadKey] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(undefined);
    fetchEggPools(controller.signal)
      .then(setResult)
      .catch((cause: unknown) => {
        if (cause instanceof DOMException && cause.name === "AbortError") return;
        setError(cause instanceof Error ? cause.message : "Unable to load egg pools");
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [reloadKey]);

  const status = result ? freshnessCopy[result.freshness] : undefined;
  return (
    <AppShell activeSection="eggs">
      <section className="page-heading"><p className="eyebrow">Reference</p><h1>Egg pools</h1><p>See which Pokémon can currently hatch from each egg type. Rarity tiers are relative source labels, not hatch probabilities.</p></section>
      {loading && !result && <p className="loading-state">Loading egg pools…</p>}
      {error && <section className="error-panel" role="alert"><strong>We couldn’t load the egg pools.</strong><p>{error}</p><button type="button" onClick={() => setReloadKey((key) => key + 1)}>Try again</button></section>}
      {result && <>
        <section className={`status-panel status-panel--${result.freshness}`} aria-label="Egg data status"><div><p className="status-panel__label">{status?.label}</p><p>{status?.detail}</p></div>{formatUpdatedAt(result.asOf) && <p className="status-panel__time">{formatUpdatedAt(result.asOf)}</p>}</section>
        {result.warnings.length > 0 && <section className="warning-panel" aria-label="Egg warnings"><strong>Source notes</strong><ul>{result.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul></section>}
        <div className="roster-summary"><p><strong>{result.pools.length}</strong> egg groups listed</p><p>Source: {result.sources.join(", ") || "None"}</p><button type="button" onClick={() => setReloadKey((key) => key + 1)} disabled={loading}>{loading ? "Refreshing…" : "Refresh"}</button></div>
        {result.pools.map((pool) => <EggPoolSection key={pool.eggPoolId} pool={pool} />)}
      </>}
    </AppShell>
  );
}
