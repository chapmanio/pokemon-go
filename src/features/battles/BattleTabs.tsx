export type BattleTab = "raids" | "max-battles";

export default function BattleTabs({ active }: { active: BattleTab }) {
  return (
    <nav className="battle-tabs" aria-label="Battle type">
      <a className={active === "raids" ? "battle-tab battle-tab--active" : "battle-tab"} href="/raids" aria-current={active === "raids" ? "page" : undefined}>
        Raids
      </a>
      <a className={active === "max-battles" ? "battle-tab battle-tab--active" : "battle-tab"} href="/max-battles" aria-current={active === "max-battles" ? "page" : undefined}>
        Max Battles
      </a>
    </nav>
  );
}
