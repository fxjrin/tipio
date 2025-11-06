import { Home, Link2, Activity, Settings, Sparkles, CheckCircle, PartyPopper, BarChart3, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import TipioLoader from '@/components/TipioLoader';

export default function Sidebar({ currentPage = 'dashboard', userProfile, upgrading, upgradeStep, onUpgrade }) {
  const navigate = useNavigate();

  const isFree = userProfile && 'Free' in userProfile.tier;
  const isPremium = userProfile && 'Premium' in userProfile.tier;

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home, path: '/dashboard' },
    { id: 'links', label: 'Links', icon: Link2, path: '/links' },
    { id: 'activities', label: 'Activities', icon: Activity, path: '/activity' },
    { id: 'analytics', label: 'Analytics', icon: BarChart3, path: '/analytics', premium: true },
    { id: 'settings', label: 'Settings', icon: Settings, path: '/settings' },
  ];

  const handleNavigation = (path) => {
    navigate(path);
  };

  return (
    <aside className="w-64 h-screen bg-card border-r border-border flex flex-col fixed left-0 top-0">
      {/* Logo */}
      <div className="p-6 border-b border-border">
        <h1 className="text-2xl font-black bg-gradient-to-r from-[var(--brand-yellow)] via-[var(--brand-orange)] to-[var(--brand-pink)] bg-clip-text text-transparent">
          Tipio
        </h1>
        <p className="text-xs text-muted-foreground mt-1">Crypto Tip Platform</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          const isLocked = item.premium && isFree;

          return (
            <button
              key={item.id}
              onClick={() => !isLocked && handleNavigation(item.path)}
              disabled={isLocked}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                isActive
                  ? 'bg-[var(--brand-yellow)]/10 text-foreground font-semibold border-l-4 border-[var(--brand-yellow)]'
                  : isLocked
                  ? 'text-muted-foreground/50 cursor-not-allowed opacity-60'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
              {isLocked && (
                <Crown className="w-4 h-4 ml-auto text-[var(--brand-yellow)]" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom Section */}
      <div className="p-4 border-t border-border space-y-3">
        {/* Premium User Card - Only show if Premium tier */}
        {isPremium && (
          <div className="bg-gradient-to-br from-purple-500 via-purple-600 to-indigo-600 rounded-xl p-4 text-white shadow-lg border-2 border-purple-400">
            <div className="flex items-center gap-2 mb-2">
              <Crown className="w-5 h-5 text-yellow-300" />
              <h3 className="text-sm font-bold">Premium Member</h3>
            </div>
            <p className="text-xs text-white/90 mb-3">
              You have unlimited access to all features
            </p>
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center gap-1.5">
                <CheckCircle className="w-3 h-3 text-green-300" />
                <span>Unlimited withdrawals</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle className="w-3 h-3 text-green-300" />
                <span>Advanced analytics</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle className="w-3 h-3 text-green-300" />
                <span>Priority support</span>
              </div>
            </div>
          </div>
        )}

        {/* Upgrade to Premium Card - Only show if Free tier */}
        {isFree && onUpgrade && (
          <div className="bg-gradient-to-br from-[var(--brand-yellow)] via-[var(--brand-orange)] to-[var(--brand-pink)] rounded-xl p-4 text-white shadow-lg">
            {upgradeStep === 'initial' && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-5 h-5" />
                  <h3 className="text-sm font-bold">Upgrade to Premium</h3>
                </div>
                <p className="text-xs text-white/90 mb-3">
                  1 ICP for unlimited features
                </p>
                <div className="space-y-1.5 mb-3 text-xs">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle className="w-3 h-3 text-green-300" />
                    <span>Unlimited withdrawals</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle className="w-3 h-3 text-green-300" />
                    <span>Advanced analytics</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle className="w-3 h-3 text-green-300" />
                    <span>Bulk withdraw</span>
                  </div>
                </div>
                <Button
                  onClick={onUpgrade}
                  disabled={upgrading}
                  size="sm"
                  className="w-full bg-white text-[var(--brand-orange)] hover:bg-white/90 font-bold text-xs h-8"
                >
                  {upgrading ? (
                    <div className="flex items-center justify-center">
                      <TipioLoader size={16} variant="colored" />
                    </div>
                  ) : (
                    'Upgrade Now'
                  )}
                </Button>
              </div>
            )}

            {upgradeStep === 'payment' && (
              <div className="text-center py-2">
                <div className="mb-2 flex justify-center">
                  <TipioLoader size={40} variant="white" />
                </div>
                <p className="text-xs font-bold mb-1">Processing...</p>
                <p className="text-xs text-white/80">
                  Approve in wallet
                </p>
              </div>
            )}

            {upgradeStep === 'verifying' && (
              <div className="text-center py-2">
                <div className="mb-2 flex justify-center">
                  <TipioLoader size={40} variant="white" />
                </div>
                <p className="text-xs font-bold">Verifying...</p>
              </div>
            )}

            {upgradeStep === 'completed' && (
              <div className="text-center py-2">
                <div className="flex justify-center mb-2">
                  <PartyPopper className="w-10 h-10 text-yellow-300" />
                </div>
                <p className="text-xs font-bold">Welcome to Premium!</p>
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
