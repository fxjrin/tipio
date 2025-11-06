import { HttpAgent } from '@dfinity/agent';
import { IcrcLedgerCanister } from '@dfinity/ledger-icrc';
import { Principal } from '@dfinity/principal';
import {
  SUPPORTED_TOKEN_CANISTERS,
  COMMON_TOKEN_CANISTERS,
  getTokenByCanisterId,
} from './icrc1';

/**
 * Detect all ICRC-1 tokens that user owns in their wallet
 * Featured tokens (ICP, ckBTC, ckUSDC, ckETH, ckUSDT) are ALWAYS shown even with 0 balance
 *
 * @param {Principal} walletPrincipal - User's wallet principal
 * @returns {Promise<Array>} Array of tokens (featured always shown, others only if balance > 0)
 */
export async function detectUserTokens(walletPrincipal) {
  if (!walletPrincipal) {
    throw new Error('Wallet principal is required');
  }

  const agent = new HttpAgent({ host: 'https://icp0.io' });

  // Combine whitelist + common tokens
  const allTokensToCheck = {
    ...SUPPORTED_TOKEN_CANISTERS,
    ...COMMON_TOKEN_CANISTERS,
  };

  // Check balance for each token in parallel
  const balanceChecks = Object.entries(allTokensToCheck).map(
    async ([symbol, canisterId]) => {
      try {
        const ledger = IcrcLedgerCanister.create({
          agent,
          canisterId: Principal.fromText(canisterId),
        });

        const balance = await ledger.balance({
          owner: walletPrincipal,
          certified: false,
        });

        const isWhitelisted = symbol in SUPPORTED_TOKEN_CANISTERS;

        // Include if: (1) Whitelisted (always show) OR (2) Has balance > 0
        if (isWhitelisted || balance > 0n) {
          // Fetch full metadata
          const metadata = await getTokenByCanisterId(canisterId);

          return {
            symbol: metadata?.symbol || symbol,
            canisterId,
            balance,
            decimals: metadata?.decimals || 8,
            logo: metadata?.logo || null,
            metadata,
            isWhitelisted,
          };
        }

        return null;
      } catch (error) {
        console.error(`Error checking balance for ${symbol}:`, error);
        return null;
      }
    }
  );

  // Wait for all balance checks
  const results = await Promise.all(balanceChecks);

  // Filter out nulls and sort by priority
  const validTokens = results.filter((token) => token !== null);

  // Sort: Whitelist first (by balance desc), then others (by balance desc)
  validTokens.sort((a, b) => {
    // Whitelist tokens come first
    if (a.isWhitelisted && !b.isWhitelisted) return -1;
    if (!a.isWhitelisted && b.isWhitelisted) return 1;

    // Within same group, sort by balance (descending)
    return Number(b.balance - a.balance);
  });

  return validTokens;
}

/**
 * Check balance for a single token
 *
 * @param {Principal} walletPrincipal - User's wallet principal
 * @param {string} canisterId - Token ledger canister ID
 * @returns {Promise<bigint>} Token balance
 */
export async function checkTokenBalance(walletPrincipal, canisterId) {
  if (!walletPrincipal || !canisterId) {
    throw new Error('Wallet principal and canister ID are required');
  }

  try {
    const agent = new HttpAgent({ host: 'https://icp0.io' });
    const ledger = IcrcLedgerCanister.create({
      agent,
      canisterId: Principal.fromText(canisterId),
    });

    const balance = await ledger.balance({
      owner: walletPrincipal,
      certified: false,
    });

    return balance;
  } catch (error) {
    console.error(`Error checking balance for ${canisterId}:`, error);
    return 0n;
  }
}

/**
 * Format token amount with proper decimals
 *
 * @param {bigint} balance - Token balance in base units
 * @param {number} decimals - Token decimals
 * @returns {string} Formatted balance
 */
export function formatTokenBalance(balance, decimals) {
  const value = Number(balance) / Math.pow(10, decimals);
  return value.toFixed(decimals);
}
