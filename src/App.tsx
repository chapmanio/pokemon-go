import RaidListPage from "./features/raids/RaidListPage";

export default function App() {
  const path = window.location.pathname.replace(/\/$/, "") || "/";

  if (path === "/" || path === "/raids") {
    return <RaidListPage />;
  }

  return (
    <main className="app-shell">
      <p className="eyebrow">Pokémon GO companion</p>
      <h1>Page not found</h1>
      <p><a href="/raids">Open the raid roster</a></p>
    </main>
  );
}
