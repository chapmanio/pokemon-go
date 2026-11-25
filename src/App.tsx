import RaidListPage from "./features/raids/RaidListPage";
import RaidDetailPage from "./features/raids/RaidDetailPage";
import MaxBattleListPage from "./features/battles/MaxBattleListPage";
import MaxBattleDetailPage from "./features/battles/MaxBattleDetailPage";
import PokedexListPage from "./features/pokedex/PokedexListPage";
import PokedexDetailPage from "./features/pokedex/PokedexDetailPage";
import EventCalendarPage from "./features/events/EventCalendarPage";
import EventDetailPage from "./features/events/EventDetailPage";
import EggPoolsPage from "./features/eggs/EggPoolsPage";
import AppShell from "./features/shared/AppShell";

export default function App() {
  const path = window.location.pathname.replace(/\/$/, "") || "/";

  if (path === "/") {
    return <PokedexListPage />;
  }

  if (path === "/raids") {
    return <RaidListPage />;
  }

  if (path === "/max-battles") {
    return <MaxBattleListPage />;
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

  const maxBattleDetailMatch = path.match(/^\/max-battles\/([^/]+)$/);
  if (maxBattleDetailMatch) {
    return <MaxBattleDetailPage maxBattleId={decodeURIComponent(maxBattleDetailMatch[1])} />;
  }

  const eventDetailMatch = path.match(/^\/events\/(.+)$/);
  if (eventDetailMatch) {
    return <EventDetailPage eventId={decodeURIComponent(eventDetailMatch[1])} />;
  }


  return (
    <AppShell pageTitle="Not found">
      <p className="eyebrow">Pokémon GO companion</p>
      <h1>Page not found</h1>
      <p><a href="/raids">Open the raid roster</a></p>
    </AppShell>
  );
}
