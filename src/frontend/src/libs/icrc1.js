import { Actor, HttpAgent } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';

/**
 * ICRC-1 Token Metadata Fetcher
 * Automatically fetch token metadata (name, symbol, decimals, fee, logo)
 */

// ICRC-1 Standard IDL
const icrc1IDL = ({ IDL }) => {
  const Value = IDL.Rec();
  Value.fill(
    IDL.Variant({
      Nat: IDL.Nat,
      Int: IDL.Int,
      Text: IDL.Text,
      Blob: IDL.Vec(IDL.Nat8),
      Array: IDL.Vec(Value),
    })
  );

  return IDL.Service({
    // Metadata
    icrc1_name: IDL.Func([], [IDL.Text], ['query']),
    icrc1_symbol: IDL.Func([], [IDL.Text], ['query']),
    icrc1_decimals: IDL.Func([], [IDL.Nat8], ['query']),
    icrc1_fee: IDL.Func([], [IDL.Nat], ['query']),
    icrc1_metadata: IDL.Func([], [IDL.Vec(IDL.Tuple(IDL.Text, Value))], ['query']),
  });
};

/**
 * Fetch complete ICRC-1 token metadata
 * @param {string} canisterId - Token ledger canister ID
 * @returns {Promise<Object>} Token metadata
 */
export async function fetchTokenMetadata(canisterId) {
  try {
    const agent = new HttpAgent({ host: 'https://icp0.io' });

    const actor = Actor.createActor(icrc1IDL, {
      agent,
      canisterId: Principal.fromText(canisterId),
    });

    // Fetch all metadata in parallel
    const [name, symbol, decimals, fee, metadata] = await Promise.all([
      actor.icrc1_name().catch(() => 'Unknown'),
      actor.icrc1_symbol().catch(() => 'UNKNOWN'),
      actor.icrc1_decimals().catch(() => 8),
      actor.icrc1_fee().catch(() => 10000n),
      actor.icrc1_metadata().catch(() => []),
    ]);

    // Parse metadata array for additional info
    const metadataMap = {};
    metadata.forEach(([key, value]) => {
      if ('Text' in value) {
        metadataMap[key] = value.Text;
      } else if ('Nat' in value) {
        metadataMap[key] = value.Nat;
      } else if ('Blob' in value) {
        metadataMap[key] = value.Blob;
      }
    });

    // Extract logo (can be URL or base64 blob)
    let logo = null;
    if (metadataMap['icrc1:logo']) {
      logo = metadataMap['icrc1:logo'];
    } else if (metadataMap.logo) {
      logo = metadataMap.logo;
    }

    return {
      canisterId,
      name,
      symbol,
      decimals: Number(decimals),
      fee: fee,
      logo,
      metadata: metadataMap,
      timestamp: Date.now(),
    };
  } catch (error) {
    console.error(`Error fetching metadata for ${canisterId}:`, error);
    throw error;
  }
}

/**
 * Format token amount with proper decimals
 * @param {bigint} amount - Amount in base units
 * @param {number} decimals - Token decimals
 * @returns {string} Formatted amount
 */
export function formatTokenAmount(amount, decimals) {
  const value = Number(amount) / Math.pow(10, decimals);
  return value.toFixed(decimals);
}

/**
 * Parse token amount to base units
 * @param {string|number} amount - Human-readable amount
 * @param {number} decimals - Token decimals
 * @returns {bigint} Amount in base units
 */
export function parseTokenAmount(amount, decimals) {
  return BigInt(Math.floor(parseFloat(amount) * Math.pow(10, decimals)));
}

/**
 * Token Registry with caching
 */
class TokenRegistry {
  constructor() {
    this.tokens = new Map();
    this.loadFromStorage();
  }

  /**
   * Get token metadata (fetch if not cached)
   */
  async getToken(canisterId) {
    // Check cache first
    if (this.tokens.has(canisterId)) {
      const cached = this.tokens.get(canisterId);

      // Cache expires after 1 hour
      if (Date.now() - cached.timestamp < 3600000) {
        return cached;
      }
    }

    // Fetch fresh metadata
    const metadata = await fetchTokenMetadata(canisterId);
    this.tokens.set(canisterId, metadata);
    this.saveToStorage();

    return metadata;
  }

  /**
   * Add token manually (for quick setup)
   */
  addToken(canisterId, metadata) {
    this.tokens.set(canisterId, {
      ...metadata,
      canisterId,
      timestamp: Date.now(),
    });
    this.saveToStorage();
  }

  /**
   * Get all registered tokens
   */
  getAllTokens() {
    return Array.from(this.tokens.values());
  }

