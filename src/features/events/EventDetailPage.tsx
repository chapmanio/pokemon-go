import { useEffect, useState } from "react";
import type { EventDetailResult, EventFreshness } from "../../domain/event";
import { fetchEvent } from "../../client/event-api";
import { formatEventDate, groupRelatedBySection } from "./event-calendar";
import ShinyIndicator from "../shared/ShinyIndicator";
import FallbackImage from "../shared/FallbackImage";
import AppShell from "../shared/AppShell";

const freshnessCopy: Record<EventFreshness, string> = {
  fresh: "Fresh event data",
  stale: "Stale event data",
  degraded: "Degraded event data",
  unavailable: "Event data unavailable",
};

export default function EventDetailPage({ eventId }: { eventId: string }) {
  const [result, setResult] = useState<EventDetailResult>();
  const [error, setError] = useState<string>();
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setResult(undefined);
    setError(undefined);
    fetchEvent(eventId, controller.signal)
      .then(setResult)
      .catch((cause: unknown) => {
        if (cause instanceof DOMException && cause.name === "AbortError") return;
        setError(cause instanceof Error ? cause.message : "Unable to load this event");
      });
    return () => controller.abort();
  }, [eventId, reloadKey]);

  return (
    <AppShell activeSection="events">
      <p className="back-link"><a href="/events">← Back to event calendar</a></p>
      {error && <section className="error-panel" role="alert"><strong>We couldn’t load this event.</strong><p>{error}</p><button type="button" onClick={() => setReloadKey((key) => key + 1)}>Try again</button><p><a href="/events">Return to the event calendar</a></p></section>}
      {!result && !error && <p className="loading-state">Loading event…</p>}
      {result && <EventDetails result={result} />}
    </AppShell>
  );
}

function EventDetails({ result }: { result: EventDetailResult }) {
  const relatedGroups = groupRelatedBySection(result.details.related);
  return (
    <>
      {result.bannerUrl && <FallbackImage className="event-detail__banner" fallbackClassName="event-detail__banner--empty" src={result.bannerUrl} alt="" />}
      <section className="page-heading event-detail__heading">
        <p className="eyebrow">{result.category} · {freshnessCopy[result.freshness]}</p>
        <h1>{result.title}</h1>
        <p className="event-detail__time">
          {formatEventDate(result.startsAt)} – {formatEventDate(result.endsAt)}
          {result.isLocalTime && " · local time"}
        </p>
        {result.description && <p>{result.description}</p>}
        {result.articleUrl && <p><a href={result.articleUrl} target="_blank" rel="noreferrer">Read the source event page</a></p>}
      </section>
      {result.warnings.length > 0 && <section className="warning-panel" aria-label="Event warnings"><ul>{result.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul></section>}
      {result.details.bonuses.length > 0 && (
        <section className="event-detail__section"><h2>Bonuses</h2><ul className="event-bonuses">{result.details.bonuses.map((bonus) => <li key={bonus}>{bonus}</li>)}</ul></section>
      )}
      {relatedGroups.map((group) => (
        <section className="event-detail__section" key={group.section}>
          <h2>{group.label}</h2>
          <div className="event-reference-grid">
            {group.items.map((item, index) => (
              <article className="event-reference" key={`${item.name}-${index}`}>
                {item.assetUrl && <FallbackImage className="event-reference__image" fallbackClassName="event-reference__image--empty" src={item.assetUrl} alt="" />}
                <div><strong>{item.name}</strong>{item.shinyAvailable !== undefined && <ShinyIndicator available={item.shinyAvailable} />}</div>
              </article>
            ))}
          </div>
        </section>
      ))}
    </>
  );
}
