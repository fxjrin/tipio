import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Check, AlertCircle, User, Palette, Edit3, ChevronRight, Wallet, LogOut, DollarSign, Key, Settings as SettingsIcon, Coins, RefreshCw } from 'lucide-react';
import gsap from 'gsap';
import Sidebar from '@/components/Sidebar';
import { Actor, HttpAgent } from '@dfinity/agent';
import { idlFactory } from 'declarations/backend';
import TipioLoader from '@/components/TipioLoader';
import WalletSelectionModal from '@/components/WalletSelectionModal';
import ThemeToggle from '@/components/ThemeToggle';
import TokenLogo from '@/components/TokenLogo';
import { useTokenRegistry } from '@/hooks/useTokenRegistry';
import { toast } from 'sonner';

const BACKEND_CANISTER_ID = 'vtsa7-6qaaa-aaaah-arlkq-cai';

// Predefined color palette
const colorPalette = [
  '#f7931a', // Orange
  '#ff5f6d', // Pink
  '#fece10', // Yellow
  '#3b82f6', // Blue
  '#10b981', // Green
  '#8b5cf6', // Purple
  '#ef4444', // Red
  '#06b6d4', // Cyan
  '#f59e0b', // Amber
  '#ec4899', // Magenta
];

// Popular emoji options
const emojiOptions = [
  '👤', '😀', '😎', '🚀', '💎', '🔥', '⚡', '🌟', '💰', '🎯',
  '🎨', '🎮', '🎵', '🎭', '🏆', '💪', '🧠', '🦄', '🐱', '🐶',
  '🍕', '🍔', '🍩', '☕', '🌈', '🌙', '⭐', '✨', '🎃', '🎄'
];

