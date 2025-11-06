import { createContext, useContext, useState, useEffect } from 'react';
import { Actor, HttpAgent } from '@dfinity/agent';
import { useInternetIdentity } from '@/hooks/useInternetIdentity';
import { useWalletConnection } from '@/hooks/useWalletConnection';
import { idlFactory } from 'declarations/backend';

const AuthContext = createContext(null);

// Get backend canister ID from environment or use mainnet ID
const BACKEND_CANISTER_ID = import.meta.env.VITE_CANISTER_ID_BACKEND ||
  import.meta.env.CANISTER_ID_BACKEND ||
  'vtsa7-6qaaa-aaaah-arlkq-cai'; // mainnet canister ID

/**
 * New AuthProvider with separate Internet Identity and Wallet connections
 *
 * Architecture:
 * - Internet Identity (II): For user account/identity (register, login, own data)
 * - Wallet (OISY/Plug): For crypto transactions (send tips, withdraw)
 *
 * Flow:
 * 1. Register/Dashboard: Login with II → Register username → Optionally connect wallet
 * 2. Send Tip (Public): No II required → Just connect wallet → Send tip
 */
export function AuthProvider({ children }) {
  // Internet Identity authentication
  const internetIdentity = useInternetIdentity();

  // Wallet connection (OISY or Plug)
  const wallet = useWalletConnection();

  // User profile state
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Anonymous backend for public queries (no authentication needed)
  const [anonymousBackend, setAnonymousBackend] = useState(null);

  // Create anonymous backend for query calls (no approval needed)
  useEffect(() => {
    const initAnonymousBackend = async () => {
      // Check if backend is on local replica or mainnet
      const isLocalBackend = BACKEND_CANISTER_ID.includes('aaaaa-aa') ||
                             BACKEND_CANISTER_ID.length < 20; // Local canister IDs are shorter

      const host = isLocalBackend ? 'http://localhost:4943' : 'https://icp0.io';
      const agent = new HttpAgent({ host });

      // Fetch root key for local backend only
      if (isLocalBackend) {
        await agent.fetchRootKey();
      }

      const actor = Actor.createActor(idlFactory, {
        agent,
        canisterId: BACKEND_CANISTER_ID,
      });
      setAnonymousBackend(actor);
    };

    initAnonymousBackend();
  }, []);

  // Check if user has registered username when II is authenticated
  useEffect(() => {
    const checkUserProfile = async () => {
      if (internetIdentity.isAuthenticated && internetIdentity.principal && anonymousBackend) {
        setLoading(true);
        try {
          // Use anonymous backend for query - no approval needed
          const profile = await anonymousBackend.getUserByPrincipal(internetIdentity.principal);

          if (profile.length > 0) {
            setUserProfile(profile[0]);
          } else {
            setUserProfile(null);
          }
        } catch (error) {
          console.error('❌ Error fetching user profile:', error);
          setUserProfile(null);
        } finally {
          setLoading(false);
        }
      } else if (!internetIdentity.isAuthenticated) {
        // User not authenticated yet
        setUserProfile(null);
        setLoading(true);
      } else {
        // Authenticated but waiting for principal or backend
        setUserProfile(null);
      }
    };

    checkUserProfile();
  }, [internetIdentity.isAuthenticated, internetIdentity.principal, anonymousBackend]);

  /**
   * Connect wallet and save to user profile
   * This is called from Dashboard after user is logged in with II
   */
  const connectAndSaveWallet = async (walletType) => {
    try {
      // Connect wallet
      const { principal: walletPrincipal } = await wallet.connect(walletType);

      // Save wallet info to backend using II actor
      if (internetIdentity.backendActor) {
        const result = await internetIdentity.backendActor.connectWallet(
          walletPrincipal,
          walletType
        );

        if ('ok' in result) {
          setUserProfile(result.ok);
          return { success: true, profile: result.ok };
        } else {
          throw new Error(result.err);
        }
      } else {
        throw new Error('Please login with Internet Identity first');
      }
    } catch (error) {
      console.error('Error connecting and saving wallet:', error);
      return { success: false, error: error.message };
    }
  };

  /**
   * Disconnect wallet and remove from user profile
   */
  const disconnectAndRemoveWallet = async () => {
    try {
      // Remove wallet info from backend using II actor
      if (internetIdentity.backendActor) {
        const result = await internetIdentity.backendActor.disconnectWallet();

        if ('ok' in result) {
          setUserProfile(result.ok);
          wallet.disconnect();
          return { success: true, profile: result.ok };
        } else {
          throw new Error(result.err);
        }
      } else {
        throw new Error('Please login with Internet Identity first');
      }
    } catch (error) {
      console.error('Error disconnecting wallet:', error);
      return { success: false, error: error.message };
    }
  };

  /**
   * Refresh user profile from backend
   */
  const refreshProfile = async () => {
    if (internetIdentity.principal && anonymousBackend) {
      // Use anonymous backend for query - no approval needed
      const profile = await anonymousBackend.getUserByPrincipal(internetIdentity.principal);
      setUserProfile(profile.length > 0 ? profile[0] : null);
    }
  };

  const value = {
    // Internet Identity (for account ownership)
    identity: {
      ...internetIdentity,
      isAuthenticated: internetIdentity.isAuthenticated,
      principal: internetIdentity.principal,
      backendActor: internetIdentity.backendActor,
    },

    // Wallet connection (for transactions)
    wallet: {
      ...wallet,
      isConnected: wallet.isConnected,
      walletType: wallet.walletType,
      walletPrincipal: wallet.walletPrincipal,
      walletAgent: wallet.walletAgent,
    },

    // User profile & helpers
    userProfile,
    loading,
    hasUsername: !!userProfile,
    anonymousBackend,

    // Combined actions
    connectAndSaveWallet,
    disconnectAndRemoveWallet,
    refreshProfile,

    // Backward compatibility (deprecated, use identity.* or wallet.*)
    isConnected: internetIdentity.isAuthenticated, // Renamed for clarity
    principal: internetIdentity.principal,
    backendActor: internetIdentity.backendActor,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
