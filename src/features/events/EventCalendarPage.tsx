import { useEffect, useState } from "react";
import type { EventFreshness, EventCalendarResult, PokemonGoEvent } from "../../domain/event";
import { fetchEventCalendar } from "../../client/event-api";
import { eventStatus, formatEventDate, groupEventsByMonth } from "./event-calendar";

const freshnessCopy: Record<EventFreshness, { label: string; detail: string }> = {
  fresh: { label: "Fresh data", detail: "The event calendar was recently fetched and validated." },
  stale: { label: "Stale data", detail: "The calendar is usable, but may have changed since the last refresh." },
  degraded: { label: "Degraded data", detail: "Showing the last known-good calendar because the source refresh failed." },
  unavailable: { label: "Unavailable", detail: "No validated event calendar is currently available." },
};

function formatUpdatedAt(asOf?: string): string | undefined {
  if (!asOf) return undefined;
  const date = new Date(asOf);
  return Number.isNaN(date.getTime())
    ? undefined
    : `Updated ${date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}`;
}

function EventCard({ event }: { event: PokemonGoEvent }) {
  const status = eventStatus(event);
  return (
    <article className="event-card">
      {event.bannerUrl && <img className="event-card__banner" src={event.bannerUrl} alt="" loading="lazy" />}
      <div className="event-card__body">
        <div className="event-card__meta">
          <span className={`event-status event-status--${status}`}>{status}</span>
          <span>{event.category}</span>
        </div>
        <h3><a href={`/events/${encodeURIComponent(event.eventId)}`}>{event.title}</a></h3>
        <p className="event-card__time">
          {formatEventDate(event.startsAt)} – {formatEventDate(event.endsAt)}
          {event.isLocalTime && " · local time"}
        </p>
        {event.description && <p className="event-card__description">{event.description}</p>}
      </div>
    </article>
  );
}

function StatusPanel({ result }: { result: EventCalendarResult }) {
  const status = freshnessCopy[result.freshness];
  const updatedAt = formatUpdatedAt(result.asOf);
  return (
    <section className={`status-panel status-panel--${result.freshness}`} aria-label="Event data status">
      <div>
        <p className="status-panel__label">{status.label}</p>
        <p>{status.detail}</p>
      </div>
      {updatedAt && <p className="status-panel__time">{updatedAt}</p>}
    </section>
  );
}

export default function EventCalendarPage() {
  const [result, setResult] = useState<EventCalendarResult>();
  const [error, setError] = useState<string>();
  const [reloadKey, setReloadKey] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(undefined);
    fetchEventCalendar(controller.signal)
      .then(setResult)
      .catch((cause: unknown) => {
        if (cause instanceof DOMException && cause.name === "AbortError") return;
        setError(cause instanceof Error ? cause.message : "Unable to load events");
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [reloadKey]);

  const groups = result ? groupEventsByMonth(result.events) : [];

  return (
    <main className="app-shell">
      <header className="site-header">
        <a className="brand" href="/">PokéGO companion</a>
        <nav aria-label="Primary navigation">
          <a className="nav-link" href="/pokedex">Pokédex</a>
          <a className="nav-link" href="/raids">Raids</a>
          <a className="nav-link nav-link--active" href="/events">Events</a>
        </nav>
      </header>

      <section className="page-heading">
        <p className="eyebrow">Plan ahead</p>
        <h1>Event calendar</h1>
        <p>See current and upcoming Pokémon GO events, bonuses, raids and featured Pokémon.</p>
      </section>

      {loading && !result && <p className="loading-state">Loading the event calendar…</p>}
      {error && (
        <section className="error-panel" role="alert">
          <strong>We couldn’t load the event calendar.</strong>
          <p>{error}</p>
          <button type="button" onClick={() => setReloadKey((key) => key + 1)}>Try again</button>
        </section>
      )}
      {result && (
        <>
          <StatusPanel result={result} />
          {result.warnings.length > 0 && (
            <section className="warning-panel" aria-label="Event warnings">
              <strong>Source notes</strong>
              <ul>{result.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>
            </section>
          )}
          <div className="roster-summary">
            <p><strong>{result.events.length}</strong> events listed</p>
            <p>Source: {result.sources.join(", ") || "None"}</p>
            <button type="button" onClick={() => setReloadKey((key) => key + 1)} disabled={loading}>
              {loading ? "Refreshing…" : "Refresh"}
            </button>
          </div>
          {groups.length > 0 ? groups.map((group) => (
            <section className="event-month" key={group.label}>
              <h2>{group.label}</h2>
              <div className="event-grid">{group.events.map((event) => <EventCard key={event.eventId} event={event} />)}</div>
            </section>
          )) : <p className="empty-state">No events are available right now.</p>}
        </>
      )}
    </main>
  );
}