export default function Settings() {
  const { identity, wallet, userProfile, connectAndSaveWallet, disconnectAndRemoveWallet } = useAuth();
  const { tokens, loading: tokensLoading, refreshToken } = useTokenRegistry();
  const [showWalletModal, setShowWalletModal] = useState(false);

  // Anonymous backend for query calls
  const [anonymousBackend, setAnonymousBackend] = useState(null);

  // Expand/collapse states
  const [expandedSection, setExpandedSection] = useState(null);

  // Avatar state
  const [selectedColor, setSelectedColor] = useState('#f7931a');
  const [selectedEmoji, setSelectedEmoji] = useState('👤');
  const [customColor, setCustomColor] = useState('');
  const [customEmoji, setCustomEmoji] = useState('');
  const [updatingAvatar, setUpdatingAvatar] = useState(false);
  const [avatarSuccess, setAvatarSuccess] = useState(false);
  const [avatarError, setAvatarError] = useState('');

  // Username state
  const [newUsername, setNewUsername] = useState('');
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState(null);
  const [changingUsername, setChangingUsername] = useState(false);
  const [usernameSuccess, setUsernameSuccess] = useState(false);
  const [usernameError, setUsernameError] = useState('');

  const settingsRef = useRef(null);
  const avatarSectionRef = useRef(null);
  const usernameSectionRef = useRef(null);

  // Create anonymous backend for query calls (no approval needed)
  useEffect(() => {
    const agent = new HttpAgent({ host: 'https://icp0.io' });
    const actor = Actor.createActor(idlFactory, {
      agent,
      canisterId: BACKEND_CANISTER_ID,
    });
    setAnonymousBackend(actor);
  }, []);

  // Initialize with user's current avatar settings
  useEffect(() => {
    if (userProfile) {
      setSelectedColor(userProfile.avatarBackgroundColor || '#f7931a');
      setSelectedEmoji(userProfile.avatarEmoji || '👤');
    }
  }, [userProfile]);

  // GSAP animations for page load
  useEffect(() => {
    if (userProfile) {
      const ctx = gsap.context(() => {
        gsap.set('.settings-item', { opacity: 1, x: 0 });

        gsap.from('.settings-item', {
          x: -20,
          opacity: 0,
          duration: 0.4,
          stagger: 0.08,
          ease: 'power2.out',
          delay: 0.1
        });
      }, settingsRef);

      return () => ctx.revert();
    }
  }, [userProfile]);

  // Toggle section with GSAP animation
  const toggleSection = (section, ref) => {
    if (expandedSection === section) {
      // Collapse
      gsap.to(ref.current, {
        height: 0,
        opacity: 0,
        duration: 0.3,
        ease: 'power2.inOut',
        onComplete: () => setExpandedSection(null)
      });
    } else {
      // Collapse previous section if any
      if (expandedSection) {
        const prevRef = expandedSection === 'avatar' ? avatarSectionRef : usernameSectionRef;
        gsap.to(prevRef.current, {
          height: 0,
          opacity: 0,
          duration: 0.3,
          ease: 'power2.inOut'
        });
      }

      // Expand new section
      setExpandedSection(section);
      gsap.set(ref.current, { height: 'auto', opacity: 1 });
      gsap.from(ref.current, {
        height: 0,
        opacity: 0,
        duration: 0.3,
        ease: 'power2.inOut'
      });
    }
  };

  // Check username availability with debounce (using anonymous backend)
  useEffect(() => {
    if (!newUsername || newUsername === userProfile?.username || !anonymousBackend) {
      setUsernameAvailable(null);
      return;
    }

    // Validate minimum length
    if (newUsername.length < 3) {
      setUsernameAvailable(null);
      return;
    }

    const timer = setTimeout(async () => {
      setCheckingUsername(true);
      try {
        // Use anonymous backend for query calls (no approval needed)
        const available = await anonymousBackend.isUsernameAvailable(newUsername);
        setUsernameAvailable(available);
      } catch (error) {
        console.error('Error checking username:', error);
      } finally {
        setCheckingUsername(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [newUsername, userProfile, anonymousBackend]);

  const handleUpdateAvatar = async () => {
    if (!identity.backendActor) {
      setAvatarError('Please login with Internet Identity');
      return;
    }

    setUpdatingAvatar(true);
    setAvatarError('');
    setAvatarSuccess(false);

    try {
      const color = customColor || selectedColor;
      const emoji = customEmoji || selectedEmoji;

      const result = await identity.backendActor.updateAvatar(color, emoji);

      if ('ok' in result) {
        setAvatarSuccess(true);
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        setAvatarError(result.err);
      }
    } catch (error) {
      console.error('Error updating avatar:', error);
      setAvatarError('Failed to update avatar. Please try again.');
    } finally {
      setUpdatingAvatar(false);
    }
  };

  const handleChangeUsername = async () => {
    if (!identity.backendActor) {
      setUsernameError('Please login with Internet Identity');
      return;
    }

    if (!newUsername) {
      setUsernameError('Please enter a new username');
      return;
    }

    if (usernameAvailable === false) {
      setUsernameError('Username is already taken');
      return;
    }

    setChangingUsername(true);
    setUsernameError('');
    setUsernameSuccess(false);

    try {
      const result = await identity.backendActor.changeUsername(newUsername);

      if ('ok' in result) {
        setUsernameSuccess(true);
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        setUsernameError(result.err);
      }
    } catch (error) {
      console.error('Error changing username:', error);
      setUsernameError('Failed to change username. Please try again.');
    } finally {
      setChangingUsername(false);
    }
  };

  if (!userProfile) {
    return null;
  }

  return (
    <div ref={settingsRef} className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <Sidebar currentPage="settings" />

      {/* Main Content */}
      <main className="flex-1 ml-64 p-8">
        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        </div>

        {/* Content - Vertical Centered Layout */}
        <div className="max-w-2xl mx-auto">
          {/* Profile Header */}
          <div className="settings-item mb-8 flex items-center gap-4">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center text-3xl shadow-lg"
              style={{ backgroundColor: userProfile.avatarBackgroundColor || '#f7931a' }}
            >
              {userProfile.avatarEmoji || '👤'}
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-foreground">@{userProfile.username}</h2>
              <p className="text-xs text-muted-foreground flex items-center gap-2 mt-1">
                <Key className="w-3 h-3" />
                II: {identity.principal?.toString().slice(0, 15)}...
              </p>
            </div>
          </div>

          {/* Preferences Section */}
          <div className="settings-item mb-6">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Preferences
            </h3>

            {/* Avatar Customization */}
            <div className="bg-card rounded-xl border border-border overflow-hidden mb-2">
              <button
                onClick={() => toggleSection('avatar', avatarSectionRef)}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-[var(--brand-yellow)] to-[var(--brand-orange)] rounded-full flex items-center justify-center">
                    <Palette className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-foreground">Avatar Customization</p>
                    <p className="text-sm text-muted-foreground">Change your profile appearance</p>
                  </div>
                </div>
                <ChevronRight
                  className={`w-5 h-5 text-muted-foreground transition-transform ${
                    expandedSection === 'avatar' ? 'rotate-90' : ''
                  }`}
                />
              </button>

              {/* Expandable Content */}
              <div ref={avatarSectionRef} style={{ height: 0, opacity: 0, overflow: 'hidden' }}>
                <div className="px-6 pb-6 border-t border-border">
                  {/* Avatar Preview */}
                  <div className="flex justify-center my-6">
                    <div
                      className="w-24 h-24 rounded-full flex items-center justify-center text-5xl transition-all duration-300 shadow-lg"
                      style={{ backgroundColor: customColor || selectedColor }}
                    >
                      {customEmoji || selectedEmoji}
                    </div>
                  </div>

                  {/* Color Selection */}
                  <div className="mb-6">
                    <Label className="mb-3 block font-semibold text-sm">Background Color</Label>
                    <div className="grid grid-cols-5 gap-2 mb-3">
                      {colorPalette.map((color) => (
                        <button
                          key={color}
                          onClick={() => {
                            setSelectedColor(color);
                            setCustomColor('');
                          }}
                          className={`h-10 rounded-lg transition-all ${
                            (customColor || selectedColor) === color
                              ? 'ring-2 ring-[var(--brand-yellow)] scale-110'
                              : 'hover:scale-105'
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                    <Input
                      type="text"
                      placeholder="Custom hex (#ff5733)"
                      value={customColor}
                      onChange={(e) => setCustomColor(e.target.value)}
                      className="text-sm"
                    />
                  </div>

                  {/* Emoji Selection */}
                  <div className="mb-6">
                    <Label className="mb-3 block font-semibold text-sm">Avatar Emoji</Label>
                    <div className="grid grid-cols-10 gap-1 mb-3 max-h-32 overflow-y-auto p-2 bg-muted/30 rounded-lg">
                      {emojiOptions.map((emoji) => (
                        <button
                          key={emoji}
                          onClick={() => {
                            setSelectedEmoji(emoji);
                            setCustomEmoji('');
                          }}
                          className={`text-xl p-2 rounded-lg transition-all ${
                            (customEmoji || selectedEmoji) === emoji
                              ? 'bg-[var(--brand-yellow)] scale-110'
                              : 'hover:bg-muted hover:scale-105'
                          }`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                    <Input
                      type="text"
                      placeholder="Or enter custom emoji"
                      value={customEmoji}
                      onChange={(e) => setCustomEmoji(e.target.value)}
                      className="text-center text-xl"
                    />
                  </div>

                  {/* Update Button */}
                  <Button
                    onClick={handleUpdateAvatar}
                    disabled={updatingAvatar}
                    className="w-full bg-gradient-to-r from-[var(--brand-yellow)] via-[var(--brand-orange)] to-[var(--brand-pink)] text-white hover:opacity-90"
                  >
                    {updatingAvatar ? (
                      <div className="flex items-center justify-center">
                        <TipioLoader size={20} variant="white" className="mr-2" />
                        Updating...
                      </div>
                    ) : (
                      <>
                        <Check className="mr-2 h-4 w-4" />
                        Save Changes
                      </>
                    )}
                  </Button>

                  {/* Messages */}
                  {avatarSuccess && (
                    <div className="mt-3 p-3 bg-green-500/10 border border-green-500/50 rounded-lg text-green-600 dark:text-green-400 text-sm flex items-center gap-2">
                      <Check className="w-4 h-4" />
                      Avatar updated!
                    </div>
                  )}
                  {avatarError && (
                    <div className="mt-3 p-3 bg-destructive/10 border border-destructive/50 rounded-lg text-destructive text-sm flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      {avatarError}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Account Section */}
          <div className="settings-item mb-6">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Account
            </h3>

            {/* Change Username */}
            <div className="bg-card rounded-xl border border-border overflow-hidden mb-2">
              <button
                onClick={() => toggleSection('username', usernameSectionRef)}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-[var(--brand-orange)] to-[var(--brand-pink)] rounded-full flex items-center justify-center">
                    <Edit3 className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-foreground">Change Username</p>
                    <p className="text-sm text-muted-foreground">Current: @{userProfile.username}</p>
                  </div>
                </div>
                <ChevronRight
                  className={`w-5 h-5 text-muted-foreground transition-transform ${
                    expandedSection === 'username' ? 'rotate-90' : ''
                  }`}
                />
              </button>

              {/* Expandable Content */}
              <div ref={usernameSectionRef} style={{ height: 0, opacity: 0, overflow: 'hidden' }}>
                <div className="px-6 pb-6 border-t border-border">
                  {/* New Username Input */}
                  <div className="mb-4 mt-6">
                    <Label htmlFor="newUsername" className="mb-2 block font-semibold text-sm">
                      New Username
                    </Label>
                    <div className="relative">
                      <Input
                        id="newUsername"
                        type="text"
                        placeholder="Enter new username"
                        value={newUsername}
                        onChange={(e) => setNewUsername(e.target.value.toLowerCase())}
                        className="pr-10"
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {checkingUsername && <TipioLoader size={16} variant="colored" />}
                        {!checkingUsername && usernameAvailable === true && (
                          <Check className="w-4 h-4 text-green-600" />
                        )}
                        {!checkingUsername && usernameAvailable === false && (
                          <AlertCircle className="w-4 h-4 text-destructive" />
                        )}
                      </div>
                    </div>
                    {newUsername && newUsername !== userProfile.username && (
                      <p className={`text-xs mt-2 ${
                        newUsername.length < 3
                          ? 'text-destructive'
                          : usernameAvailable === true
                          ? 'text-green-600 dark:text-green-400'
                          : usernameAvailable === false
                          ? 'text-destructive'
                          : 'text-muted-foreground'
                      }`}>
                        {newUsername.length < 3 && 'Username must be at least 3 characters'}
                        {newUsername.length >= 3 && usernameAvailable === true && 'Username is available'}
                        {newUsername.length >= 3 && usernameAvailable === false && 'Username is already taken'}
                        {newUsername.length >= 3 && usernameAvailable === null && 'Checking...'}
                      </p>
                    )}
                  </div>

                  {/* Warning */}
                  <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-[var(--brand-yellow)] rounded-lg">
                    <div className="flex gap-2">
                      <AlertCircle className="w-4 h-4 text-[var(--brand-yellow)] flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-foreground">
                        Your old username will become available for others.
                      </p>
                    </div>
                  </div>

                  {/* Change Button */}
                  <Button
                    onClick={handleChangeUsername}
                    disabled={changingUsername || !newUsername || usernameAvailable !== true}
                    className="w-full bg-gradient-to-r from-[var(--brand-orange)] to-[var(--brand-pink)] text-white hover:opacity-90"
                  >
                    {changingUsername ? (
                      <div className="flex items-center justify-center">
                        <TipioLoader size={20} variant="white" className="mr-2" />
                        Changing...
                      </div>
                    ) : (
                      <>
                        <Edit3 className="mr-2 h-4 w-4" />
                        Change Username
                      </>
                    )}
                  </Button>

                  {/* Messages */}
                  {usernameSuccess && (
                    <div className="mt-3 p-3 bg-green-500/10 border border-green-500/50 rounded-lg text-green-600 dark:text-green-400 text-sm flex items-center gap-2">
                      <Check className="w-4 h-4" />
                      Username changed successfully!
                    </div>
                  )}
                  {usernameError && (
                    <div className="mt-3 p-3 bg-destructive/10 border border-destructive/50 rounded-lg text-destructive text-sm flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      {usernameError}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Account Tier - Static Display */}
            <div className="bg-card rounded-xl border border-border px-6 py-4 flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-[var(--brand-pink)] to-[var(--brand-yellow)] rounded-full flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">Account Tier</p>
                  <p className="text-sm text-muted-foreground">
                    {'Premium' in userProfile.tier ? 'Premium Member' : 'Free Tier'}
                  </p>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                'Premium' in userProfile.tier
                  ? 'bg-gradient-to-r from-[var(--brand-yellow)] to-[var(--brand-orange)] text-white'
                  : 'bg-muted text-foreground'
              }`}>
                {'Premium' in userProfile.tier ? '⭐ Premium' : 'Free'}
              </span>
            </div>

            {/* Wallet Connection */}
            <div className="bg-card rounded-xl border border-border px-6 py-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-gradient-to-br from-[var(--brand-yellow)] to-[var(--brand-orange)] rounded-full flex items-center justify-center">
                  <Wallet className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-foreground">Wallet Connection</p>
                  <p className="text-sm text-muted-foreground">
                    {userProfile?.walletPrincipal && userProfile.walletPrincipal[0]
                      ? 'Manage your connected wallet'
                      : 'Connect wallet for withdrawals'}
                  </p>
                </div>
              </div>

              {!userProfile?.walletPrincipal || !userProfile?.walletPrincipal[0] ? (
                <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-3">
                    Connect a wallet to withdraw your tips and upgrade to Premium
                  </p>
                  <Button
                    onClick={() => setShowWalletModal(true)}
                    size="sm"
                    className="w-full bg-gradient-to-r from-[var(--brand-yellow)] to-[var(--brand-orange)] hover:opacity-90"
                  >
                    <Wallet className="w-4 h-4 mr-2" />
                    Connect Wallet
                  </Button>
                </div>
              ) : (
                <div className="mt-3 space-y-3">
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-muted-foreground">Wallet Type:</span>
                      <span className="text-xs text-[var(--brand-orange)] font-bold uppercase">
                        {userProfile.walletType[0]}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground break-all font-mono">
                      {userProfile.walletPrincipal[0].toString()}
                    </div>
                  </div>
                  <Button
                    onClick={async () => {
                      await disconnectAndRemoveWallet();
                    }}
                    size="sm"
                    variant="outline"
                    className="w-full hover:bg-destructive/10 hover:text-destructive hover:border-destructive"
                  >
                    Disconnect Wallet
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* App Settings Section */}
          <div className="settings-item mb-6">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              App Settings
            </h3>

            {/* Theme Toggle */}
            <div className="bg-card rounded-xl border border-border px-6 py-4 flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-[var(--brand-yellow)] to-[var(--brand-pink)] rounded-full flex items-center justify-center">
                  <SettingsIcon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">Theme</p>
                  <p className="text-sm text-muted-foreground">Choose your preferred theme</p>
                </div>
              </div>
              <ThemeToggle />
            </div>

            {/* Logout Button */}
            <div className="bg-card rounded-xl border border-border px-6 py-4">
              <Button
                onClick={identity.logout}
                variant="outline"
                className="w-full justify-center hover:bg-destructive hover:text-destructive-foreground hover:border-destructive transition-colors"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Logout from Internet Identity
              </Button>
            </div>
          </div>

          {/* Tokens Section */}
          <div className="settings-item mb-6">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Supported Tokens
            </h3>

            {/* Tokens List */}
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <div className="px-6 py-4 bg-gradient-to-r from-muted/40 to-muted/20 border-b border-border">
                <div className="flex items-center gap-3">
                  <Coins className="w-5 h-5 text-[var(--brand-yellow)]" />
                  <div>
                    <p className="font-semibold text-foreground">Available Tokens</p>
                    <p className="text-sm text-muted-foreground">ICRC-1 tokens you can receive</p>
                  </div>
                </div>
              </div>

              <div className="p-4">
                {tokensLoading ? (
                  <div className="text-center py-8">
                    <TipioLoader size={40} variant="colored" />
                  </div>
                ) : (
                  <div className="space-y-2">
                    {tokens.map((token) => (
                      <div
                        key={token.canisterId}
                        className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <TokenLogo symbol={token.symbol} size={32} />
                          <div>
                            <p className="font-semibold text-sm">{token.symbol}</p>
                            <p className="text-xs text-muted-foreground">{token.name}</p>
                          </div>
                        </div>
                        <div className="text-right text-xs text-muted-foreground">
                          <p>Fee: {(Number(token.fee) / Math.pow(10, token.decimals)).toFixed(token.decimals)} {token.symbol}</p>
                          <p className="font-mono text-xs">{token.decimals} decimals</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
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
        title="Connect Wallet"
        description="Choose a wallet to connect to your account"
      />
    </div>
  );
}
