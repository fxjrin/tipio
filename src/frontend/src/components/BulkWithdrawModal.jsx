import { X, AlertTriangle, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import TokenLogo from '@/components/TokenLogo';
import { formatTokenAmount } from '@/libs/constants';

export default function BulkWithdrawModal({ isOpen, onClose, onConfirm, selectedTips, tips, balances, feeInfo, calculateUSD, withdrawing }) {
  if (!isOpen) return null;

  // Group tips by token
  const tipsByToken = {};
  selectedTips.forEach((tipId) => {
    const tip = tips.find((t) => t.id === tipId);
    if (!tip) return;

    const token = tip.token;
    if (!tipsByToken[token]) {
      tipsByToken[token] = {
        tips: [],
        totalAmount: 0n,
        totalFees: 0n,
      };
    }

    tipsByToken[token].tips.push(tip);
    tipsByToken[token].totalAmount += balances[tipId] || 0n;

    // Add fees if available
    if (feeInfo[tipId]) {
      tipsByToken[token].totalFees += feeInfo[tipId].totalFee || 0n;
    }
  });

  const formatBalance = (amount, token) => {
    const decimals = token === 'ICP' ? 8 : token === 'ckBTC' ? 8 : 6;
    return formatTokenAmount(amount, decimals);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative bg-card rounded-3xl p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto border border-border shadow-2xl">
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={withdrawing}
          className="absolute top-6 right-6 w-10 h-10 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center transition-colors disabled:opacity-50"
        >
          <X className="w-5 h-5 text-muted-foreground" />
        </button>

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-gradient-to-br from-[var(--brand-yellow)] to-[var(--brand-orange)] rounded-2xl flex items-center justify-center">
              <Download className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Confirm Bulk Withdrawal</h2>
              <p className="text-sm text-muted-foreground">Withdrawing {selectedTips.length} tip{selectedTips.length > 1 ? 's' : ''}</p>
            </div>
          </div>
        </div>

        {/* Warning */}
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold text-amber-900 mb-1">Processing Multiple Withdrawals</p>
            <p className="text-amber-800">
              Each tip will be withdrawn individually. This may take a few moments. Please do not close this window.
            </p>
          </div>
        </div>

        {/* Breakdown by Token */}
        <div className="mb-6">
          <h3 className="font-bold mb-3">Withdrawal Summary</h3>
          <div className="space-y-3">
            {Object.entries(tipsByToken).map(([token, data]) => {
              const decimals = token === 'ICP' ? 8 : token === 'ckBTC' ? 8 : 6;
              const amountInToken = Number(data.totalAmount) / Math.pow(10, decimals);
              const feesInToken = Number(data.totalFees) / Math.pow(10, decimals);
              const netAmount = data.totalAmount - data.totalFees;
              const netInToken = Number(netAmount) / Math.pow(10, decimals);

              const totalUSD = calculateUSD(amountInToken, token);
              const feeUSD = calculateUSD(feesInToken, token);
              const netUSD = calculateUSD(netInToken, token);

              return (
                <div key={token} className="p-4 bg-muted/30 rounded-xl border border-border">
                  <div className="flex items-center gap-3 mb-3">
                    <TokenLogo symbol={token} size={32} />
                    <div>
                      <p className="font-bold text-foreground">{token}</p>
                      <p className="text-xs text-muted-foreground">{data.tips.length} tip{data.tips.length > 1 ? 's' : ''}</p>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Gross Amount:</span>
                      <div className="text-right">
                        <p className="font-semibold">{formatBalance(data.totalAmount, token)} {token}</p>
                        <p className="text-xs text-muted-foreground">${totalUSD.toFixed(2)}</p>
                      </div>
                    </div>

                    {data.totalFees > 0n && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Total Fees:</span>
                        <div className="text-right">
                          <p className="font-semibold text-red-600">-{formatBalance(data.totalFees, token)} {token}</p>
                          <p className="text-xs text-muted-foreground">-${feeUSD.toFixed(2)}</p>
                        </div>
                      </div>
                    )}

                    <div className="flex justify-between pt-2 border-t border-border">
                      <span className="font-bold">Net Amount:</span>
                      <div className="text-right">
                        <p className="font-bold text-green-600">{formatBalance(netAmount, token)} {token}</p>
                        <p className="text-xs text-muted-foreground">${netUSD.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            onClick={onClose}
            disabled={withdrawing}
            variant="outline"
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={withdrawing}
            className="flex-1 bg-gradient-to-r from-[var(--brand-yellow)] to-[var(--brand-orange)] hover:opacity-90"
          >
            {withdrawing ? 'Processing...' : `Confirm Withdrawal${selectedTips.length > 1 ? 's' : ''}`}
          </Button>
        </div>
      </div>
    </div>
  );
}
