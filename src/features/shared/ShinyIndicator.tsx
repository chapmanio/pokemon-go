export default function ShinyIndicator({ available }: { available: boolean }) {
  const label = available ? "Shiny available" : "No shiny listed";
  return (
    <span
      className={`shiny-indicator shiny-indicator--${available ? "available" : "unavailable"}`}
      role="img"
      aria-label={label}
      title={label}
    >
      {available ? "✨" : "—"}
    </span>
  );
}