  /**
   * Save to localStorage
   */
  saveToStorage() {
    try {
      const data = {};
      this.tokens.forEach((value, key) => {
        // Convert BigInt to string for JSON serialization
        const serializable = { ...value };

        // Handle fee (BigInt → string)
        if (typeof value.fee === 'bigint') {
          serializable.fee = value.fee.toString();
        }

        // Handle metadata object (may contain BigInt values)
        if (value.metadata && typeof value.metadata === 'object') {
          serializable.metadata = {};
          Object.entries(value.metadata).forEach(([k, v]) => {
            if (typeof v === 'bigint') {
              serializable.metadata[k] = v.toString();
            } else {
              serializable.metadata[k] = v;
            }
          });
        }

        data[key] = serializable;
      });

      localStorage.setItem('tipio_token_registry', JSON.stringify(data));
    } catch (error) {
      console.error('Error saving token registry:', error);
    }
  }

  /**
   * Load from localStorage
   */
  loadFromStorage() {
    try {
      const stored = localStorage.getItem('tipio_token_registry');
      if (stored) {
        const data = JSON.parse(stored);
        Object.entries(data).forEach(([key, value]) => {
          // Convert string back to BigInt
          const token = { ...value };

          // Restore fee as BigInt
          if (typeof value.fee === 'string') {
            token.fee = BigInt(value.fee);
          }

          // Restore metadata BigInt values
          if (value.metadata && typeof value.metadata === 'object') {
            token.metadata = {};
            Object.entries(value.metadata).forEach(([k, v]) => {
              // Check if it's a numeric string that should be BigInt
              if (typeof v === 'string' && /^\d+$/.test(v) && k.includes('fee')) {
                token.metadata[k] = BigInt(v);
              } else {
                token.metadata[k] = v;
              }
            });
          }

          this.tokens.set(key, token);
        });
      }
    } catch (error) {
      console.error('Error loading token registry:', error);
    }
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.tokens.clear();
    localStorage.removeItem('tipio_token_registry');
  }
}

// Export singleton instance
export const tokenRegistry = new TokenRegistry();

/**
 * Pre-defined supported token canister IDs (Whitelist)
 * Metadata will be fetched automatically from blockchain
 */
export const SUPPORTED_TOKEN_CANISTERS = {
  ICP: 'ryjl3-tyaaa-aaaaa-aaaba-cai',
  ckBTC: 'mxzaz-hqaaa-aaaar-qaada-cai',
  ckUSDC: 'xevnm-gaaaa-aaaar-qafnq-cai',
  ckETH: 'ss2fx-dyaaa-aaaar-qacoq-cai',
  ckUSDT: 'cngnf-vqaaa-aaaar-qag4q-cai',
};

/**
 * Common ICP ecosystem tokens (for auto-detection)
 * These will be checked for balance if user connects wallet
 */
export const COMMON_TOKEN_CANISTERS = {
  SNS1: 'zfcdd-tqaaa-aaaaq-aaaga-cai',
  CHAT: '2ouva-viaaa-aaaaq-aaamq-cai', // OpenChat token
  // Add more popular tokens as needed
};

/**
 * Auto-initialize supported tokens on first import
 */
let isInitialized = false;

export async function initializeSupportedTokens() {
  if (isInitialized) return;

  try {
    // Fetch metadata for all supported tokens
    await Promise.all(
      Object.values(SUPPORTED_TOKEN_CANISTERS).map(canisterId =>
        tokenRegistry.getToken(canisterId).catch(err => {
          console.warn(`Failed to fetch metadata for ${canisterId}:`, err);
        })
      )
    );
    isInitialized = true;
  } catch (error) {
    console.error('Error initializing supported tokens:', error);
  }
}

// Auto-initialize on module load (background)
initializeSupportedTokens();

/**
 * Get token by symbol (e.g., "ICP", "ckBTC")
 * @param {string} symbol - Token symbol
 * @returns {Promise<Object>} Token metadata from registry
 */
export async function getTokenBySymbol(symbol) {
  const canisterId = SUPPORTED_TOKEN_CANISTERS[symbol];
  if (!canisterId) {
    throw new Error(`Unsupported token symbol: ${symbol}`);
  }
  return await tokenRegistry.getToken(canisterId);
}

/**
 * Get token by canister ID
 * @param {string} canisterId - Token ledger canister ID
 * @returns {Promise<Object>} Token metadata
 */
export async function getTokenByCanisterId(canisterId) {
  return await tokenRegistry.getToken(canisterId);
}

/**
 * Check if a token symbol is supported
 * @param {string} symbol - Token symbol
 * @returns {boolean}
 */
export function isTokenSupported(symbol) {
  return symbol in SUPPORTED_TOKEN_CANISTERS;
}
