import type { ReactNode } from "react";

export type AppSection = "pokedex" | "raids" | "events" | "eggs";

const navigation: Array<{ section: AppSection; label: string; href: string }> = [
  { section: "pokedex", label: "Pokédex", href: "/pokedex" },
  { section: "raids", label: "Raids", href: "/raids" },
  { section: "events", label: "Events", href: "/events" },
  { section: "eggs", label: "Eggs", href: "/eggs" },
];

type AppShellProps = {
  activeSection?: AppSection;
  children: ReactNode;
  pageTitle?: string;
};

export default function AppShell({ activeSection, children, pageTitle }: AppShellProps) {
  const currentPage = navigation.find(({ section }) => section === activeSection)?.label;

  return (
    <div className="app-frame">
      <header className="site-header">
        <a className="brand" href="/">PoGo Buddy</a>
        <span className="site-header__page">{pageTitle ?? currentPage}</span>
      </header>

      <main className="app-shell">{children}</main>

      <nav className="bottom-nav" aria-label="Primary navigation">
        {navigation.map(({ section, label, href }) => {
          const isActive = section === activeSection;
          return (
            <a
              className={`nav-link${isActive ? " nav-link--active" : ""}`}
              href={href}
              aria-current={isActive ? "page" : undefined}
              key={section}
            >
              {label}
            </a>
          );
        })}
      </nav>
    </div>
  );
}
