import { useState, useEffect } from 'react';
import TokenLogo from './TokenLogo';
import { ChevronDown, Check } from 'lucide-react';
import { formatTokenBalance } from '@/libs/walletTokenDetection';

/**
 * Enhanced Token Selector Component
 * Shows tokens user owns with balance, grouped by priority
 *
 * @param {Array} tokens - Array of token objects with balance
 * @param {string} selectedToken - Currently selected token symbol
 * @param {function} onSelect - Callback when token selected
 * @param {boolean} disabled - Disable selection
 */
export default function TokenSelector({ tokens, selectedToken, onSelect, disabled = false }) {
  const [isOpen, setIsOpen] = useState(false);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (isOpen && !e.target.closest('.token-selector')) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Find selected token details
  const selected = tokens.find((t) => t.symbol === selectedToken);

  // Group tokens by priority
  const whitelistTokens = tokens.filter((t) => t.isWhitelisted);
  const otherTokens = tokens.filter((t) => !t.isWhitelisted);

  if (tokens.length === 0) {
    return (
      <div className="px-3 py-2 bg-muted/50 rounded-lg text-sm text-muted-foreground">
        No tokens available
      </div>
    );
  }

  return (
    <div className="token-selector relative">
      {/* Selected Token Button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className="flex items-center gap-2 px-3 py-2 bg-background border border-border rounded-lg hover:bg-muted/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed w-full"
      >
        {selected ? (
          <>
            <TokenLogo symbol={selected.symbol} size={24} />
            <div className="flex-1 text-left">
              <p className="font-bold">{selected.symbol}</p>
              {selected.balance && (
                <p className="text-xs text-muted-foreground">
                  {formatTokenBalance(selected.balance, selected.decimals)}
                </p>
              )}
            </div>
            <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </>
        ) : (
          <>
            <div className="w-6 h-6 rounded-full bg-muted" />
            <span className="flex-1 text-left text-muted-foreground">Select token...</span>
            <ChevronDown className="w-4 h-4" />
          </>
        )}
      </button>

      {/* Dropdown Menu - High Z-Index */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-card border-2 border-[var(--brand-yellow)] rounded-xl shadow-2xl z-[100] max-h-96 overflow-y-auto">
          {/* Whitelist Tokens Section */}
          {whitelistTokens.length > 0 && (
            <div>
              <div className="px-3 py-2 bg-muted/30 border-b border-border">
                <p className="text-xs font-semibold text-muted-foreground uppercase">Featured Tokens</p>
              </div>
              {whitelistTokens.map((token) => (
                <button
                  key={token.canisterId}
                  type="button"
                  onClick={() => {
                    onSelect(token.symbol);
                    setIsOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-3 hover:bg-muted/50 transition-colors border-b border-border/50 last:border-b-0"
                >
                  <TokenLogo symbol={token.symbol} size={32} />
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-2">
                      <p className="font-bold">{token.symbol}</p>
                      {token.symbol === selectedToken && (
                        <Check className="w-4 h-4 text-green-600" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Balance: {formatTokenBalance(token.balance, token.decimals)}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Other Tokens Section */}
          {otherTokens.length > 0 && (
            <div>
              <div className="px-3 py-2 bg-muted/30 border-b border-border">
                <p className="text-xs font-semibold text-muted-foreground uppercase">Your Other Tokens</p>
              </div>
              {otherTokens.map((token) => (
                <button
                  key={token.canisterId}
                  type="button"
                  onClick={() => {
                    onSelect(token.symbol);
                    setIsOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-3 hover:bg-muted/50 transition-colors border-b border-border/50 last:border-b-0"
                >
                  <TokenLogo symbol={token.symbol} size={32} />
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-2">
                      <p className="font-bold">{token.symbol}</p>
                      {token.symbol === selectedToken && (
                        <Check className="w-4 h-4 text-green-600" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Balance: {formatTokenBalance(token.balance, token.decimals)}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Empty State */}
          {tokens.length === 0 && (
            <div className="px-4 py-8 text-center text-muted-foreground">
              <p className="text-sm">No tokens found</p>
              <p className="text-xs mt-1">Connect a wallet with ICRC-1 tokens</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
