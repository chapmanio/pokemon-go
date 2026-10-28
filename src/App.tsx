import RaidListPage from "./features/raids/RaidListPage";
import RaidDetailPage from "./features/raids/RaidDetailPage";
import PokedexListPage from "./features/pokedex/PokedexListPage";
import PokedexDetailPage from "./features/pokedex/PokedexDetailPage";

export default function App() {
  const path = window.location.pathname.replace(/\/$/, "") || "/";

  if (path === "/" || path === "/raids") {
    return <RaidListPage />;
  }

  if (path === "/pokedex") {
    return <PokedexListPage />;
  }

  const pokedexDetailMatch = path.match(/^\/pokedex\/([^/]+)$/);
  if (pokedexDetailMatch) {
    return <PokedexDetailPage pokemonKey={decodeURIComponent(pokedexDetailMatch[1])} />;
  }

  const raidDetailMatch = path.match(/^\/raids\/([^/]+)$/);
  if (raidDetailMatch) {
    return <RaidDetailPage raidBossId={decodeURIComponent(raidDetailMatch[1])} />;
  }

  return (
    <main className="app-shell">
      <p className="eyebrow">Pokémon GO companion</p>
      <h1>Page not found</h1>
      <p><a href="/raids">Open the raid roster</a></p>
    </main>
  );
}
