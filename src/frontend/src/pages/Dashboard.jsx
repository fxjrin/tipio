import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Copy, ExternalLink, QrCode, Coins, Download, Info, Wallet, User, Gift, Edit, Share2, Square, CheckSquare } from 'lucide-react';
import { HttpAgent, Actor } from '@dfinity/agent';
import { idlFactory } from '../../../declarations/backend';
import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import Sidebar from '@/components/Sidebar';
import TipioLoader, { TipioLoaderWithText } from '@/components/TipioLoader';
import { useMinimumLoadingTime } from '@/hooks/useMinimumLoadingTime';
import WalletSelectionModal from '@/components/WalletSelectionModal';
import WithdrawalConfirmModal from '@/components/WithdrawalConfirmModal';
import BulkWithdrawModal from '@/components/BulkWithdrawModal';
import QRModal from '@/components/QRModal';
import TokenLogo from '@/components/TokenLogo';
import { toast } from 'sonner';
import { useTokenPrices } from '@/hooks/useTokenPrices';
import { formatTokenAmount, formatUSDAmount } from '@/libs/constants';
import QRCodeLib from 'qrcode';

const BACKEND_CANISTER_ID = 'vtsa7-6qaaa-aaaah-arlkq-cai';

export default function Dashboard() {
  const { identity, wallet, userProfile, connectAndSaveWallet, disconnectAndRemoveWallet, anonymousBackend: contextAnonymousBackend, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [tips, setTips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [selectedTipForWithdraw, setSelectedTipForWithdraw] = useState(null);
  const [showQR, setShowQR] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState('');

  // Ensure loading shows for minimum 2 seconds for smooth animation
  const showLoading = useMinimumLoadingTime(loading);
  const anonymousBackend = contextAnonymousBackend; // Use from context instead of duplicate state

  // Real-time token prices from ICPSwap
  const { prices, calculateUSD, formatUSD } = useTokenPrices();
  const [balances, setBalances] = useState({});
  const [feeInfo, setFeeInfo] = useState({}); // Store fee breakdown for each tip
  const [loadingFees, setLoadingFees] = useState({}); // Track fee loading state per tip
  const [withdrawing, setWithdrawing] = useState({});
  const [withdrawSuccess, setWithdrawSuccess] = useState({});
  const [autoChecking, setAutoChecking] = useState(false);
  const [totalBalances, setTotalBalances] = useState({ ICP: 0n, ckBTC: 0n, ckUSDC: 0n });
  const [upgrading, setUpgrading] = useState(false);
  const [upgradeStep, setUpgradeStep] = useState('initial');
  const [activeTab, setActiveTab] = useState('all'); // all, pending, received
  const [showAllTokens, setShowAllTokens] = useState(false);

  // Bulk withdraw states
  const [bulkWithdrawMode, setBulkWithdrawMode] = useState(false);
  const [selectedTips, setSelectedTips] = useState(new Set());
  const [bulkWithdrawing, setBulkWithdrawing] = useState(false);
  const [showBulkWithdrawModal, setShowBulkWithdrawModal] = useState(false);

  // GSAP refs
  const dashboardRef = useRef(null);

  // Anonymous backend is now from context - no need to create here

  useEffect(() => {
    const fetchTips = async () => {
      if (userProfile && anonymousBackend) {
        try {
          const tipsList = await anonymousBackend.listTipsForUser(userProfile.username);
          setTips(tipsList);
        } catch (error) {
          console.error('Error fetching tips:', error);
        } finally {
          setLoading(false);
        }
      }
    };

    fetchTips();
  }, [userProfile, anonymousBackend]);

  // Auto-complete upgrade if user already paid
  useEffect(() => {
    const checkPendingUpgrade = async () => {
      if (!userProfile || !identity.backendActor || upgrading) return;

      const isUserFree = userProfile && 'Free' in userProfile.tier;
      if (!isUserFree) return;

      try {
        const result = await identity.backendActor.completeUpgrade();
        if ('ok' in result) {
          toast.success('Upgrade to Premium successful!');
          setTimeout(() => {
            window.location.reload();
          }, 1000);
        }
      } catch (error) {
        // Silently fail - no pending upgrade
      }
    };

    // Run check after a small delay to ensure backend is ready
    const timer = setTimeout(() => {
      checkPendingUpgrade();
    }, 1000);

    return () => clearTimeout(timer);
  }, [userProfile, identity.backendActor, upgrading]);

  // Auto check balance for all tips every 5 seconds using batch function
  useEffect(() => {
    const checkAllBalances = async () => {
      // Check if user is authenticated and has backend actor
      if (!identity?.backendActor || !userProfile?.username || autoChecking) return;

      setAutoChecking(true);
      let icpTotal = 0n;
      let ckbtcTotal = 0n;
      let ckusdcTotal = 0n;

      try {
        // Use authenticated backend actor from context (already created with identity)
        // This actor is authenticated with user's Internet Identity
        const authenticatedBackend = identity.backendActor;

        // Refresh tips list FIRST to ensure we have latest tip data
        const tipsList = await anonymousBackend.listTipsForUser(userProfile.username);
        setTips(tipsList);

        // Use fast function - reads cached amounts (super fast!)
        // Returns ALL non-withdrawn tips with stored amounts, no ledger query needed
        const balancesArray = await authenticatedBackend.getAllTipBalancesForUser();

        // Convert array to object and calculate totals (only non-withdrawn tips)
        const balancesObj = {};
        for (const [tipId, balance] of balancesArray) {
          // Ensure balance is BigInt
          const balanceBigInt = typeof balance === 'bigint' ? balance : BigInt(balance);
          balancesObj[tipId] = balanceBigInt;

          // Calculate totals ONLY from tips that haven't been withdrawn (balance > 0)
          if (balanceBigInt > 0n) {
            const tip = tipsList.find(t => t.id === tipId);
            // Only count if tip exists and NOT withdrawn
            if (tip && !('Withdrawn' in tip.status)) {
              // Add to totals
              if (tip.token === 'ICP') {
                icpTotal += balanceBigInt;
              } else if (tip.token === 'ckBTC') {
                ckbtcTotal += balanceBigInt;
              } else if (tip.token === 'ckUSDC') {
                ckusdcTotal += balanceBigInt;
              }
            }
          }
        }

        setBalances(balancesObj);
        setTotalBalances({ ICP: icpTotal, ckBTC: ckbtcTotal, ckUSDC: ckusdcTotal });
      } catch (error) {
        console.error('Error in batch balance check:', error);
      } finally {
        setAutoChecking(false);
      }
    };

    checkAllBalances();

    const interval = setInterval(checkAllBalances, 5000);

    return () => clearInterval(interval);
  }, [identity?.backendActor, anonymousBackend, userProfile?.username]);

  // GSAP animations - hanya jalan setelah loading minimum time selesai
  useEffect(() => {
    if (!showLoading && userProfile) {
      // Small delay to ensure DOM is fully rendered
      const timer = setTimeout(() => {
        const ctx = gsap.context(() => {
          // Animate dashboard cards (always exist)
          const cards = document.querySelectorAll('.dashboard-card');
          if (cards.length > 0) {
            gsap.set('.dashboard-card', { opacity: 1, y: 0 });
            gsap.from('.dashboard-card', {
              y: 20,
              opacity: 0,
              duration: 0.5,
              stagger: 0.08,
              ease: 'power2.out',
              delay: 0.1
            });
          }

          // Animate tip items ONLY if they exist
          const tipItems = document.querySelectorAll('.tip-item');
          if (tipItems.length > 0) {
            gsap.set('.tip-item', { opacity: 1, x: 0 });
            gsap.from('.tip-item', {
              x: -10,
              opacity: 0,
              duration: 0.4,
              stagger: 0.05,
              ease: 'power2.out',
              delay: 0.5
            });
          }
        }, dashboardRef);

        return () => ctx.revert();
      }, 50); // 50ms delay for DOM rendering

      return () => clearTimeout(timer);
    }
  }, [showLoading, userProfile, tips.length]);

  const copyTipLink = () => {
    const tipLink = `${window.location.origin}/${userProfile.username}`;
    navigator.clipboard.writeText(tipLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareTipLink = async () => {
    const tipLink = `${window.location.origin}/${userProfile.username}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Send me a tip on Tipio',
          text: `Support me on Tipio!`,
          url: tipLink,
        });
      } catch (error) {
        // Error sharing, fallback to copy
      }
    } else {
      copyTipLink();
    }
  };

  const generateQR = async () => {
    try {
      const tipLink = `${window.location.origin}/${userProfile.username}`;
      const url = await QRCodeLib.toDataURL(tipLink, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });
      setQrDataUrl(url);
      setShowQR(true);
    } catch (error) {
      toast.error('Failed to generate QR code');
    }
  };

  const downloadQR = () => {
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `tipio-${userProfile.username}.png`;
    link.click();
  };

  const handleWithdrawClick = async (tipId) => {
    // Check if wallet principal is saved in profile
    if (!userProfile?.walletPrincipal || !userProfile?.walletPrincipal[0]) {
      toast.error('Please connect a wallet first');
      setShowWalletModal(true);
      return;
    }

    // Find tip and check if balance exists
    const tip = tips.find(t => t.id === tipId);
    if (!tip || !balances[tipId]) {
      toast.error('Balance not loaded yet');
      return;
    }

    // Lazy load fees if not already loaded
    if (!feeInfo[tipId]) {
      setLoadingFees(prev => ({ ...prev, [tipId]: true }));
      try {
        const fees = await anonymousBackend.calculateWithdrawalFees(balances[tipId], tip.tokenCanisterId);
        setFeeInfo(prev => ({ ...prev, [tipId]: fees }));
      } catch (error) {
        console.error('Error calculating fees:', error);
        toast.error('Failed to calculate fees');
        setLoadingFees(prev => ({ ...prev, [tipId]: false }));
        return;
      } finally {
        setLoadingFees(prev => ({ ...prev, [tipId]: false }));
      }
    }

    // Show confirmation modal
    setSelectedTipForWithdraw(tipId);
    setShowWithdrawModal(true);
  };

  const handleWithdrawConfirm = async () => {
    const tipId = selectedTipForWithdraw;
    if (!tipId) return;

    setWithdrawing(prev => ({ ...prev, [tipId]: true }));

    try {
      // Check if wallet is currently connected (not just saved in backend)
      let reconnectedAgent = null;
      if (!wallet.isConnected) {
        toast.info('Reconnecting wallet...', { duration: 2000 });

        try {
          // Auto-reconnect using saved wallet type
          const connection = await wallet.connect(userProfile.walletType[0]);
          reconnectedAgent = connection.agent; // Store agent from reconnection

          toast.success('Wallet reconnected!');
        } catch (error) {
          console.error('Failed to reconnect wallet:', error);
          toast.error('Failed to reconnect wallet. Please connect manually.');
          setWithdrawing(prev => ({ ...prev, [tipId]: false }));
          setShowWithdrawModal(false);
          setShowWalletModal(true);
          return;
        }
      }

      // Now wallet is connected, proceed with withdrawal
      // Use reconnected agent if available (avoids race condition)
      const walletActor = reconnectedAgent
        ? await wallet.createWalletActor({ agent: reconnectedAgent, type: userProfile.walletType[0] })
        : await wallet.createWalletActor();
      const result = await walletActor.withdrawTip(tipId);

      if ('ok' in result) {
        setWithdrawSuccess(prev => ({ ...prev, [tipId]: true }));
        toast.success('Withdrawal successful!');

        // Close modal
        setShowWithdrawModal(false);
        setSelectedTipForWithdraw(null);

        // Refresh profile to update withdraw count
        await refreshProfile();

        const tipsList = await anonymousBackend.listTipsForUser(userProfile.username);
        setTips(tipsList);

        setTimeout(() => {
          setWithdrawSuccess(prev => ({ ...prev, [tipId]: false }));
        }, 5000);
      } else {
        toast.error(result.err);
      }
    } catch (error) {
      console.error('Error withdrawing:', error);
      toast.error(error.message || 'Failed to withdraw');
    } finally {
      setWithdrawing(prev => ({ ...prev, [tipId]: false }));
    }
  };

  const handleUpgradeToPremium = async () => {
    // Check if wallet principal is saved in profile
    if (!userProfile?.walletPrincipal || !userProfile?.walletPrincipal[0]) {
      toast.error('Please connect a wallet first');
      setShowWalletModal(true);
      return;
    }

    setUpgrading(true);
    setUpgradeStep('payment');

    try {
      // Check if wallet is currently connected (not just saved in backend)
      let reconnectedAgent = null;
      if (!wallet.isConnected) {
        toast.info('Reconnecting wallet...', { duration: 2000 });

        try {
          const connection = await wallet.connect(userProfile.walletType[0]);
          reconnectedAgent = connection.agent; // Store agent from reconnection

          toast.success('Wallet reconnected!');

          // Wait a bit for wallet state to update
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
          console.error('Failed to reconnect wallet:', error);
          toast.error('Failed to reconnect wallet. Please connect manually.');
          setUpgrading(false);
          setUpgradeStep('initial');
          setShowWalletModal(true);
          return;
        }
      }

      // Verify wallet is connected before proceeding
      if (!wallet.isConnected && !reconnectedAgent) {
        toast.error('Wallet connection required. Please connect your wallet.');
        setShowWalletModal(true);
        setUpgrading(false);
        setUpgradeStep('initial');
        return;
      }

      // Now wallet is connected, proceed with upgrade
      // Use II actor for requestUpgrade (it's a profile operation)
      const result = await identity.backendActor.requestUpgrade();

      if ('err' in result) {
        // Check if error is actually a success message (auto-completed)
        if (result.err.includes('completed successfully')) {
          setUpgradeStep('completed');
          toast.success(result.err);
          setTimeout(() => {
            window.location.reload();
          }, 1000);
          return;
        }
        toast.error(result.err);
        setUpgradeStep('initial');
        setUpgrading(false);
        return;
      }

      const upgradeInfo = result.ok;

      // Use wallet's ledger canister for transfer
      // If we just reconnected, the wallet state should be updated now
      const ledger = wallet.getLedgerCanister('ICP');

      const amount = 100000000n; // 1 ICP
      const icpFee = 10000n; // 0.0001 ICP standard fee

      // Skip balance check for Oisy (it opens popup and may be blocked)
      // For other wallets, check balance first
      if (userProfile.walletType[0] !== 'Oisy') {
        try {
          const balance = await ledger.balance({
            owner: wallet.walletPrincipal,
            certified: false
          });

          if (balance < amount + icpFee) {
            const balanceICP = Number(balance) / 100000000;
            toast.error(`Insufficient ICP balance. You have ${balanceICP.toFixed(8)} ICP, but need 1.0001 ICP (1 ICP + fee).`);
            setUpgrading(false);
            setUpgradeStep('initial');
            return;
          }
        } catch (error) {
          console.error('Error checking balance:', error);
          // Continue anyway - let the transfer fail with proper error
        }
      }

      toast.info('Please approve the transaction in your wallet...', { duration: 5000 });

      const blockIndex = await ledger.transfer({
        to: {
          owner: upgradeInfo.canisterPrincipal,
          subaccount: [upgradeInfo.subaccount]
        },
        amount: amount,
      });

      setUpgradeStep('verifying');

      // Use wallet actor for completeUpgrade (requires wallet signature)
      // Use reconnected agent if available (avoids race condition)
      const walletActor = reconnectedAgent
        ? await wallet.createWalletActor({ agent: reconnectedAgent, type: userProfile.walletType[0] })
        : await wallet.createWalletActor();
      const completeResult = await walletActor.completeUpgradeInternal();

      if ('ok' in completeResult) {
        setUpgradeStep('completed');
        toast.success('Upgrade completed successfully!');
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        toast.error(completeResult.err);
        setUpgradeStep('initial');
      }
    } catch (error) {
      console.error('Error upgrading:', error);

      // Better error messages based on error type
      let errorMessage = 'Failed to upgrade. Please try again.';

      if (error.message.includes('Wallet not connected')) {
        errorMessage = 'Wallet connection lost. Please reconnect your wallet and try again.';
        setShowWalletModal(true);
      } else if (error.message.includes('Signer window could not be opened') || error.message.includes('popup')) {
        errorMessage = 'Popup blocked! Please allow popups for this site and try again. Check your browser settings or address bar for popup blocker icon.';
      } else if (error.message.includes('InsufficientFunds') || error.message.includes('insufficient')) {
        errorMessage = 'Insufficient ICP balance. You need at least 1.0001 ICP (including fees).';
      } else if (error.message.includes('User rejected') || error.message.includes('rejected') || error.message.includes('denied')) {
        errorMessage = 'Transaction cancelled by user.';
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast.error(errorMessage, { duration: 5000 });
      setUpgradeStep('initial');
    } finally {
      setUpgrading(false);
    }
  };

  const formatBalance = (balance, token) => {
    const decimals = token === 'ICP' ? 8 : token === 'ckBTC' ? 8 : 6;
    return `${formatTokenAmount(balance, decimals)} ${token}`;
  };

  const getTokenDecimals = (token) => {
    return token === 'ICP' ? 8 : token === 'ckBTC' ? 8 : 6;
  };

  // Bulk withdraw functions
  const toggleTipSelection = (tipId) => {
    setSelectedTips((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(tipId)) {
        newSet.delete(tipId);
      } else {
        newSet.add(tipId);
      }
      return newSet;
    });
  };

  const selectAllTips = () => {
    const withdrawableTips = filteredTips.filter((tip) => {
      // Must be received status
      if (!('Received' in tip.status)) return false;

      // Must not be withdrawn already
      if (tip.withdrawn) return false;

      // Must have balance loaded
      if (!balances[tip.id]) return false;

      // Balance must be greater than 0
      if (balances[tip.id] <= 0n) return false;

      return true;
    });

    setSelectedTips(new Set(withdrawableTips.map((tip) => tip.id)));

    // Show feedback
    if (withdrawableTips.length === 0) {
      toast.info('No withdrawable tips available');
    } else {
      toast.success(`Selected ${withdrawableTips.length} tip${withdrawableTips.length > 1 ? 's' : ''}`);
    }
  };

  const deselectAllTips = () => {
    setSelectedTips(new Set());
  };

  const handleBulkWithdraw = async () => {
    if (selectedTips.size === 0) {
      toast.error('Please select at least one tip to withdraw');
      return;
    }

    // Check if wallet is connected
    if (!userProfile?.walletPrincipal || !userProfile?.walletPrincipal[0]) {
      toast.error('Please connect a wallet first');
      setShowWalletModal(true);
      return;
    }

    setShowBulkWithdrawModal(true);
  };

  const confirmBulkWithdraw = async () => {
    setBulkWithdrawing(true);
    setShowBulkWithdrawModal(false);

    let successCount = 0;
    let failCount = 0;
    const tipIds = Array.from(selectedTips);

    for (const tipId of tipIds) {
      try {
        const tip = tips.find((t) => t.id === tipId);
        if (!tip || !balances[tipId]) continue;

        // Calculate fees if not already loaded
        if (!feeInfo[tipId]) {
          const fees = await anonymousBackend.calculateWithdrawalFees(balances[tipId], tip.tokenCanisterId);
          setFeeInfo((prev) => ({ ...prev, [tipId]: fees }));
        }

        // Perform withdrawal
        const result = await identity.backendActor.withdrawTip(tipId);

        if ('ok' in result) {
          successCount++;
          setWithdrawSuccess((prev) => ({ ...prev, [tipId]: true }));

          // Remove from selected tips
          setSelectedTips((prev) => {
            const newSet = new Set(prev);
            newSet.delete(tipId);
            return newSet;
          });
        } else {
          failCount++;
          console.error(`Failed to withdraw tip ${tipId}:`, result.err);
        }
      } catch (error) {
        failCount++;
        console.error(`Error withdrawing tip ${tipId}:`, error);
      }
    }

    // Refresh profile and tips
    await refreshProfile();
    const tipsList = await anonymousBackend.listTipsForUser(userProfile.username);
    setTips(tipsList);

    setBulkWithdrawing(false);

    if (successCount > 0) {
      toast.success(`Successfully withdrew ${successCount} tip${successCount > 1 ? 's' : ''}!`);
    }
    if (failCount > 0) {
      toast.error(`Failed to withdraw ${failCount} tip${failCount > 1 ? 's' : ''}`);
    }

    // Exit bulk mode if all done
    if (selectedTips.size === 0) {
      setBulkWithdrawMode(false);
    }
  };

  const formatTimestamp = (timestamp) => {
    // Convert nanoseconds to milliseconds
    const date = new Date(Number(timestamp) / 1000000);

    // Format: "Jan 5, 2025 • 14:30:45"
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

  const isPremium = userProfile && 'Premium' in userProfile.tier;
  const isFree = userProfile && 'Free' in userProfile.tier;

  if (!userProfile) {
    return null;
  }

  const tipLink = `${window.location.origin}/${userProfile.username}`;

  // Filter tips based on active tab and sort by createdAt (newest first)
  const filteredTips = tips
    .filter(tip => {
      if (activeTab === 'all') return true;
      if (activeTab === 'received') return 'Received' in tip.status;
      if (activeTab === 'withdrawn') return 'Withdrawn' in tip.status;
      return true;
    })
    .sort((a, b) => {
      // Sort by createdAt descending (newest first)
      // createdAt is in nanoseconds from IC
      const timeA = typeof a.createdAt === 'bigint' ? Number(a.createdAt) : Number(a.createdAt || 0);
      const timeB = typeof b.createdAt === 'bigint' ? Number(b.createdAt) : Number(b.createdAt || 0);

      return timeB - timeA;
    });

  return (
    <div ref={dashboardRef} className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <Sidebar
        currentPage="dashboard"
        userProfile={userProfile}
        upgrading={upgrading}
        upgradeStep={upgradeStep}
        onUpgrade={handleUpgradeToPremium}
      />

      {/* Main Content */}
      <main className="flex-1 ml-64 p-8">
        {/* Page Title with Avatar */}
        <div className="mb-8 flex items-center gap-4">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{ backgroundColor: userProfile.avatarBackgroundColor || '#f7931a' }}
          >
            {userProfile.avatarEmoji ? (
              <span className="text-3xl">{userProfile.avatarEmoji}</span>
            ) : (
              <User className="w-8 h-8 text-white" />
            )}
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground">Welcome back, @{userProfile.username}!</p>
          </div>
        </div>


        {/* Main Content - Vertical Centered Layout */}
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Stealth Balance Card - PIVY Style */}
          <div className="dashboard-card bg-card rounded-2xl p-6 border-2 border-[var(--brand-yellow)] shadow-lg">
              <div className="mb-2">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  Your Stealth Balances
                  <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                </h2>
              </div>

              {/* Total USD */}
              <div className="mb-6">
                <p className="text-5xl font-black bg-gradient-to-r from-[var(--brand-yellow)] via-[var(--brand-orange)] to-[var(--brand-pink)] bg-clip-text text-transparent">
                  {formatUSDAmount(
                    calculateUSD(Number(totalBalances.ICP) / 100000000, 'ICP') +
                    calculateUSD(Number(totalBalances.ckBTC) / 100000000, 'ckBTC') +
                    calculateUSD(Number(totalBalances.ckUSDC) / 1000000, 'ckUSDC')
                  )}
                </p>
                <p className="text-sm text-muted-foreground mt-1">USD</p>
              </div>

              {/* Tokens Section Header */}
              <h3 className="text-sm font-semibold text-muted-foreground mb-3">Tokens</h3>

              {/* Main 3 Tokens - Always Visible */}
              <div className="space-y-3">
                {/* ICP Token */}
                <div className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <TokenLogo symbol="ICP" size={32} />
                    <div>
                      <p className="font-semibold text-sm">ICP</p>
                      <p className="text-xs text-muted-foreground">
                        {prices.ICP ? `$${prices.ICP.toFixed(2)}` : 'Internet Computer'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-foreground">
                      {formatTokenAmount(totalBalances.ICP, 8)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatUSDAmount(calculateUSD(Number(totalBalances.ICP) / 100000000, 'ICP'))}
                    </p>
                  </div>
                </div>

                {/* ckBTC Token */}
                <div className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <TokenLogo symbol="ckBTC" size={32} />
                    <div>
                      <p className="font-semibold text-sm">ckBTC</p>
                      <p className="text-xs text-muted-foreground">
                        {prices.ckBTC ? `$${prices.ckBTC.toFixed(2)}` : 'Chain Key Bitcoin'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-foreground">
                      {formatTokenAmount(totalBalances.ckBTC, 8)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatUSDAmount(calculateUSD(Number(totalBalances.ckBTC) / 100000000, 'ckBTC'))}
                    </p>
                  </div>
                </div>

                {/* ckUSDC Token */}
                <div className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <TokenLogo symbol="ckUSDC" size={32} />
                    <div>
                      <p className="font-semibold text-sm">ckUSDC</p>
                      <p className="text-xs text-muted-foreground">$1.00</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-foreground">
                      {formatTokenAmount(totalBalances.ckUSDC, 6)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatUSDAmount(calculateUSD(Number(totalBalances.ckUSDC) / 1000000, 'ckUSDC'))}
                    </p>
                  </div>
                </div>
              </div>
          </div>

          {/* Wallet Connection Card - Only show if not connected */}
          {(!userProfile?.walletPrincipal || !userProfile?.walletPrincipal[0]) && (
            <div className="dashboard-card bg-card rounded-2xl p-6 border-2 border-border">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Wallet className="w-5 h-5" />
                Wallet Connection
              </h2>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Connect a wallet to withdraw your tips and upgrade to Premium
                </p>
                <Button
                  onClick={() => setShowWalletModal(true)}
                  className="w-full bg-gradient-to-r from-[var(--brand-yellow)] to-[var(--brand-orange)] hover:opacity-90"
                >
                  <Wallet className="w-4 h-4 mr-2" />
                  Connect Wallet
                </Button>
              </div>
            </div>
          )}

          {/* Personal Link Card */}
          <div className="dashboard-card bg-card rounded-2xl p-6 border border-border">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-lg font-bold">Your Personal Link</h2>
                  <p className="text-sm text-muted-foreground">Share to get paid</p>
                </div>
                <Button
                  onClick={() => navigate('/settings')}
                  variant="outline"
                  size="sm"
                  className="hover:bg-[var(--brand-yellow)] hover:text-black hover:border-[var(--brand-yellow)] transition-colors"
                >
                  <Edit className="h-3 w-3 mr-1" />
                  Edit Profile
                </Button>
              </div>

              {/* Profile Preview with Avatar */}
              <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-muted/40 to-muted/20 rounded-xl mb-3 border border-border">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center text-2xl shadow-lg flex-shrink-0"
                  style={{ backgroundColor: userProfile.avatarBackgroundColor || '#f7931a' }}
                >
                  {userProfile.avatarEmoji || '👤'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-lg font-bold text-foreground">@{userProfile.username}</p>
                  <p className="text-sm text-muted-foreground font-mono truncate">
                    tipio.io/{userProfile.username}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button
                  onClick={copyTipLink}
                  variant="outline"
                  className="flex-1 hover:bg-[var(--brand-yellow)] hover:text-black hover:border-[var(--brand-yellow)] transition-colors"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  {copied ? 'Copied!' : 'Copy Link'}
                </Button>
                <Button
                  onClick={shareTipLink}
                  variant="outline"
                  className="hover:bg-[var(--brand-yellow)] hover:text-black hover:border-[var(--brand-yellow)] transition-colors"
                >
                  <Share2 className="h-4 w-4" />
                </Button>
                <Button
                  onClick={generateQR}
                  variant="outline"
                  className="hover:bg-[var(--brand-yellow)] hover:text-black hover:border-[var(--brand-yellow)] transition-colors"
                >
                  <QrCode className="h-4 w-4" />
                </Button>
                <Button
                  onClick={() => window.open(`${window.location.origin}/${userProfile.username}`, '_blank')}
                  variant="outline"
                  className="hover:bg-[var(--brand-yellow)] hover:text-black hover:border-[var(--brand-yellow)] transition-colors"
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
            </div>
          </div>

          {/* Tips Activity */}
          <div className="dashboard-card bg-card rounded-2xl p-6 border border-border">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">Activity</h2>

                {/* Bulk Withdraw Controls - Only for Premium users */}
                {userProfile && 'Premium' in userProfile.tier && filteredTips.some(tip => !tip.withdrawn && balances[tip.id] && balances[tip.id] > 0n) && (
                  <div className="flex items-center gap-2">
                    {!bulkWithdrawMode ? (
                      <Button
                        onClick={() => setBulkWithdrawMode(true)}
                        size="sm"
                        variant="outline"
                        className="hover:bg-[var(--brand-yellow)] hover:text-black hover:border-[var(--brand-yellow)]"
                      >
                        Bulk Withdraw
                      </Button>
                    ) : (
                      <>
                        <Button
                          onClick={selectAllTips}
                          size="sm"
                          variant="outline"
                          className="text-xs"
                        >
                          Select All
                        </Button>
                        <Button
                          onClick={deselectAllTips}
                          size="sm"
                          variant="outline"
                          className="text-xs"
                        >
                          Deselect All
                        </Button>
                        <Button
                          onClick={handleBulkWithdraw}
                          size="sm"
                          disabled={selectedTips.size === 0 || bulkWithdrawing}
                          className="bg-gradient-to-r from-[var(--brand-yellow)] to-[var(--brand-orange)] hover:opacity-90"
                        >
                          {bulkWithdrawing ? 'Processing...' : `Withdraw (${selectedTips.size})`}
                        </Button>
                        <Button
                          onClick={() => {
                            setBulkWithdrawMode(false);
                            setSelectedTips(new Set());
                          }}
                          size="sm"
                          variant="ghost"
                          className="text-xs"
                        >
                          Cancel
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Tabs */}
              <div className="flex gap-2 mb-4 border-b border-border">
                <button
                  onClick={() => setActiveTab('all')}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    activeTab === 'all'
                      ? 'border-b-2 border-[var(--brand-yellow)] text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setActiveTab('received')}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    activeTab === 'received'
                      ? 'border-b-2 border-[var(--brand-yellow)] text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Received
                </button>
                <button
                  onClick={() => setActiveTab('withdrawn')}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    activeTab === 'withdrawn'
                      ? 'border-b-2 border-[var(--brand-yellow)] text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Withdrawn
                </button>
              </div>

              {/* Tips List */}
              {showLoading ? (
                <div className="text-center py-12">
                  <TipioLoaderWithText text="Loading tips..." size={60} variant="colored" />
                </div>
              ) : filteredTips.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
                    <Coins className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground mb-2 font-semibold">
                    No {activeTab !== 'all' ? activeTab : ''} tips yet
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Share your link to start receiving tips!
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                  {filteredTips.map((tip, index) => {
                    // Check if tip is withdrawable with all conditions
                    const isWithdrawable =
                      'Received' in tip.status &&
                      !tip.withdrawn &&
                      balances[tip.id] &&
                      balances[tip.id] > 0n;

                    const isSelected = selectedTips.has(tip.id);

                    return (
                    <div
                      key={tip.id}
                      className={`bg-card border rounded-xl overflow-hidden hover:border-[var(--brand-yellow)]/50 hover:shadow-lg transition-all ${
                        isSelected ? 'border-[var(--brand-yellow)] shadow-lg' : 'border-border'
                      } ${bulkWithdrawMode && !isWithdrawable ? 'opacity-50' : ''}`}
                    >
                      {/* Header */}
                      <div className="px-5 py-3 bg-gradient-to-r from-muted/30 to-muted/10 border-b border-border flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {/* Checkbox for bulk withdraw */}
                          {bulkWithdrawMode && isWithdrawable && (
                            <button
                              onClick={() => toggleTipSelection(tip.id)}
                              className="hover:scale-110 transition-transform"
                            >
                              {isSelected ? (
                                <CheckSquare className="w-5 h-5 text-[var(--brand-yellow)]" />
                              ) : (
                                <Square className="w-5 h-5 text-muted-foreground" />
                              )}
                            </button>
                          )}

                          <div className="w-10 h-10 bg-gradient-to-br from-[var(--brand-yellow)] to-[var(--brand-orange)] rounded-xl flex items-center justify-center shadow-md">
                            <Gift className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">
                              {formatTimestamp(tip.createdAt)}
                            </p>
                          </div>
                        </div>
                        <span
                          className={`px-3 py-1.5 rounded-full text-xs font-semibold ${
                            'Pending' in tip.status
                              ? 'bg-amber-100 text-amber-700 border border-amber-200'
                              : 'Received' in tip.status
                              ? 'bg-green-100 text-green-700 border border-green-200'
                              : 'bg-purple-100 text-purple-700 border border-purple-200'
                          }`}
                        >
                          {'Pending' in tip.status ? 'Pending' : 'Received' in tip.status ? 'Received' : 'Withdrawn'}
                        </span>
                      </div>

                      {/* Content */}
                      <div className="p-5">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            {/* Token & Amount */}
                            <div className="flex items-center gap-4 mb-4">
                              <TokenLogo symbol={tip.token} size={40} />
                              <div>
                                <p className="text-sm text-muted-foreground font-medium mb-0.5">{tip.token}</p>
                                {balances[tip.id] !== undefined ? (
                                  <>
                                    <p className="text-2xl font-bold text-foreground leading-tight">
                                      {formatBalance(balances[tip.id], tip.token)}
                                    </p>
                                    {prices[tip.token] && (
                                      <p className="text-sm text-muted-foreground mt-0.5">
                                        ≈ {formatUSDAmount(calculateUSD(Number(balances[tip.id]) / Math.pow(10, getTokenDecimals(tip.token)), tip.token))}
                                      </p>
                                    )}
                                  </>
                                ) : (
                                  <>
                                    <div className="h-8 w-40 bg-muted animate-pulse rounded mt-1" />
                                    <div className="h-4 w-24 bg-muted animate-pulse rounded mt-1.5" />
                                  </>
                                )}
                              </div>
                            </div>

                            {/* Fee Info - Compact - Only show for Received tips */}
                            {feeInfo[tip.id] && balances[tip.id] > 0n && 'Received' in tip.status && (
                              <div className="mt-3 p-3 bg-green-50/50 border border-green-200/50 rounded-lg text-xs">
                                <div className="flex justify-between mb-1">
                                  <span className="text-muted-foreground">Platform Fee (2%)</span>
                                  <span className="font-medium">{formatBalance(feeInfo[tip.id].platformFee, tip.token)}</span>
                                </div>
                                <div className="flex justify-between mb-2">
                                  <span className="text-muted-foreground">Network Fee</span>
                                  <span className="font-medium">{formatBalance(feeInfo[tip.id].ledgerFee, tip.token)}</span>
                                </div>
                                <div className="flex justify-between pt-2 border-t border-green-200/50">
                                  <span className="font-semibold text-green-700">You'll receive</span>
                                  <span className="font-bold text-green-700">{formatBalance(feeInfo[tip.id].amountToReceive, tip.token)}</span>
                                </div>
                              </div>
                            )}

                            {/* Message */}
                            {tip.message.length > 0 && (
                              <div className="mt-3 pl-3 border-l-2 border-blue-300 py-1">
                                <p className="text-xs text-blue-900/70 italic">
                                  "{tip.message[0]}"
                                </p>
                              </div>
                            )}
                          </div>

                          {/* Actions - Vertical */}
                          <div className="flex flex-col gap-2 ml-4">
                            {'Received' in tip.status && balances[tip.id] !== undefined && (
                              <Button
                                onClick={() => handleWithdrawClick(tip.id)}
                                disabled={withdrawing[tip.id] || loadingFees[tip.id] || balances[tip.id] === 0n}
                                size="sm"
                                className="text-xs h-8 px-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {(withdrawing[tip.id] || loadingFees[tip.id]) ? <TipioLoader size={12} variant="white" /> : <Download className="h-3 w-3" />}
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    );
                  })}
                </div>
              )}

            {isFree && userProfile && filteredTips.length > 0 && (
              <div className="mt-4 pt-4 border-t border-border">
                <p className="text-xs text-muted-foreground text-center">
                  Daily withdrawals: <span className="font-semibold">{userProfile.withdrawCount || 0} / 3</span>
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Wallet Selection Modal */}
      <WalletSelectionModal
        isOpen={showWalletModal}
        onClose={() => setShowWalletModal(false)}
        onSelectWallet={async (walletType) => {
          const result = await connectAndSaveWallet(walletType);
          if (result.success) {
            setShowWalletModal(false);
          } else {
            toast.error(result.error || 'Failed to connect wallet');
          }
        }}
        title="Connect Wallet for Withdrawals"
        description="Choose a wallet to withdraw your tips and access premium features"
      />

      {/* Withdrawal Confirmation Modal */}
      {selectedTipForWithdraw && (
        <WithdrawalConfirmModal
          isOpen={showWithdrawModal}
          onClose={() => {
            setShowWithdrawModal(false);
            setSelectedTipForWithdraw(null);
          }}
          onConfirm={handleWithdrawConfirm}
          balance={balances[selectedTipForWithdraw]}
          feeInfo={feeInfo[selectedTipForWithdraw]}
          token={tips.find(t => t.id === selectedTipForWithdraw)?.token}
          withdrawing={withdrawing[selectedTipForWithdraw]}
        />
      )}

      {/* Bulk Withdraw Modal */}
      <BulkWithdrawModal
        isOpen={showBulkWithdrawModal}
        onClose={() => setShowBulkWithdrawModal(false)}
        onConfirm={confirmBulkWithdraw}
        selectedTips={selectedTips}
        tips={tips}
        balances={balances}
        feeInfo={feeInfo}
        calculateUSD={calculateUSD}
        withdrawing={bulkWithdrawing}
      />

      {/* QR Modal */}
      <QRModal
        isOpen={showQR}
        onClose={() => setShowQR(false)}
        qrDataUrl={qrDataUrl}
        username={userProfile.username}
        onDownload={downloadQR}
      />
    </div>
  );
}
