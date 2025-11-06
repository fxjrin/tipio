import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Gift, Download, Filter } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import TokenLogo from '@/components/TokenLogo';
import { formatTokenAmount, formatUSDAmount } from '@/libs/constants';
import { useTokenPrices } from '@/hooks/useTokenPrices';
import TipioLoader from '@/components/TipioLoader';

export default function Activity() {
  const { anonymousBackend, userProfile } = useAuth();
  const [tips, setTips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [balances, setBalances] = useState({});
  const [activeFilter, setActiveFilter] = useState('all'); // all, received, withdrawn
  const { prices, calculateUSD } = useTokenPrices();

  useEffect(() => {
    const fetchData = async () => {
      if (!userProfile || !anonymousBackend) return;

      try {
        // Fetch tips
        const tipsList = await anonymousBackend.listTipsForUser(userProfile.username);
        setTips(tipsList);

        // Fetch balances (for authenticated user, need identity actor)
        // For now, just show tips
        setLoading(false);
      } catch (error) {
        console.error('Error fetching activity:', error);
        setLoading(false);
      }
    };

    fetchData();
  }, [userProfile, anonymousBackend]);

  const getTokenDecimals = (token) => {
    return token === 'ICP' ? 8 : token === 'ckBTC' ? 8 : 6;
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(Number(timestamp) / 1000000);

    const dateStr = date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });

    const timeStr = date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });

    return `${dateStr} • ${timeStr}`;
  };

  const filteredTips = tips
    .filter(tip => {
      if (activeFilter === 'all') return true;
      if (activeFilter === 'received') return 'Received' in tip.status;
      if (activeFilter === 'withdrawn') return 'Withdrawn' in tip.status;
      return true;
    })
    .sort((a, b) => {
      const timeA = typeof a.createdAt === 'bigint' ? Number(a.createdAt) : Number(a.createdAt || 0);
      const timeB = typeof b.createdAt === 'bigint' ? Number(b.createdAt) : Number(b.createdAt || 0);
      return timeB - timeA;
    });

  if (!userProfile) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <Sidebar currentPage="activities" userProfile={userProfile} />

      {/* Main Content */}
      <main className="flex-1 ml-64 p-8">
        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Activity</h1>
          <p className="text-muted-foreground mt-1">View all your tip transactions</p>
        </div>

        {/* Content */}
        <div className="max-w-4xl mx-auto">
          {/* Filter Tabs */}
          <div className="bg-card rounded-2xl p-6 border border-border mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Filter className="w-5 h-5 text-muted-foreground" />
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Filter</h3>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => setActiveFilter('all')}
                variant={activeFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                className={activeFilter === 'all' ? 'bg-gradient-to-r from-[var(--brand-yellow)] to-[var(--brand-orange)]' : ''}
              >
                All Tips
              </Button>
              <Button
                onClick={() => setActiveFilter('received')}
                variant={activeFilter === 'received' ? 'default' : 'outline'}
                size="sm"
                className={activeFilter === 'received' ? 'bg-gradient-to-r from-green-600 to-emerald-600' : ''}
              >
                Received
              </Button>
              <Button
                onClick={() => setActiveFilter('withdrawn')}
                variant={activeFilter === 'withdrawn' ? 'default' : 'outline'}
                size="sm"
                className={activeFilter === 'withdrawn' ? 'bg-gradient-to-r from-purple-600 to-pink-600' : ''}
              >
                Withdrawn
              </Button>
            </div>
          </div>

          {/* Activity List */}
          <div className="space-y-4">
            {loading ? (
              <div className="bg-card rounded-2xl p-12 border border-border text-center">
                <TipioLoader size={60} variant="colored" />
                <p className="text-sm text-muted-foreground mt-4">Loading activity...</p>
              </div>
            ) : filteredTips.length === 0 ? (
              <div className="bg-card rounded-2xl p-12 border border-border text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
                  <Gift className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground font-semibold">No {activeFilter !== 'all' ? activeFilter : ''} tips yet</p>
                <p className="text-xs text-muted-foreground mt-2">Share your link to start receiving tips!</p>
              </div>
            ) : (
              filteredTips.map((tip, index) => (
                <div
                  key={tip.id}
                  className="bg-card rounded-xl border border-border p-6 hover:border-[var(--brand-yellow)]/50 hover:shadow-lg transition-all"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-[var(--brand-yellow)] to-[var(--brand-orange)] rounded-xl flex items-center justify-center">
                        <Gift className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">Tip #{filteredTips.length - index}</p>
                        <p className="text-xs text-muted-foreground">{formatTimestamp(tip.createdAt)}</p>
                      </div>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        'Received' in tip.status
                          ? 'bg-green-100 text-green-700 border border-green-200'
                          : 'bg-purple-100 text-purple-700 border border-purple-200'
                      }`}
                    >
                      {'Received' in tip.status ? 'Received' : 'Withdrawn'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <TokenLogo symbol={tip.token} size={40} />
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">{tip.token}</p>
                        <p className="text-2xl font-bold text-foreground">
                          {formatTokenAmount(tip.amount, getTokenDecimals(tip.token))}
                        </p>
                        {prices[tip.token] && (
                          <p className="text-sm text-muted-foreground">
                            ≈ {formatUSDAmount(calculateUSD(Number(tip.amount) / Math.pow(10, getTokenDecimals(tip.token)), tip.token))}
                          </p>
                        )}
                      </div>
                    </div>

                    {tip.message.length > 0 && (
                      <div className="ml-4 p-3 bg-blue-50 border border-blue-200 rounded-lg max-w-xs">
                        <p className="text-xs text-blue-900/70 italic">"{tip.message[0]}"</p>
                      </div>
                    )}
                  </div>

                  {/* Tip ID for reference */}
                  <div className="mt-4 pt-4 border-t border-border">
                    <p className="text-xs text-muted-foreground">
                      Tip ID: <span className="font-mono">{tip.id}</span>
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
