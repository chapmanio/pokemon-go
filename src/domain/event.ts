export type EventSource = "leekduck";
export type EventFreshness = "fresh" | "stale" | "degraded" | "unavailable";

export interface EventProvenance {
  source: EventSource;
  endpoint: string;
  sourceUrl: string;
  fetchedAt: string;
  sourceUpdatedAt?: string;
  contentHash?: string;
}

export interface EventReference {
  section: string;
  name: string;
  assetUrl?: string;
  shinyAvailable?: boolean;
}

export interface EventDetails {
  bonuses: string[];
  related: EventReference[];
}

export interface PokemonGoEvent {
  eventId: string;
  title: string;
  category: string;
  description?: string;
  articleUrl?: string;
  bannerUrl?: string;
  startsAt: string;
  endsAt: string;
  isLocalTime: boolean;
  details: EventDetails;
  provenance: EventProvenance;
}

export interface EventCalendarResult {
  events: PokemonGoEvent[];
  sources: EventSource[];
  freshness: EventFreshness;
  asOf?: string;
  warnings: string[];
}

export interface EventDetailResult extends PokemonGoEvent {
  freshness: EventFreshness;
  warnings: string[];
}
