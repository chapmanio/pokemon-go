import RaidListPage from "./features/raids/RaidListPage";
import RaidDetailPage from "./features/raids/RaidDetailPage";
import PokedexListPage from "./features/pokedex/PokedexListPage";
import PokedexDetailPage from "./features/pokedex/PokedexDetailPage";
import EventCalendarPage from "./features/events/EventCalendarPage";
import EventDetailPage from "./features/events/EventDetailPage";
import EggPoolsPage from "./features/eggs/EggPoolsPage";

export default function App() {
  const path = window.location.pathname.replace(/\/$/, "") || "/";

  if (path === "/" || path === "/raids") {
    return <RaidListPage />;
  }

  if (path === "/pokedex") {
    return <PokedexListPage />;
  }

  if (path === "/events") {
    return <EventCalendarPage />;
  }

  if (path === "/eggs") {
    return <EggPoolsPage />;
  }


  const pokedexDetailMatch = path.match(/^\/pokedex\/([^/]+)$/);
  if (pokedexDetailMatch) {
    return <PokedexDetailPage pokemonKey={decodeURIComponent(pokedexDetailMatch[1])} />;
  }

  const raidDetailMatch = path.match(/^\/raids\/([^/]+)$/);
  if (raidDetailMatch) {
    return <RaidDetailPage raidBossId={decodeURIComponent(raidDetailMatch[1])} />;
  }

  const eventDetailMatch = path.match(/^\/events\/(.+)$/);
  if (eventDetailMatch) {
    return <EventDetailPage eventId={decodeURIComponent(eventDetailMatch[1])} />;
  }


  return (
    <main className="app-shell">
      <p className="eyebrow">Pokémon GO companion</p>
      <h1>Page not found</h1>
      <p><a href="/raids">Open the raid roster</a></p>
    </main>
  );
}
