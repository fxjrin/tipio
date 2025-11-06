import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Sidebar from '@/components/Sidebar';
import { TrendingUp, TrendingDown, DollarSign, Users, Gift, ArrowUpRight, ArrowDownRight, Calendar, Wallet } from 'lucide-react';
import { useTokenPrices } from '@/hooks/useTokenPrices';
import { formatTokenAmount } from '@/libs/constants';
import TokenLogo from '@/components/TokenLogo';

export default function Analytics() {
  const { userProfile, anonymousBackend } = useAuth();
  const { prices, calculateUSD } = useTokenPrices();
  const [tips, setTips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalReceived: { ICP: 0n, ckBTC: 0n, ckUSDC: 0n },
    totalWithdrawn: { ICP: 0n, ckBTC: 0n, ckUSDC: 0n },
    totalTips: 0,
    uniqueDonors: 0,
    averageTip: { ICP: 0n, ckBTC: 0n, ckUSDC: 0n },
  });
  const [timeRange, setTimeRange] = useState('all'); // all, week, month, year

  const isFree = userProfile && 'Free' in userProfile.tier;

  useEffect(() => {
    const fetchAnalytics = async () => {
      if (!userProfile || !anonymousBackend) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const tipsList = await anonymousBackend.listTipsForUser(userProfile.username);

        // Ensure tipsList is an array
        if (!Array.isArray(tipsList)) {
          console.error('Tips list is not an array:', tipsList);
          setTips([]);
          setLoading(false);
          return;
        }

        setTips(tipsList);

        // Calculate statistics with safety checks
        const totals = {
          ICP: 0n,
          ckBTC: 0n,
          ckUSDC: 0n,
        };

        const withdrawn = {
          ICP: 0n,
          ckBTC: 0n,
          ckUSDC: 0n,
        };

        tipsList.forEach((tip) => {
          try {
            if (!tip || !tip.amount || !tip.token) {
              console.warn('Invalid tip data:', tip);
              return;
            }

            const amount = tip.amount;
            const token = tip.token;

            // Ensure token exists in totals
            if (!totals[token]) {
              totals[token] = 0n;
            }
            if (!withdrawn[token]) {
              withdrawn[token] = 0n;
            }

            totals[token] = totals[token] + amount;

            if (tip.withdrawn) {
              withdrawn[token] = withdrawn[token] + amount;
            }
          } catch (error) {
            console.error('Error processing tip:', tip, error);
          }
        });

        // Count unique donors, filtering out tips without 'from' field
        const uniqueDonors = new Set(
          tipsList
            .filter((tip) => tip && tip.from)
            .map((tip) => {
              try {
                return tip.from.toString();
              } catch (error) {
                console.error('Error converting from to string:', tip.from, error);
                return null;
              }
            })
            .filter((from) => from !== null)
        ).size;

        // Calculate average tips with safety
        const icpTips = tipsList.filter((t) => t && t.token === 'ICP');
        const ckBTCTips = tipsList.filter((t) => t && t.token === 'ckBTC');
        const ckUSDCTips = tipsList.filter((t) => t && t.token === 'ckUSDC');

        setStats({
          totalReceived: totals,
          totalWithdrawn: withdrawn,
          totalTips: tipsList.length,
          uniqueDonors,
          averageTip: {
            ICP: icpTips.length > 0 ? totals.ICP / BigInt(icpTips.length) : 0n,
            ckBTC: ckBTCTips.length > 0 ? totals.ckBTC / BigInt(ckBTCTips.length) : 0n,
            ckUSDC: ckUSDCTips.length > 0 ? totals.ckUSDC / BigInt(ckUSDCTips.length) : 0n,
          },
        });

        setLoading(false);
      } catch (error) {
        console.error('Error fetching analytics:', error);
        setTips([]);
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [userProfile, anonymousBackend]);

  // If user is Free tier, show upgrade prompt
  if (isFree) {
    return (
      <div className="min-h-screen bg-background flex">
        <Sidebar currentPage="analytics" userProfile={userProfile} />
        <main className="flex-1 ml-64 p-8">
          <div className="max-w-4xl mx-auto">
            <div className="text-center py-16">
              <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center">
                <TrendingUp className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-3xl font-bold mb-4">Advanced Analytics</h1>
              <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                Get detailed insights into your tips, earnings trends, and donor behavior. Upgrade to Premium to unlock this feature.
              </p>
              <div className="bg-card rounded-2xl p-8 border border-border max-w-md mx-auto">
                <h3 className="font-bold mb-4">Premium Features Include:</h3>
                <div className="space-y-3 text-left">
                  <div className="flex items-start gap-3">
                    <TrendingUp className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-sm">Revenue Trends</p>
                      <p className="text-xs text-muted-foreground">Track your earnings over time</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Users className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-sm">Donor Insights</p>
                      <p className="text-xs text-muted-foreground">Understand your supporters</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <DollarSign className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-sm">Token Breakdown</p>
                      <p className="text-xs text-muted-foreground">See which tokens you receive most</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const formatBalance = (amount, token) => {
    const decimals = token === 'ICP' ? 8 : token === 'ckBTC' ? 8 : 6;
    return formatTokenAmount(amount, decimals);
  };

  const calculateTotalUSD = (totals) => {
    const icpUSD = calculateUSD(Number(totals.ICP) / 100000000, 'ICP');
    const btcUSD = calculateUSD(Number(totals.ckBTC) / 100000000, 'ckBTC');
    const usdcUSD = calculateUSD(Number(totals.ckUSDC) / 1000000, 'ckUSDC');
    return icpUSD + btcUSD + usdcUSD;
  };

  const totalReceivedUSD = calculateTotalUSD(stats.totalReceived);
  const totalWithdrawnUSD = calculateTotalUSD(stats.totalWithdrawn);

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex">
        <Sidebar currentPage="analytics" userProfile={userProfile} />
        <main className="flex-1 ml-64 p-8">
          <div className="flex items-center justify-center h-[80vh]">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-[var(--brand-yellow)] to-[var(--brand-orange)] rounded-full flex items-center justify-center animate-pulse">
                <TrendingUp className="w-8 h-8 text-white" />
              </div>
              <p className="text-muted-foreground">Loading analytics...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar currentPage="analytics" userProfile={userProfile} />

      <main className="flex-1 ml-64 p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-[var(--brand-yellow)]" />
            Analytics
          </h1>
          <p className="text-muted-foreground mt-1">Detailed insights into your earnings</p>
        </div>

        {/* Time Range Filter */}
        <div className="mb-6 flex gap-2">
          {['all', 'week', 'month', 'year'].map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                timeRange === range
                  ? 'bg-[var(--brand-yellow)] text-black'
                  : 'bg-card border border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              {range === 'all' ? 'All Time' : range === 'week' ? 'This Week' : range === 'month' ? 'This Month' : 'This Year'}
            </button>
          ))}
        </div>

        <div className="max-w-7xl space-y-6">
          {/* Overview Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Received */}
            <div className="bg-card rounded-2xl p-6 border border-border">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-muted-foreground">Total Received</p>
                <ArrowDownRight className="w-5 h-5 text-green-500" />
              </div>
              <p className="text-2xl font-bold text-foreground mb-1">
                ${totalReceivedUSD.toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground">Across all tokens</p>
            </div>

            {/* Total Withdrawn */}
            <div className="bg-card rounded-2xl p-6 border border-border">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-muted-foreground">Total Withdrawn</p>
                <ArrowUpRight className="w-5 h-5 text-blue-500" />
              </div>
              <p className="text-2xl font-bold text-foreground mb-1">
                ${totalWithdrawnUSD.toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground">Transferred to wallet</p>
            </div>

            {/* Total Tips */}
            <div className="bg-card rounded-2xl p-6 border border-border">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-muted-foreground">Total Tips</p>
                <Gift className="w-5 h-5 text-purple-500" />
              </div>
              <p className="text-2xl font-bold text-foreground mb-1">{stats.totalTips}</p>
              <p className="text-xs text-muted-foreground">All time contributions</p>
            </div>

            {/* Unique Donors */}
            <div className="bg-card rounded-2xl p-6 border border-border">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-muted-foreground">Unique Donors</p>
                <Users className="w-5 h-5 text-orange-500" />
              </div>
              <p className="text-2xl font-bold text-foreground mb-1">{stats.uniqueDonors}</p>
              <p className="text-xs text-muted-foreground">Different supporters</p>
            </div>
          </div>

          {/* Token Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Received by Token */}
            <div className="bg-card rounded-2xl p-6 border border-border">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Wallet className="w-5 h-5 text-[var(--brand-yellow)]" />
                Received by Token
              </h3>
              <div className="space-y-4">
                {['ICP', 'ckBTC', 'ckUSDC'].map((token) => {
                  const amount = stats.totalReceived[token];
                  const decimals = token === 'ICP' ? 8 : token === 'ckBTC' ? 8 : 6;
                  const usdValue = calculateUSD(Number(amount) / Math.pow(10, decimals), token);

                  return (
                    <div key={token} className="flex items-center justify-between p-4 bg-muted/30 rounded-xl">
                      <div className="flex items-center gap-3">
                        <TokenLogo symbol={token} size={40} />
                        <div>
                          <p className="font-bold text-foreground">{formatBalance(amount, token)} {token}</p>
                          <p className="text-sm text-muted-foreground">${usdValue.toFixed(2)}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">
                          {tips.filter((t) => t.token === token).length} tips
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Average Tip by Token */}
            <div className="bg-card rounded-2xl p-6 border border-border">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-[var(--brand-yellow)]" />
                Average Tip Amount
              </h3>
              <div className="space-y-4">
                {['ICP', 'ckBTC', 'ckUSDC'].map((token) => {
                  const avgAmount = stats.averageTip[token];
                  const decimals = token === 'ICP' ? 8 : token === 'ckBTC' ? 8 : 6;
                  const usdValue = calculateUSD(Number(avgAmount) / Math.pow(10, decimals), token);

                  return (
                    <div key={token} className="flex items-center justify-between p-4 bg-muted/30 rounded-xl">
                      <div className="flex items-center gap-3">
                        <TokenLogo symbol={token} size={40} />
                        <div>
                          <p className="font-bold text-foreground">{formatBalance(avgAmount, token)} {token}</p>
                          <p className="text-sm text-muted-foreground">${usdValue.toFixed(2)}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">per tip</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-card rounded-2xl p-6 border border-border">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[var(--brand-yellow)]" />
              Recent Tips
            </h3>
            {tips.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
                  <Gift className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground mb-2 font-semibold">
                  No tips yet
                </p>
                <p className="text-xs text-muted-foreground">
                  Share your link to start receiving tips!
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {tips.slice(0, 10).map((tip) => {
                  try {
                    const decimals = tip.token === 'ICP' ? 8 : tip.token === 'ckBTC' ? 8 : 6;
                    const usdValue = calculateUSD(Number(tip.amount) / Math.pow(10, decimals), tip.token);
                    const date = new Date(Number(tip.createdAt) / 1000000);

                    return (
                      <div key={tip.id} className="flex items-center justify-between p-4 bg-muted/30 rounded-xl hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-3">
                          <TokenLogo symbol={tip.token} size={32} />
                          <div>
                            <p className="font-bold text-sm">{formatBalance(tip.amount, tip.token)} {tip.token}</p>
                            <p className="text-xs text-muted-foreground">${usdValue.toFixed(2)}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">
                            {date.toLocaleDateString()}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {date.toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    );
                  } catch (error) {
                    console.error('Error rendering tip:', tip.id, error);
                    return null;
                  }
                })}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
