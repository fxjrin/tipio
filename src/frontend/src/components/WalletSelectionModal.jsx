import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X, Wallet } from 'lucide-react';
import TipioLoader from '@/components/TipioLoader';
import { toast } from 'sonner';

/**
 * Wallet Selection Modal
 * Allows user to choose between OISY or Plug wallet
 */
export default function WalletSelectionModal({
  isOpen,
  onClose,
  onSelectWallet,
  title = "Connect Wallet",
  description = "Choose a wallet to connect"
}) {
  const [connecting, setConnecting] = useState(null); // 'oisy' | 'plug' | null

  // Reset connecting state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setConnecting(null);
    }
  }, [isOpen]);

  const handleSelectWallet = (walletType) => {
    setConnecting(walletType);

    // Call onSelectWallet directly WITHOUT await to stay in click context
    // Let the parent handle the async operation
    onSelectWallet(walletType)
      .then(() => {
        // Success - close modal
        setConnecting(null);
        onClose(); // Close modal on success
      })
      .catch((err) => {
        console.error(`Error connecting ${walletType}:`, err);
        toast.error(err.message || `Failed to connect ${walletType} wallet`);
        setConnecting(null); // Reset on error but keep modal open
      });
  };

  const handleClose = () => {
    setConnecting(null); // Reset state before closing
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-card border-2 border-[var(--brand-yellow)] rounded-2xl max-w-md w-full shadow-2xl animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--brand-yellow)] to-[var(--brand-orange)] flex items-center justify-center">
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold">{title}</h2>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
          </div>
          <Button
            onClick={handleClose}
            variant="ghost"
            size="sm"
            className="hover:bg-muted"
            disabled={connecting}
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Wallet Options */}
        <div className="p-6 space-y-4">
          {/* OISY Wallet */}
          <button
            onClick={() => handleSelectWallet('oisy')}
            disabled={connecting !== null}
            className="w-full p-4 rounded-xl border-2 border-border hover:border-[var(--brand-yellow)] hover:bg-muted/50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 flex items-center justify-center flex-shrink-0">
                <img
                  src="/images/connect/Oisy.svg"
                  alt="OISY Wallet"
                  className="w-12 h-12 rounded-full"
                />
              </div>
              <div className="flex-1 text-left">
                <h3 className="font-bold text-lg group-hover:text-[var(--brand-yellow)] transition-colors">
                  OISY Wallet
                </h3>
                <p className="text-sm text-muted-foreground">
                  Secure wallet for Internet Computer
                </p>
              </div>
              {connecting === 'oisy' && (
                <TipioLoader size={24} variant="colored" />
              )}
            </div>
          </button>

          {/* Plug Wallet */}
          <button
            onClick={() => handleSelectWallet('plug')}
            disabled={connecting !== null}
            className="w-full p-4 rounded-xl border-2 border-border hover:border-[var(--brand-orange)] hover:bg-muted/50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 flex items-center justify-center flex-shrink-0">
                <img
                  src="/images/connect/Plug.svg"
                  alt="Plug Wallet"
                  className="w-12 h-12"
                />
              </div>
              <div className="flex-1 text-left">
                <h3 className="font-bold text-lg group-hover:text-[var(--brand-orange)] transition-colors">
                  Plug Wallet
                </h3>
                <p className="text-sm text-muted-foreground">
                  Browser extension for IC
                </p>
              </div>
              {connecting === 'plug' && (
                <TipioLoader size={24} variant="colored" />
              )}
            </div>
          </button>

          {/* Info */}
          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground text-center">
              Don't have a wallet?{' '}
              <a
                href="https://oisy.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--brand-yellow)] hover:underline"
              >
                Get OISY
              </a>
              {' | '}
              <a
                href="https://plugwallet.ooo"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--brand-orange)] hover:underline"
              >
                Get Plug
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
