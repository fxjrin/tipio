import { useState, useEffect } from 'react';
import { AuthClient } from '@dfinity/auth-client';
import { HttpAgent, Actor } from '@dfinity/agent';
import { idlFactory } from 'declarations/backend';

const BACKEND_CANISTER_ID = 'vtsa7-6qaaa-aaaah-arlkq-cai';

// Internet Identity provider (using id.ai - new II v2)
// Use remote II (id.ai) unless explicitly using local II canister
const IDENTITY_PROVIDER = process.env.USE_LOCAL_II === 'true'
  ? `http://localhost:4943/?canisterId=${process.env.CANISTER_ID_INTERNET_IDENTITY}`
  : 'https://id.ai';

/**
 * Hook for Internet Identity authentication
 * This handles user identity/account ownership (not wallet transactions)
 */
export function useInternetIdentity() {
  const [authClient, setAuthClient] = useState(null);
  const [identity, setIdentity] = useState(null);
  const [principal, setPrincipal] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [backendActor, setBackendActor] = useState(null);

  // Initialize AuthClient on mount
  useEffect(() => {
    const initAuth = async () => {
      try {
        const client = await AuthClient.create({
          idleOptions: {
            disableIdle: true, // Disable idle timeout completely
            disableDefaultIdleCallback: true // Disable default reload behavior
          }
        });
        setAuthClient(client);

        // Check if already authenticated
        const isAuthed = await client.isAuthenticated();

        if (isAuthed) {
          const identity = client.getIdentity();
          const principal = identity.getPrincipal();

          setIdentity(identity);
          setPrincipal(principal);
          setIsAuthenticated(true);

          // Create backend actor with identity
          await createBackendActor(identity);
        }
      } catch (error) {
        console.error('Error initializing auth client:', error);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  // Create backend actor with authenticated identity
  const createBackendActor = async (identity) => {
    try {
      // Check if backend is on local replica or mainnet
      const isLocalBackend = BACKEND_CANISTER_ID.includes('aaaaa-aa') ||
                             BACKEND_CANISTER_ID.length < 20; // Local canister IDs are shorter

      const agent = new HttpAgent({
        identity,
        host: isLocalBackend ? 'http://localhost:4943' : 'https://icp0.io',
      });

      // Fetch root key for local backend only
      if (isLocalBackend) {
        await agent.fetchRootKey();
      }

      const actor = Actor.createActor(idlFactory, {
        agent,
        canisterId: BACKEND_CANISTER_ID,
      });

      setBackendActor(actor);
      return actor;
    } catch (error) {
      console.error('Error creating backend actor:', error);
      throw error;
    }
  };

  /**
   * Login with Internet Identity
   * Opens II auth window and handles callback
   */
  const login = async () => {
    if (!authClient) {
      throw new Error('Auth client not initialized');
    }

    setLoading(true);

    return new Promise((resolve, reject) => {
      authClient.login({
        identityProvider: IDENTITY_PROVIDER,
        onSuccess: async () => {
          try {
            const identity = authClient.getIdentity();
            const principal = identity.getPrincipal();

            setIdentity(identity);
            setPrincipal(principal);
            setIsAuthenticated(true);

            // Create backend actor with new identity
            const actor = await createBackendActor(identity);

            setLoading(false);
            resolve({ identity, principal, actor });
          } catch (error) {
            setLoading(false);
            reject(error);
          }
        },
        onError: (error) => {
          console.error('Login error:', error);
          setLoading(false);
          reject(error);
        },
        // Maximum time to live for the identity (30 days - effectively no expiration)
        maxTimeToLive: BigInt(30 * 24 * 60 * 60 * 1000 * 1000 * 1000),
      });
    });
  };

  /**
   * Logout from Internet Identity
   * Clears identity and session
   */
  const logout = async () => {
    if (!authClient) return;

    try {
      await authClient.logout();
      setIdentity(null);
      setPrincipal(null);
      setIsAuthenticated(false);
      setBackendActor(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return {
    // State
    identity,
    principal,
    isAuthenticated,
    loading,
    backendActor,

    // Methods
    login,
    logout,
  };
}
