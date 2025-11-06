// Simple spinning circle loader with two variants:
// - 'colored': gradient (yellow → orange → pink)
// - 'white': inherit color from parent (for use on colored backgrounds)
export default function TipioLoader({ size = 24, variant = 'colored', className = '' }) {
  const isColored = variant === 'colored';

  return (
    <div className={`inline-flex items-center justify-center ${className}`}>
      <svg
        className="animate-spin"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke={isColored ? "url(#gradient)" : "currentColor"}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray="50 15"
          opacity={isColored ? "1" : "0.25"}
        />

        {isColored && (
          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="var(--brand-yellow, #fece10)" />
              <stop offset="50%" stopColor="var(--brand-orange, #f7931a)" />
              <stop offset="100%" stopColor="var(--brand-pink, #ff5f6d)" />
            </linearGradient>
          </defs>
        )}
      </svg>
    </div>
  );
}

// Optional: Text version with loader
export function TipioLoaderWithText({ text = 'Loading...', size = 32, variant = 'colored' }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <TipioLoader size={size} variant={variant} />
      {text && (
        <p className="text-sm font-medium text-muted-foreground animate-pulse">
          {text}
        </p>
      )}
    </div>
  );
}
