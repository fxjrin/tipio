import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Actor, HttpAgent } from '@dfinity/agent';
import { IcrcLedgerCanister } from '@dfinity/ledger-icrc';
import { Principal } from '@dfinity/principal';
import { ArrowLeft, Check, Info, AlertCircle, Lock, User } from 'lucide-react';
import { toast } from 'sonner';
import gsap from 'gsap';

import { useAuth } from '@/contexts/AuthContext';
import { idlFactory } from 'declarations/backend';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import TipioLoader, { TipioLoaderWithText } from '@/components/TipioLoader';
import { useMinimumLoadingTime } from '@/hooks/useMinimumLoadingTime';
import WalletSelectionModal from '@/components/WalletSelectionModal';
import TokenSelector from '@/components/TokenSelector';
import TokenLogo from '@/components/TokenLogo';
import { detectUserTokens } from '@/libs/walletTokenDetection';

const BACKEND_CANISTER_ID = 'vtsa7-6qaaa-aaaah-arlkq-cai';
const DEFAULT_TOKEN = 'ckBTC';
const DEFAULT_TOKEN_CANISTER = 'mxzaz-hqaaa-aaaar-qaada-cai';

export default function TipPage() {
  const { username } = useParams();
  const navigate = useNavigate();
  const { wallet } = useAuth();

  const [recipientProfile, setRecipientProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);

  const showLoading = useMinimumLoadingTime(loading);

  const [token, setToken] = useState(DEFAULT_TOKEN);
  const [tokenCanisterId, setTokenCanisterId] = useState(DEFAULT_TOKEN_CANISTER);
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [transferSuccess, setTransferSuccess] = useState(false);
  const [successBlockIndex, setSuccessBlockIndex] = useState(null);

  const [userTokens, setUserTokens] = useState([]);
  const [loadingTokens, setLoadingTokens] = useState(false);
  const [feeInfo, setFeeInfo] = useState(null);
  const [withdrawalFeePreview, setWithdrawalFeePreview] = useState(null);
  const [isAmountTooSmall, setIsAmountTooSmall] = useState(false);

  const [hasAnimated, setHasAnimated] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [copiedBlockIndex, setCopiedBlockIndex] = useState(false);

  const feeBreakdownRef = useRef(null);
  const balanceIndicatorRef = useRef(null);
  const animationTimelineRef = useRef(null);
  const formContentRef = useRef(null);

  useEffect(() => {
    document.body.style.overflow = wallet.isConnected ? 'auto' : 'hidden';
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [wallet.isConnected]);

  useEffect(() => {
    const fetchRecipient = async () => {
      try {
        const agent = new HttpAgent({ host: 'https://icp0.io' });
        const anonymousBackend = Actor.createActor(idlFactory, {
          agent,
          canisterId: BACKEND_CANISTER_ID,
        });

        const profile = await anonymousBackend.getUserByUsername(username);
        if (profile.length > 0) {
          setRecipientProfile(profile[0]);
        } else {
          setNotFound(true);
        }
      } catch (err) {
        console.error('Error fetching recipient:', err);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };

    fetchRecipient();
  }, [username]);

  useEffect(() => {
    const detectTokens = async () => {
      if (!wallet.isConnected || !wallet.walletPrincipal) {
        setUserTokens([]);
        return;
      }

      setLoadingTokens(true);
      try {
        const tokens = await detectUserTokens(wallet.walletPrincipal);
        setUserTokens(tokens);

        if (tokens.length > 0) {
          // Try to select preferred default token (ckBTC), fallback to first token with balance
          const preferredToken = tokens.find(t => t.symbol === DEFAULT_TOKEN) || tokens.find(t => t.balance > 0n) || tokens[0];
          setToken(preferredToken.symbol);
          setTokenCanisterId(preferredToken.canisterId);
        } else {
          setToken(DEFAULT_TOKEN);
          setTokenCanisterId(DEFAULT_TOKEN_CANISTER);
        }
      } catch (err) {
        console.error('Error detecting tokens:', err);
      } finally {
        setLoadingTokens(false);
      }
    };

    detectTokens();
  }, [wallet.isConnected, wallet.walletPrincipal]);

  useEffect(() => {
    if (!amount || parseFloat(amount) <= 0) {
      setFeeInfo(null);
      setWithdrawalFeePreview(null);
      setIsAmountTooSmall(false);
      return;
    }

    const selectedTokenData = userTokens.find(t => t.symbol === token);
    if (!selectedTokenData) {
      setFeeInfo(null);
      setWithdrawalFeePreview(null);
      setIsAmountTooSmall(false);
      return;
    }

    const decimals = selectedTokenData.decimals || 8;
    const amountNum = parseFloat(amount);
    const amountInBaseUnits = BigInt(Math.floor(amountNum * Math.pow(10, decimals)));

    const DEFAULT_FEE = 10000n;
    const tokenFee = selectedTokenData.metadata?.fee
      ? (typeof selectedTokenData.metadata.fee === 'bigint'
          ? selectedTokenData.metadata.fee
          : BigInt(selectedTokenData.metadata.fee))
      : DEFAULT_FEE;

    const totalRequired = amountInBaseUnits + tokenFee;
    const balance = selectedTokenData.balance;
    const hasSufficientBalance = totalRequired <= balance;

    const formatAmount = (bigintAmount) => {
      return (Number(bigintAmount) / Math.pow(10, decimals)).toFixed(decimals);
    };

    // Calculate withdrawal fees preview (what recipient will receive after withdraw)
    const PLATFORM_FEE_PERCENT = 2n; // 2%
    const platformFee = (amountInBaseUnits * PLATFORM_FEE_PERCENT) / 100n;
    const needsPlatformTransfer = platformFee > tokenFee;

    const withdrawalTotalFees = needsPlatformTransfer
      ? tokenFee + platformFee + tokenFee  // ledger fee + platform fee + another ledger fee for platform transfer
      : tokenFee + platformFee;

    const recipientWillReceive = amountInBaseUnits > withdrawalTotalFees
      ? amountInBaseUnits - withdrawalTotalFees
      : 0n;

    // Check if amount is too small (recipient gets less than 3x ledger fee)
    const minimumReasonableAmount = tokenFee * 5n; // At least 5x the ledger fee
    const isTooSmall = amountInBaseUnits < minimumReasonableAmount;

    setFeeInfo({
      amount: formatAmount(amountInBaseUnits),
      fee: formatAmount(tokenFee),
      total: formatAmount(totalRequired),
      balance: formatAmount(balance),
      hasSufficientBalance,
    });

    setWithdrawalFeePreview({
      tipAmount: formatAmount(amountInBaseUnits),
      ledgerFee: formatAmount(tokenFee),
      platformFee: formatAmount(platformFee),
      totalFees: formatAmount(withdrawalTotalFees),
      recipientReceives: formatAmount(recipientWillReceive),
      minimumRecommended: formatAmount(minimumReasonableAmount),
    });

    setIsAmountTooSmall(isTooSmall);
  }, [amount, token, userTokens]);

  useEffect(() => {
    if (animationTimelineRef.current) {
      animationTimelineRef.current.kill();
    }

    if (feeInfo && feeBreakdownRef.current) {
      const tl = gsap.timeline();
      animationTimelineRef.current = tl;

      tl.fromTo(feeBreakdownRef.current, {
        opacity: 0, y: -10, scale: 0.98
      }, {
        opacity: 1, y: 0, scale: 1, duration: 0.3, ease: 'power2.out'
      });

      if (balanceIndicatorRef.current) {
        tl.to(balanceIndicatorRef.current, {
          backgroundColor: feeInfo.hasSufficientBalance
            ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          duration: 0.2, ease: 'power1.inOut'
        }, '-=0.1');
      }
    }

    return () => {
      if (animationTimelineRef.current) {
        animationTimelineRef.current.kill();
      }
    };
  }, [feeInfo]);

  useEffect(() => {
    if (transferSuccess) {
      const tl = gsap.timeline();

      tl.fromTo('.success-card',
        { scale: 0.8, opacity: 0, y: 30 },
        { scale: 1, opacity: 1, y: 0, duration: 0.5, ease: 'back.out(1.7)' }
      )
      .fromTo('.success-icon',
        { scale: 0, rotation: -180, opacity: 0 },
        { scale: 1, rotation: 0, opacity: 1, duration: 0.6, ease: 'back.out(2)' },
        '-=0.3'
      )
      .fromTo('.success-text',
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.4, stagger: 0.08, ease: 'power2.out' },
        '-=0.2'
      )
      .fromTo('.success-button',
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.4, stagger: 0.1, ease: 'power2.out' },
        '-=0.2'
      );

      return () => tl.kill();
    }
  }, [transferSuccess]);

  // GSAP Animation when wallet connects/disconnects
  useEffect(() => {
    const connectPrompt = document.querySelector('[data-connect-prompt]');
    const formCard = document.querySelector('[data-form-card]');
    const mainContainer = document.querySelector('[data-main-container]');
    const mergedCard = document.querySelector('[data-merged-card]');

    // Enable hardware acceleration to prevent blink
    if (mainContainer) {
      mainContainer.style.willChange = 'padding';
      mainContainer.style.backfaceVisibility = 'hidden';
      mainContainer.style.perspective = '1000px';
    }
    if (connectPrompt) {
      connectPrompt.style.willChange = 'opacity, transform, height';
      connectPrompt.style.backfaceVisibility = 'hidden';
    }
    if (formCard) {
      formCard.style.willChange = 'opacity, transform';
      formCard.style.backfaceVisibility = 'hidden';
    }
    if (mergedCard) {
      mergedCard.style.willChange = 'margin';
      mergedCard.style.backfaceVisibility = 'hidden';
    }

    // Set initial display state
    if (connectPrompt) {
      connectPrompt.style.display = wallet.isConnected ? 'none' : 'block';
    }
    if (formCard) {
      formCard.style.display = wallet.isConnected ? 'block' : 'none';
    }

    // Animation when connecting wallet
    if (wallet.isConnected && !hasAnimated) {
      setHasAnimated(true);
      setIsAnimating(true);

      // Use setTimeout to ensure DOM is ready
      setTimeout(() => {
        const connectPrompt = document.querySelector('[data-connect-prompt]');
        const mergedCard = document.querySelector('[data-merged-card]');
        const formCard = document.querySelector('[data-form-card]');
        const mainContainer = document.querySelector('[data-main-container]');
        const cardsWrapper = document.querySelector('[data-cards-wrapper]');

        if (connectPrompt && mergedCard && formCard && mainContainer && cardsWrapper) {
          // Reset connect prompt display for animation
          connectPrompt.style.display = 'block';

          // Set initial state for formCard
          gsap.set(formCard, {
            display: 'block',
            opacity: 0,
            y: 30
          });

          const tl = gsap.timeline({
            onComplete: () => {
              // Keep padding styles - they're the final state for connected view
              setIsAnimating(false);

              // Delay cleanup willChange to prevent blink
              setTimeout(() => {
                if (mainContainer) mainContainer.style.willChange = 'auto';
                if (connectPrompt) connectPrompt.style.willChange = 'auto';
                if (formCard) formCard.style.willChange = 'auto';
                if (mergedCard) mergedCard.style.willChange = 'auto';
              }, 100);
            }
          });

          // 0. Transition container from center to top layout
          // First, remove flex centering and add temp margin to maintain position
          tl.set(mainContainer, {
            className: 'max-w-2xl mx-auto px-4',
            paddingTop: '40vh' // Start with large padding to simulate center
          })
          // Then animate padding to final position
          .to(mainContainer, {
            paddingTop: '2rem',
            paddingBottom: '2rem',
            duration: 0.5,
            ease: 'power2.inOut',
            force3D: true
          })
          // 1. Fade out and collapse connect prompt with scale effect
          .to(connectPrompt, {
            opacity: 0,
            scaleY: 0.8,
            height: 0,
            marginTop: 0,
            marginBottom: 0,
            paddingTop: 0,
            paddingBottom: 0,
            duration: 0.35,
            ease: 'power2.in',
            transformOrigin: 'top center',
            force3D: true,
            onComplete: () => {
              connectPrompt.style.display = 'none';
            }
          }, '-=0.3')
          // 2. Add margin to merged card
          .to(mergedCard, {
            marginBottom: '1rem',
            duration: 0.3,
            ease: 'power2.inOut',
            force3D: true
          }, '-=0.2')
          // 3. Fade in and slide up form card
          .to(formCard, {
            opacity: 1,
            y: 0,
            duration: 0.5,
            ease: 'power2.out',
            force3D: true
          }, '-=0.25');
        }
      }, 50);
    }

    // Animation when disconnecting wallet
    if (!wallet.isConnected && hasAnimated) {
      setIsAnimating(true);

      const connectPrompt = document.querySelector('[data-connect-prompt]');
      const formCard = document.querySelector('[data-form-card]');
      const mergedCard = document.querySelector('[data-merged-card]');
      const mainContainer = document.querySelector('[data-main-container]');
      const cardsWrapper = document.querySelector('[data-cards-wrapper]');

      if (connectPrompt && formCard && mergedCard && mainContainer && cardsWrapper) {
        // Keep the current top position layout (don't switch to flex yet)
        // mainContainer should still have 'max-w-2xl mx-auto px-4' with padding

        const tl = gsap.timeline({
          onComplete: () => {
            // Delay state changes to prevent blink
            setTimeout(() => {
              // Remove inline padding styles before switching to flex
              mainContainer.style.paddingTop = '';
              mainContainer.style.paddingBottom = '';
              setHasAnimated(false);
              setIsAnimating(false);

              // Delay cleanup willChange further to prevent blink
              setTimeout(() => {
                if (mainContainer) mainContainer.style.willChange = 'auto';
                if (connectPrompt) connectPrompt.style.willChange = 'auto';
                if (formCard) formCard.style.willChange = 'auto';
                if (mergedCard) mergedCard.style.willChange = 'auto';
              }, 100);
            }, 50);
          }
        });

        // 1. Fade out and slide down form card
        tl.to(formCard, {
          opacity: 0,
          y: 30,
          duration: 0.4,
          ease: 'power2.in',
          force3D: true,
          onComplete: () => {
            formCard.style.display = 'none';
          }
        })
        // 2. Remove margin from merged card
        .to(mergedCard, {
          marginBottom: '0',
          duration: 0.3,
          ease: 'power2.inOut',
          force3D: true
        }, '-=0.2')
        // 3. Fade in and expand connect prompt with scale effect (BERSAMAAN dengan container turun)
        .fromTo(connectPrompt, {
          display: 'block',
          opacity: 0,
          scaleY: 0.8,
          height: 0,
          paddingTop: 0,
          paddingBottom: 0
        }, {
          opacity: 1,
          scaleY: 1,
          height: 'auto',
          paddingTop: '24px',
          paddingBottom: '24px',
          duration: 0.6,
          ease: 'power2.out',
          transformOrigin: 'top center',
          force3D: true
        }, '-=0.15')
        // 4. Animate container padding from top to center position (BERSAMAAN dengan expand prompt)
        .to(mainContainer, {
          paddingTop: '35vh',
          duration: 0.6,
          ease: 'power2.inOut',
          force3D: true
        }, '-=0.6');
      }
    }
  }, [wallet.isConnected, hasAnimated]);

  const handleTokenSelect = (selectedToken) => {
    const tokenData = userTokens.find(t => t.symbol === selectedToken);
    if (tokenData) {
      setToken(tokenData.symbol);
      setTokenCanisterId(tokenData.canisterId);
    }
  };

  const handleMaxClick = () => {
    const selectedTokenData = userTokens.find(t => t.symbol === token);
    if (!selectedTokenData) return;

    const decimals = selectedTokenData.decimals || 8;
    const balance = selectedTokenData.balance;

    // Get fee from metadata
    let tokenFee = 10000n;
    if (selectedTokenData.metadata?.fee) {
      tokenFee = typeof selectedTokenData.metadata.fee === 'bigint'
        ? selectedTokenData.metadata.fee
        : BigInt(selectedTokenData.metadata.fee);
    }

    const maxAmount = balance > tokenFee ? balance - tokenFee : 0n;
    const maxFormatted = (Number(maxAmount) / Math.pow(10, decimals)).toFixed(decimals);
    setAmount(maxFormatted);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Minimal sync validation only
    if (!wallet.isConnected) {
      setShowWalletModal(true);
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    // Validate minimum tip amount
    if (isAmountTooSmall && withdrawalFeePreview) {
      toast.error(`Minimum tip amount: ${withdrawalFeePreview.minimumRecommended} ${token}`);
      return;
    }

    // IMMEDIATELY call async flow (no more sync code after this!)
    if (wallet.walletType === 'oisy') {
      executeOisyTipFlow();
    } else {
      executeStandardTipFlow();
    }
  };

  const validateBalance = (selectedToken) => {
    if (!selectedToken) return true;

    const decimals = selectedToken.decimals || 8;
    const amountInBaseUnits = BigInt(Math.floor(parseFloat(amount) * Math.pow(10, decimals)));
    const tokenFee = selectedToken.metadata?.fee || 10000n;
    const totalRequired = amountInBaseUnits + (typeof tokenFee === 'bigint' ? tokenFee : BigInt(tokenFee));

    if (totalRequired > selectedToken.balance) {
      const requiredFormatted = (Number(totalRequired) / Math.pow(10, decimals)).toFixed(decimals);
      const balanceFormatted = (Number(selectedToken.balance) / Math.pow(10, decimals)).toFixed(decimals);
      toast.error(`Insufficient ${token} balance. You need ${requiredFormatted} ${token} (including fee), but only have ${balanceFormatted} ${token}`);
      return false;
    }

    return true;
  };

  const executeOisyTipFlow = async () => {
    try {
      await wallet.oisySigner.openChannel();
      setIsProcessing(true);

      const selectedToken = userTokens.find(t => t.symbol === token);
      if (!validateBalance(selectedToken)) {
        setIsProcessing(false);
        return;
      }

      const tokenCanisterIdString = typeof tokenCanisterId === 'string'
        ? tokenCanisterId
        : tokenCanisterId.toText();

      // Check if backend is on local replica or mainnet
      const isLocalBackend = BACKEND_CANISTER_ID.includes('aaaaa-aa') ||
                             BACKEND_CANISTER_ID.length < 20;

      const anonymousAgent = await HttpAgent.create({
        host: isLocalBackend ? 'http://localhost:4943' : 'https://icp0.io',
      });

      // Fetch root key for local backend only
      if (isLocalBackend) {
        await anonymousAgent.fetchRootKey();
      }

      const anonymousActor = Actor.createActor(idlFactory, {
        agent: anonymousAgent,
        canisterId: BACKEND_CANISTER_ID,
      });

      // Step 1: Prepare tip - Get subaccount
      const prepareResult = await anonymousActor.prepareTip(username);

      if ('err' in prepareResult) {
        throw new Error(prepareResult.err || 'Failed to prepare tip');
      }

      const tipData = prepareResult.ok;

      // Step 2: Transfer to subaccount
      const freshLedger = IcrcLedgerCanister.create({
        agent: wallet.walletAgent,
        canisterId: Principal.fromText(tokenCanisterIdString),
      });

      const decimals = selectedToken?.decimals || 8;
      const amountInBaseUnits = BigInt(Math.floor(parseFloat(amount) * Math.pow(10, decimals)));

      const blockIndex = await handleTransfer(tipData, freshLedger, amountInBaseUnits);

      // Step 3: Create tip with proof (blockIndex)
      const createTipRequest = {
        recipientUsername: username,
        token: token,
        tokenCanisterId: tokenCanisterIdString,
        message: message ? [message] : [],
        blockIndex: Number(blockIndex),
        amount: Number(amountInBaseUnits)
      };

      const createResult = await anonymousActor.createTip(createTipRequest);

      if ('err' in createResult) {
        throw new Error(createResult.err || 'Failed to create tip record');
      }

      // Success!
      setSuccessBlockIndex(blockIndex);
      setTransferSuccess(true);
      setIsProcessing(false);
    } catch (err) {
      console.error('OISY tip flow error:', err);

      if (err.message && err.message.includes('Signer window')) {
        toast.error(
          <div className="space-y-2">
            <p className="font-semibold">OISY Connection Failed</p>
            <p className="text-sm">Could not establish connection with OISY wallet. Please try:</p>
            <ol className="text-sm ml-4 list-decimal space-y-1">
              <li>Refresh the page</li>
              <li>Reconnect your OISY wallet</li>
              <li>Try again immediately after connecting</li>
            </ol>
            <p className="text-xs mt-2 opacity-80">Tip: Use Plug wallet for better experience</p>
          </div>,
          { duration: 15000 }
        );
      } else {
        toast.error(err.message || 'An error occurred. Please try again.');
      }
      setIsProcessing(false);
    }
  };

  const executeStandardTipFlow = async () => {
    try {
      setIsProcessing(true);

      const selectedToken = userTokens.find(t => t.symbol === token);
      if (!validateBalance(selectedToken)) {
        setIsProcessing(false);
        return;
      }

      const walletActor = await wallet.createWalletActor();

      const tokenCanisterIdString = typeof tokenCanisterId === 'string'
        ? tokenCanisterId
        : tokenCanisterId.toText();

      // Step 1: Prepare tip - Get subaccount
      const prepareResult = await walletActor.prepareTip(username);

      if ('err' in prepareResult) {
        throw new Error(prepareResult.err || 'Failed to prepare tip');
      }

      const tipData = prepareResult.ok;

      // Step 2: Transfer to subaccount
      const ledgerInstance = wallet.getLedgerCanister(token);
      const decimals = selectedToken?.decimals || 8;
      const amountInBaseUnits = BigInt(Math.floor(parseFloat(amount) * Math.pow(10, decimals)));

      const blockIndex = await handleTransfer(tipData, ledgerInstance, amountInBaseUnits);

      // Step 3: Create tip with proof (blockIndex)
      const createTipRequest = {
        recipientUsername: username,
        token: token,
        tokenCanisterId: tokenCanisterIdString,
        message: message ? [message] : [],
        blockIndex: Number(blockIndex),
        amount: Number(amountInBaseUnits)
      };

      const createResult = await walletActor.createTip(createTipRequest);

      if ('err' in createResult) {
        throw new Error(createResult.err || 'Failed to create tip record');
      }

      // Success!
      setSuccessBlockIndex(blockIndex);
      setTransferSuccess(true);
      setIsProcessing(false);
    } catch (err) {
      console.error('Standard tip flow error:', err);
      toast.error(err.message || 'An error occurred. Please try again.');
      setIsProcessing(false);
    }
  };

  const prepareSubaccount = (subaccount) => {
    if (subaccount && typeof subaccount === 'object' && !Array.isArray(subaccount) && !(subaccount instanceof Uint8Array)) {
      const bytes = new Uint8Array(32);
      for (let i = 0; i < 32; i++) {
        bytes[i] = subaccount[i] || 0;
      }
      return [bytes];
    }
    return [subaccount];
  };

  const resetForm = () => {
    setAmount('');
    setMessage('');
    setTransferSuccess(false);
    setSuccessBlockIndex(null);
    setFeeInfo(null);
    setToken(DEFAULT_TOKEN);
    setTokenCanisterId(DEFAULT_TOKEN_CANISTER);

    // Force correct display state and padding when returning from success view
    setTimeout(() => {
      const formCard = document.querySelector('[data-form-card]');
      const connectPrompt = document.querySelector('[data-connect-prompt]');
      const mainContainer = document.querySelector('[data-main-container]');

      if (wallet.isConnected) {
        if (formCard) formCard.style.display = 'block';
        if (connectPrompt) connectPrompt.style.display = 'none';

        // Restore padding that was set by GSAP animation
        if (mainContainer) {
          mainContainer.style.paddingTop = '2rem';
          mainContainer.style.paddingBottom = '2rem';
        }
      }
    }, 0);
  };

  const handleCopyBlockIndex = () => {
    if (successBlockIndex) {
      navigator.clipboard.writeText(successBlockIndex.toString());
      setCopiedBlockIndex(true);
      toast.success('Block index copied to clipboard!');
      setTimeout(() => setCopiedBlockIndex(false), 2000);
    }
  };

  const handleTransfer = (tipData, ledgerInstance, amountInBaseUnits) => {
    if (!wallet.walletAgent) {
      toast.error('Please reconnect your wallet');
      return Promise.reject(new Error('No wallet agent'));
    }

    const subaccountArray = prepareSubaccount(tipData.subaccount);

    return ledgerInstance.transfer({
      to: {
        owner: tipData.canisterPrincipal,
        subaccount: subaccountArray
      },
      amount: amountInBaseUnits,
    })
      .then(blockIndex => {
        return blockIndex; // Return blockIndex for createTip
      })
      .catch(err => {
        console.error('Transfer error:', err);
        toast.error(err.message || 'Failed to transfer. Please try again.');
        setIsProcessing(false);
        throw err;
      });
  };

  if (showLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <TipioLoaderWithText text="Loading profile..." variant="colored" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">User Not Found</h2>
          <p className="text-muted-foreground mb-6">@{username} doesn't exist</p>
          <Button onClick={() => navigate('/')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  if (transferSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background flex items-center justify-center p-4">
        <div className="w-full max-w-lg">
          <div className="success-card bg-card rounded-2xl border-2 border-[var(--brand-yellow)] shadow-xl overflow-hidden">
            {/* Success Icon Header */}
            <div className="p-8 text-center">
              <div className="success-icon relative inline-flex items-center justify-center mb-6">
                <div className="absolute inset-0 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full blur-xl opacity-60 animate-pulse" />
                <div className="relative w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center shadow-lg">
                  <Check className="w-10 h-10 text-white stroke-[3]" />
                </div>
              </div>
              <h1 className="success-text text-3xl font-bold text-foreground mb-2">
                Tip Sent!
              </h1>
              <p className="success-text text-muted-foreground">
                Successfully delivered to recipient
              </p>
            </div>

            {/* Recipient Info */}
            <div className="px-6 pb-4">
              <div className="success-text bg-muted/30 rounded-xl p-4 border border-border/50">
                <div className="flex items-center gap-4">
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center text-2xl flex-shrink-0 shadow-sm"
                    style={{ backgroundColor: recipientProfile?.avatarBackgroundColor || '#f7931a' }}
                  >
                    {recipientProfile?.avatarEmoji || '👤'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground mb-1">Recipient</p>
                    <p className="text-lg font-bold text-foreground truncate">
                      @{username}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Amount Section */}
            <div className="px-6 pb-4">
              <div className="success-text bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 rounded-xl p-5 border border-green-200 dark:border-green-800/50">
                <p className="text-xs text-muted-foreground text-center mb-3 font-medium">
                  Amount Sent
                </p>
                <div className="flex items-center justify-center gap-3">
                  <TokenLogo symbol={token} size={40} className="shadow-md flex-shrink-0" />
                  <p className="text-4xl font-bold bg-gradient-to-r from-[var(--brand-yellow)] via-[var(--brand-orange)] to-[var(--brand-pink)] bg-clip-text text-transparent">
                    {amount}
                  </p>
                  <p className="text-2xl font-bold text-foreground/70">
                    {token}
                  </p>
                </div>
              </div>
            </div>

            {/* Message Section */}
            {message && (
              <div className="px-6 pb-4">
                <div className="success-text bg-muted/30 rounded-xl p-4 border border-border/50">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-base">💬</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground font-medium mb-1.5">Your Message</p>
                      <p className="text-sm text-foreground leading-relaxed">
                        "{message}"
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Block Index Section */}
            {successBlockIndex && (
              <div className="px-6 pb-4">
                <div className="success-text bg-muted/30 rounded-xl p-4 border border-border/50">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground font-medium mb-1.5 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                        Transaction ID
                      </p>
                      <p className="text-xs font-mono text-foreground/70 break-all">
                        #{successBlockIndex.toString()}
                      </p>
                    </div>
                    <Button
                      onClick={handleCopyBlockIndex}
                      variant="ghost"
                      size="sm"
                      className="flex-shrink-0 h-8 w-8 p-0"
                    >
                      {copiedBlockIndex ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="p-6 pt-4 space-y-2.5">
              <Button
                onClick={resetForm}
                className="success-button w-full h-12 font-semibold bg-gradient-to-r from-[var(--brand-yellow)] to-[var(--brand-orange)] hover:opacity-90 transition-all text-base shadow-lg shadow-brand-yellow/20"
              >
                Send Another Tip
              </Button>
              <Button
                onClick={() => navigate('/')}
                variant="outline"
                className="success-button w-full h-11 hover:bg-muted/50 transition-all"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
      {/* Header */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Button
              onClick={() => navigate('/')}
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div
        data-main-container
        className="max-w-2xl mx-auto px-4"
        style={{
          minHeight: !wallet.isConnected && !isAnimating ? 'calc(100vh - 4rem)' : 'auto',
          display: !wallet.isConnected && !isAnimating ? 'flex' : 'block',
          alignItems: !wallet.isConnected && !isAnimating ? 'center' : 'normal',
          justifyContent: !wallet.isConnected && !isAnimating ? 'center' : 'normal'
        }}
      >
        <div className="w-full" data-cards-wrapper>
          {/* Merged/Recipient Card - Always rendered */}
          <div
            data-merged-card
            className="bg-card rounded-2xl border-2 border-[var(--brand-yellow)] shadow-xl overflow-hidden"
            style={{ marginBottom: wallet.isConnected ? '1rem' : '0' }}
          >
          {/* Recipient Header */}
          <div data-recipient-card className={wallet.isConnected ? 'p-5' : 'p-5 border-b border-border'}>
            <div className="flex items-center gap-3">
              <div
                className="rounded-full flex items-center justify-center shadow-sm flex-shrink-0 w-14 h-14"
                style={{ backgroundColor: recipientProfile?.avatarBackgroundColor || '#f3f4f6' }}
              >
                {recipientProfile?.avatarEmoji ? (
                  <span className="text-2xl">{recipientProfile.avatarEmoji}</span>
                ) : (
                  <User className="text-muted-foreground w-7 h-7" />
                )}
              </div>
              <div className="flex-1">
                <p className="text-muted-foreground font-medium text-xs mb-0.5">Sending to</p>
                <p className="font-bold text-xl">@{username}</p>
              </div>
            </div>
          </div>

          {/* Connect Prompt - Hidden when connected */}
          <div
            data-connect-prompt
            className="p-6 space-y-5"
          >
            <div className="text-center">
              <h2 className="text-xl font-bold mb-2">Complete Payment</h2>
              <p className="text-sm text-muted-foreground">Connect your wallet and send payment</p>
            </div>

            <Button
              type="button"
              onClick={() => setShowWalletModal(true)}
              className="w-full h-12 text-base font-bold bg-gradient-to-r from-[var(--brand-yellow)] to-[var(--brand-orange)] hover:opacity-90 rounded-xl shadow-lg"
            >
              Connect Wallet
            </Button>

            <div className="text-center">
              <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                <Lock className="w-3 h-3" />
                Secured by Internet Computer
              </p>
            </div>
          </div>
        </div>

        {/* Form Card - Always rendered, hidden when not connected */}
        <div
          data-form-card
          className="bg-card rounded-2xl border-2 border-[var(--brand-yellow)] shadow-xl overflow-hidden"
          style={{
            display: wallet.isConnected ? 'block' : 'none'
          }}
        >
          {/* Connected Wallet Info - Header Card */}
          <div className="flex items-center justify-between px-5 py-3 bg-green-50 border-b border-green-200">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-xs font-medium text-green-700">
                Connected: {wallet.walletPrincipal?.toString().slice(0, 4)}...{wallet.walletPrincipal?.toString().slice(-4)}
              </span>
            </div>
            <Button
              type="button"
              onClick={wallet.disconnect}
              variant="ghost"
              size="sm"
              className="h-7 px-3 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 font-medium"
            >
              Disconnect
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="p-5 space-y-5">
                {/* Token Selection - Separate from Amount */}
                <div>
                  <label className="block text-sm font-semibold mb-3 text-foreground">Select Token</label>
                  <div className="relative z-20">
                    {loadingTokens ? (
                      <div className="h-16 bg-muted/30 rounded-xl border border-border animate-pulse"></div>
                    ) : userTokens.length === 0 ? (
                      <div className="text-center py-6 bg-muted/50 rounded-xl border border-border">
                        <p className="text-sm text-muted-foreground">No tokens available</p>
                      </div>
                    ) : (
                      <TokenSelector
                        tokens={userTokens}
                        selectedToken={token}
                        onSelect={handleTokenSelect}
                        disabled={isProcessing || loadingTokens}
                      />
                    )}
                  </div>
                </div>

                {/* Amount Input - Clean and Separate */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-semibold text-foreground">Amount</label>
                    {!loadingTokens && userTokens.length > 0 && (
                      <button
                        type="button"
                        onClick={handleMaxClick}
                        className="text-xs font-semibold text-[var(--brand-yellow)] hover:text-[var(--brand-orange)] px-2 py-1 rounded hover:bg-muted transition-colors"
                      >
                        MAX
                      </button>
                    )}
                  </div>
                  {loadingTokens ? (
                    <div className="space-y-2">
                      <div className="h-16 bg-muted/30 rounded-xl border border-border animate-pulse"></div>
                      <div className="h-4 w-48 bg-muted/30 rounded animate-pulse"></div>
                    </div>
                  ) : (
                    <>
                      <div className="relative">
                        <Input
                          type="number"
                          step="any"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          placeholder={isAmountTooSmall && withdrawalFeePreview ? `Min: ${withdrawalFeePreview.minimumRecommended}` : "0.00"}
                          className={`h-16 text-3xl font-bold border-2 rounded-xl pl-4 pr-20 ${
                            isAmountTooSmall
                              ? 'border-red-500 text-red-600 focus:border-red-500'
                              : 'focus:border-[var(--brand-yellow)]'
                          }`}
                          disabled={isProcessing}
                        />
                        <div className={`absolute right-4 top-1/2 -translate-y-1/2 text-xl font-semibold ${
                          isAmountTooSmall ? 'text-red-500' : 'text-muted-foreground'
                        }`}>
                          {token}
                        </div>
                      </div>
                      {userTokens.length > 0 && (
                        <p className={`text-xs mt-2 px-1 ${
                          isAmountTooSmall ? 'text-red-600 font-semibold' : 'text-muted-foreground'
                        }`}>
                          {isAmountTooSmall && withdrawalFeePreview ? (
                            <>Minimum: {withdrawalFeePreview.minimumRecommended} {token}</>
                          ) : (
                            <>Available: {(() => {
                              const selectedTokenData = userTokens.find(t => t.symbol === token);
                              if (!selectedTokenData) return '0.00';
                              const decimals = selectedTokenData.decimals || 8;
                              return (Number(selectedTokenData.balance) / Math.pow(10, decimals)).toFixed(decimals);
                            })()} {token}</>
                          )}
                        </p>
                      )}
                    </>
                  )}
                </div>

                {/* Fee Breakdown */}
                {feeInfo && !isAmountTooSmall && (
                  <div ref={feeBreakdownRef} className="rounded-xl overflow-hidden" style={{ opacity: 0 }}>
                    {/* Balance Status Card */}
                    <div ref={balanceIndicatorRef} className={`p-4 border-l-4 ${
                      feeInfo.hasSufficientBalance
                        ? 'bg-green-50/50 border-green-500'
                        : 'bg-red-50/50 border-red-500'
                    }`}>
                      <div className="flex items-start gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          feeInfo.hasSufficientBalance ? 'bg-green-500' : 'bg-red-500'
                        }`}>
                          {feeInfo.hasSufficientBalance ? (
                            <Check className="w-4 h-4 text-white" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-white" />
                          )}
                        </div>
                        <div className="flex-1">
                          <h4 className="text-sm font-semibold">
                            {feeInfo.hasSufficientBalance ? 'Ready to Send' : 'Insufficient Balance'}
                          </h4>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {feeInfo.hasSufficientBalance
                              ? 'You have enough balance to complete this transaction'
                              : `You need ${feeInfo.total} ${token} but only have ${feeInfo.balance} ${token}`}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Transaction Details */}
                    <div className="bg-muted/30 px-4 py-3 space-y-2.5">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-medium text-muted-foreground">Amount</span>
                        <span className="text-sm font-semibold">{amount} {token}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-medium text-muted-foreground">Network Fee</span>
                          <Info className="w-3 h-3 text-muted-foreground" />
                        </div>
                        <span className="text-sm font-medium text-muted-foreground">{feeInfo.fee} {token}</span>
                      </div>
                      <div className="border-t border-border/50 my-2"></div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-semibold">Total</span>
                        <span className={`text-base font-bold ${
                          feeInfo.hasSufficientBalance ? 'text-foreground' : 'text-red-600'
                        }`}>
                          {feeInfo.total} {token}
                        </span>
                      </div>
                      <div className="flex justify-between items-center pt-1">
                        <span className="text-xs text-muted-foreground">Available Balance</span>
                        <span className={`text-xs font-medium ${
                          feeInfo.hasSufficientBalance ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {feeInfo.balance} {token}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Message */}
                <div>
                  <label className="block text-sm font-semibold mb-3 text-foreground">
                    Message <span className="text-xs font-normal text-muted-foreground">(Optional)</span>
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Add a message to your tip..."
                    className="w-full h-20 px-4 py-3 border-2 border-border focus:border-[var(--brand-yellow)] rounded-xl resize-none text-sm"
                    disabled={isProcessing}
                  />
                </div>

                {/* Send Button */}
                <Button
                  type="submit"
                  disabled={
                    isProcessing ||
                    !amount ||
                    parseFloat(amount) <= 0 ||
                    (feeInfo && !feeInfo.hasSufficientBalance) ||
                    isAmountTooSmall ||
                    transferSuccess
                  }
                  className="relative z-10 w-full h-12 text-base font-bold bg-gradient-to-r from-[var(--brand-yellow)] to-[var(--brand-orange)] hover:opacity-90 rounded-xl shadow-lg transition-all disabled:opacity-50"
                >
                  {isProcessing ? (
                    <div className="flex items-center gap-2">
                      <TipioLoader size={16} variant="white" />
                      <span>Sending...</span>
                    </div>
                  ) : transferSuccess ? (
                    <div className="flex items-center gap-2">
                      <Check className="w-5 h-5" />
                      <span>Sent Successfully!</span>
                    </div>
                  ) : (
                    'Send Tip'
                  )}
                </Button>

                {/* Info Note */}
                <div className="text-center">
                  <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                    <Lock className="w-3 h-3" />
                    Secured by Internet Computer
                  </p>
                </div>
          </form>
        </div>
        </div>
      </div>

      {/* Wallet Selection Modal */}
      <WalletSelectionModal
        isOpen={showWalletModal}
        onClose={() => setShowWalletModal(false)}
        onSelectWallet={wallet.connect}
      />
    </div>
  );
}
