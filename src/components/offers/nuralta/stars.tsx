// Star rating helpers for the Nuralta clone

export function StarRow({
  fill = "#b8860b",
  size = 14,
  value = 5,
  className = "",
}: {
  fill?: string;
  size?: number;
  value?: number;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-0.5 ${className}`} aria-hidden="true">
      {Array.from({ length: 5 }).map((_, i) => {
        const filled = i < Math.floor(value);
        const half = !filled && i < value;
        return (
          <span key={i} className="relative inline-block" style={{ width: size, height: size }}>
            <StarSvg size={size} fill="transparent" stroke={fill} />
            {(filled || half) && (
              <span
                className="absolute inset-0 overflow-hidden"
                style={{ width: half ? size / 2 : size }}
              >
                <StarSvg size={size} fill={fill} stroke={fill} />
              </span>
            )}
          </span>
        );
      })}
    </span>
  );
}

function StarSvg({
  size,
  fill,
  stroke,
}: {
  size: number;
  fill: string;
  stroke: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill}
      stroke={stroke}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

