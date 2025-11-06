import { Button } from '@/components/ui/button';
import { X, AlertTriangle, Info } from 'lucide-react';
import TipioLoader from '@/components/TipioLoader';
import TokenLogo from '@/components/TokenLogo';

/**
 * Withdrawal Confirmation Modal
 * Shows fee breakdown and confirms withdrawal
 */
export default function WithdrawalConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  balance,
  feeInfo,
  token,
  withdrawing,
}) {
  if (!isOpen) return null;

  const formatBalance = (amount, decimals) => {
    const value = Number(amount) / Math.pow(10, decimals);
    return value.toFixed(decimals);
  };

  const decimals = token === 'ICP' ? 8 : token === 'ckBTC' ? 8 : 6;

  const insufficientBalance = feeInfo && feeInfo.amountToReceive === 0n;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-card border-2 border-[var(--brand-yellow)] rounded-2xl max-w-md w-full shadow-2xl animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <TokenLogo symbol={token} size={40} />
            <div>
              <h2 className="text-xl font-bold">Confirm Withdrawal</h2>
              <p className="text-sm text-muted-foreground">Review fees before proceeding</p>
            </div>
          </div>
          <Button
            onClick={onClose}
            variant="ghost"
            size="sm"
            className="hover:bg-muted"
            disabled={withdrawing}
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Balance */}
          <div className="p-4 bg-muted/50 rounded-xl">
            <p className="text-xs text-muted-foreground mb-1">Tip Balance</p>
            <p className="text-2xl font-bold">
              {formatBalance(balance, decimals)} {token}
            </p>
          </div>

          {/* Fee Breakdown */}
          {feeInfo && (
            <div className="space-y-2">
              <p className="text-sm font-semibold">Fee Breakdown:</p>

              <div className="p-3 bg-muted/30 rounded-lg space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Platform Fee (2%):</span>
                  <span className="font-mono">
                    {formatBalance(feeInfo.platformFee, decimals)} {token}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-muted-foreground">Network Fee:</span>
                  <span className="font-mono">
                    {formatBalance(feeInfo.ledgerFee, decimals)} {token}
                  </span>
                </div>

                <div className="border-t border-border pt-2 flex justify-between">
                  <span className="text-muted-foreground">Total Fees:</span>
                  <span className="font-semibold font-mono">
                    {formatBalance(feeInfo.totalFees, decimals)} {token}
                  </span>
                </div>
              </div>

              {/* Amount to Receive */}
              <div className={`p-4 rounded-xl border-2 ${
                insufficientBalance
                  ? 'bg-destructive/10 border-destructive/50'
                  : 'bg-green-500/10 border-green-500/30'
              }`}>
                <p className="text-xs text-muted-foreground mb-1">You Will Receive:</p>
                <p className={`text-2xl font-bold font-mono ${
                  insufficientBalance
                    ? 'text-destructive'
                    : 'text-green-600 dark:text-green-400'
                }`}>
                  {formatBalance(feeInfo.amountToReceive, decimals)} {token}
                </p>
              </div>

              {/* Warning for insufficient balance */}
              {insufficientBalance && (
                <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/50 rounded-lg">
                  <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-destructive">
                    <p className="font-semibold mb-1">Insufficient Balance</p>
                    <p>The tip balance is too small to cover the withdrawal fees. You need at least {formatBalance(feeInfo.totalFees + 1000n, decimals)} {token} to withdraw.</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Info */}
          <div className="p-3 bg-muted/30 rounded-lg">
            <p className="text-xs text-muted-foreground">
              Funds will be sent directly to your connected wallet address.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-border">
          <Button
            onClick={onClose}
            variant="outline"
            className="flex-1"
            disabled={withdrawing}
          >
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={withdrawing || insufficientBalance}
            className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white"
          >
            {withdrawing ? (
              <>
                <TipioLoader size={16} variant="white" className="mr-2" />
                Processing...
              </>
            ) : (
              'Confirm Withdrawal'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
