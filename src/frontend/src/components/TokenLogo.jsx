import { useState, useEffect } from 'react';
import { getTokenBySymbol } from '@/libs/icrc1';

/**
 * TokenLogo Component
 * Displays token logo from ICRC-1 metadata or fallback to circle with initial
 *
 * @param {string} symbol - Token symbol (ICP, ckBTC, ckUSDC)
 * @param {number} size - Size in pixels (default: 32)
 * @param {string} className - Additional CSS classes
 */
export default function TokenLogo({ symbol, size = 32, className = '' }) {
  const [logo, setLogo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLogo() {
      // Special handling for ICP token - use local SVG
      if (symbol === 'ICP') {
        setLogo('/images/tokens/ICP.svg');
        setLoading(false);
        return;
      }

      try {
        const metadata = await getTokenBySymbol(symbol);
        setLogo(metadata?.logo || null);
      } catch (error) {
        console.error(`Error fetching logo for ${symbol}:`, error);
        setLogo(null);
      } finally {
        setLoading(false);
      }
    }

    fetchLogo();
  }, [symbol]);

  // Loading state
  if (loading) {
    return (
      <div
        className={`rounded-full bg-muted animate-pulse ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  // Special rendering for ICP token with custom SVG
  if (symbol === 'ICP' && logo) {
    return (
      <div
        className={`rounded-full overflow-hidden flex items-center justify-center bg-white flex-shrink-0 ${className}`}
        style={{
          width: size,
          height: size
        }}
      >
        <div
          style={{
            width: `${size * 0.65}px`,  // Scale logo to 65% of container
            height: `${size * 0.65}px`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <img
            src={logo}
            alt={symbol}
            className="w-full h-full object-contain"
            style={{ imageRendering: '-webkit-optimize-contrast' }}
          />
        </div>
      </div>
    );
  }

  // Has logo - display image
  if (logo) {
    return (
      <div
        className={`rounded-full overflow-hidden flex-shrink-0 ${className}`}
        style={{ width: size, height: size }}
      >
        <img
          src={logo}
          alt={symbol}
          className="w-full h-full object-cover"
          onError={(e) => {
            // Fallback to circle with initial if image fails
            e.target.parentElement.innerHTML = `
              <div class="w-full h-full rounded-full bg-gradient-to-br from-[var(--brand-yellow)] to-[var(--brand-orange)] flex items-center justify-center text-white font-bold" style="font-size: ${size * 0.4}px">
                ${symbol[0]}
              </div>
            `;
          }}
        />
      </div>
    );
  }

  // No logo - display circle with initial
  return (
    <div
      className={`rounded-full bg-gradient-to-br from-[var(--brand-yellow)] to-[var(--brand-orange)] flex items-center justify-center text-white font-bold flex-shrink-0 ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {symbol[0]}
    </div>
  );
}
