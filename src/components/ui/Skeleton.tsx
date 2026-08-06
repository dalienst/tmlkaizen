interface SkeletonProps {
  className?: string;
  style?: React.CSSProperties;
  width?: string;
  height?: string;
}

export function Skeleton({ className = "", style, width, height }: SkeletonProps) {
  return (
    <div
      className={`skeleton ${className}`.trim()}
      style={{ width, height, ...style }}
    />
  );
}

/** A full row of skeleton cells matching a table */
export function SkeletonRow({ cols = 4 }: { cols?: number }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i}>
          <Skeleton height="1rem" style={{ maxWidth: i === 0 ? "8rem" : "100%" }} />
        </td>
      ))}
    </tr>
  );
}

/** Grid of skeleton stat cards */
export function SkeletonStatCards({ count = 4 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="stat-card">
          <Skeleton height="0.75rem" width="6rem" />
          <Skeleton height="1.5rem" width="4rem" style={{ marginTop: "0.5rem" }} />
        </div>
      ))}
    </>
  );
}
