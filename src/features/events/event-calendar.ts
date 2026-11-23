import type { EventReference, PokemonGoEvent } from "../../domain/event";

export function eventDate(value: string): Date | undefined {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export function formatEventDate(value: string): string {
  const date = eventDate(value);
  if (!date) return "Time unavailable";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function eventStatus(event: PokemonGoEvent, now = new Date()): "current" | "upcoming" | "ended" {
  const start = eventDate(event.startsAt)?.getTime() ?? Number.POSITIVE_INFINITY;
  const end = eventDate(event.endsAt)?.getTime() ?? Number.NEGATIVE_INFINITY;
  const current = now.getTime();
  if (current < start) return "upcoming";
  if (current > end) return "ended";
  return "current";
}

export function groupEventsByMonth(events: PokemonGoEvent[]): Array<{ label: string; events: PokemonGoEvent[] }> {
  const groups = new Map<string, { label: string; events: PokemonGoEvent[] }>();
  for (const event of [...events].sort((left, right) => (
    (eventDate(left.startsAt)?.getTime() ?? 0) - (eventDate(right.startsAt)?.getTime() ?? 0)
  ))) {
    const date = eventDate(event.startsAt);
    const key = date ? `${date.getFullYear()}-${date.getMonth()}` : "unknown";
    const label = date
      ? new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(date)
      : "Date to be confirmed";
    const group = groups.get(key) ?? { label, events: [] };
    group.events.push(event);
    groups.set(key, group);
  }
  return [...groups.values()];
}

export function relatedSectionLabel(section: string): string {
  const labels: Record<string, string> = {
    features: "Featured Pokémon",
    spawns: "Wild spawns",
    shiny: "Shiny encounters",
    raids: "Raid Pokémon",
    research: "Research encounters",
    moves: "Exclusive-move Pokémon",
    eggs: "Egg encounters",
    "max-battles": "Max Battles",
    "go-pass": "GO Pass",
  };
  return labels[section] ?? section.replace(/[-_]/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function groupRelatedBySection(references: EventReference[]): Array<{ section: string; label: string; items: EventReference[] }> {
  const groups = new Map<string, EventReference[]>();
  for (const reference of references) {
    const items = groups.get(reference.section) ?? [];
    items.push(reference);
    groups.set(reference.section, items);
  }
  return [...groups.entries()].map(([section, items]) => ({
    section,
    label: relatedSectionLabel(section),
    items,
  }));
}
