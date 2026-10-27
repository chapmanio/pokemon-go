import RaidListPage from "./features/raids/RaidListPage";
import RaidDetailPage from "./features/raids/RaidDetailPage";

export default function App() {
  const path = window.location.pathname.replace(/\/$/, "") || "/";

  if (path === "/" || path === "/raids") {
    return <RaidListPage />;
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
