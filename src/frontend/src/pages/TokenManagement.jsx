import { useState } from 'react';
import { useTokenRegistry } from '@/hooks/useTokenRegistry';
import { Button } from '@/components/ui/button';
import { RefreshCw, Check, ArrowLeft, Info } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import TipioLoader from '@/components/TipioLoader';

/**
 * Supported Tokens Page
 * View all supported ICRC-1 tokens with their metadata
 * (User-facing, not admin)
 */
export default function SupportedTokens() {
  const navigate = useNavigate();
  const { tokens, loading, refreshToken, SUPPORTED_TOKEN_CANISTERS } = useTokenRegistry();

  const handleRefresh = async (canisterId) => {
    try {
      await refreshToken(canisterId);
      toast.success('Token metadata refreshed!');
    } catch (error) {
      toast.error('Failed to refresh: ' + error.message);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <Button
          onClick={() => navigate('/')}
          variant="ghost"
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Button>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Supported Tokens</h1>
          <p className="text-muted-foreground">
            View all ICRC-1 tokens supported on Tipio with live metadata from the blockchain
          </p>
        </div>

        {/* Info Banner */}
        <div className="bg-muted/30 border border-border rounded-xl p-4 mb-6 flex items-start gap-3">
          <Info className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
          <div className="text-sm text-muted-foreground">
            <p className="font-semibold mb-1">About Token Metadata</p>
            <p>All token information is fetched directly from ICRC-1 ledger canisters on the Internet Computer blockchain.</p>
          </div>
        </div>

        {/* Supported Tokens List */}
        <div className="bg-card border-2 border-[var(--brand-yellow)] rounded-2xl p-6">
          <h2 className="text-xl font-bold mb-4">Available Tokens</h2>

          {loading && tokens.length === 0 ? (
            <div className="text-center py-8">
              <TipioLoader size={40} variant="colored" />
            </div>
          ) : (
            <div className="space-y-3">
              {tokens.map((token) => (
                <div
                  key={token.canisterId}
                  className="p-4 bg-muted/50 rounded-xl flex items-center justify-between hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1">
                    {/* Logo */}
                    {token.logo ? (
                      <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0">
                        <img
                          src={token.logo}
                          alt={token.symbol}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            // Fallback to circle with initial if image fails
                            e.target.parentElement.innerHTML = `<div class="w-full h-full rounded-full bg-gradient-to-br from-[var(--brand-yellow)] to-[var(--brand-orange)] flex items-center justify-center text-white font-bold text-lg">${token.symbol[0]}</div>`;
                          }}
                        />
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[var(--brand-yellow)] to-[var(--brand-orange)] flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                        {token.symbol[0]}
                      </div>
                    )}

                    {/* Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-lg">{token.symbol}</h3>
                        <span className="px-2 py-0.5 bg-muted rounded text-xs">
                          {token.decimals} decimals
                        </span>
                        {Object.values(SUPPORTED_TOKEN_CANISTERS).includes(token.canisterId) && (
                          <span className="px-2 py-0.5 bg-green-500/20 text-green-600 dark:text-green-400 rounded text-xs font-semibold flex items-center gap-1">
                            <Check className="w-3 h-3" />
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-1">{token.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">
                        {token.canisterId}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        <span className="font-semibold">Network Fee:</span>{' '}
                        {Number(token.fee) / Math.pow(10, token.decimals)}{' '}
                        {token.symbol}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleRefresh(token.canisterId)}
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      title="Refresh metadata from blockchain"
                    >
                      <RefreshCw className="w-3 h-3 mr-1" />
                      Refresh
                    </Button>
                  </div>
                </div>
              ))}

              {tokens.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  No tokens available
                </p>
              )}
            </div>
          )}
        </div>

        {/* How to Send Tips Section */}
        <div className="mt-6 p-6 bg-muted/30 border border-border rounded-xl">
          <h3 className="font-semibold mb-3">How to Send Tips:</h3>
          <ol className="text-sm text-muted-foreground space-y-2">
            <li className="flex items-start gap-2">
              <span className="font-bold text-foreground">1.</span>
              <span>Visit any creator's Tipio page (e.g., tipio.io/@username)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold text-foreground">2.</span>
              <span>Connect your wallet (OISY or Plug)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold text-foreground">3.</span>
              <span>Select a token from the list above</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold text-foreground">4.</span>
              <span>Enter the amount and send your tip!</span>
            </li>
          </ol>
        </div>

      </div>
    </div>
  );
}
