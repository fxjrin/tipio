import { useState, useEffect } from 'react';
import {
  tokenRegistry,
  SUPPORTED_TOKEN_CANISTERS,
  getTokenBySymbol,
  getTokenByCanisterId,
} from '@/libs/icrc1';

/**
 * Hook for managing token registry
 * Provides easy access to token metadata with auto-fetching
 */
export function useTokenRegistry() {
  const [tokens, setTokens] = useState(() => tokenRegistry.getAllTokens());
  const [loading, setLoading] = useState(false);

  // Update tokens list when registry changes
  useEffect(() => {
    const interval = setInterval(() => {
      setTokens(tokenRegistry.getAllTokens());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  /**
   * Refresh token metadata from chain
   */
  const refreshToken = async (canisterId) => {
    setLoading(true);
    try {
      // Clear cache for this token
      tokenRegistry.tokens.delete(canisterId);

      // Fetch fresh metadata
      const metadata = await tokenRegistry.getToken(canisterId);
      setTokens(tokenRegistry.getAllTokens());
      return metadata;
    } catch (error) {
      console.error('Error refreshing token:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Get token by symbol or canister ID
   */
  const getToken = async (symbolOrCanisterId) => {
    // Check if it's a symbol (ICP, ckBTC, etc.)
    if (SUPPORTED_TOKEN_CANISTERS[symbolOrCanisterId]) {
      return await getTokenBySymbol(symbolOrCanisterId);
    }

    // Otherwise treat as canister ID
    return tokens.find(t => t.canisterId === symbolOrCanisterId);
  };

  /**
   * Add new token by canister ID
   */
  const addToken = async (canisterId) => {
    setLoading(true);
    try {
      const metadata = await tokenRegistry.getToken(canisterId);
      setTokens(tokenRegistry.getAllTokens());
      return metadata;
    } catch (error) {
      console.error('Error adding token:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Get all supported token symbols
   */
  const getSupportedSymbols = () => {
    return Object.keys(SUPPORTED_TOKEN_CANISTERS);
  };

  return {
    tokens,
    loading,
    getToken,
    refreshToken,
    addToken,
    getSupportedSymbols,
    SUPPORTED_TOKEN_CANISTERS,
  };
}

/**
 * Hook for getting single token metadata
 * Auto-fetches from blockchain if not cached
 */
export function useToken(symbolOrCanisterId) {
  const [metadata, setMetadata] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchToken() {
      try {
        setLoading(true);
        setError(null);

        // Check if it's a known symbol (ICP, ckBTC, etc.)
        if (SUPPORTED_TOKEN_CANISTERS[symbolOrCanisterId]) {
          const data = await getTokenBySymbol(symbolOrCanisterId);
          setMetadata(data);
          return;
        }

        // Fetch by canister ID
        const data = await tokenRegistry.getToken(symbolOrCanisterId);
        setMetadata(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    if (symbolOrCanisterId) {
      fetchToken();
    }
  }, [symbolOrCanisterId]);

  return { metadata, loading, error };
}
