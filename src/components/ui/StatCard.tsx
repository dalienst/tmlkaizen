interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  accentColor?: string;
}

export function StatCard({ label, value, sub, accentColor }: StatCardProps) {
  return (
    <div className="stat-card">
      <div className="stat-card__label">{label}</div>
      <div
        className="stat-card__value"
        style={accentColor ? { color: accentColor } : undefined}
      >
        {value}
      </div>
      {sub && <div className="stat-card__sub">{sub}</div>}
    </div>
  );
}
