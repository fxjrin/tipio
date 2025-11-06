import { useState, useEffect } from 'react';
import { ICP_LEDGER_ID, CKBTC_LEDGER_ID, CKUSDC_LEDGER_ID } from '@/libs/constants';

/**
 * Hook to fetch real-time token prices from ICPSwap
 * Returns prices in USD for ICP, ckBTC, and ckUSDC
 */
export function useTokenPrices() {
  const [prices, setPrices] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    let intervalId = null;

    const fetchPrices = async () => {
      try {
        // Use CoinGecko API for reliable token prices
        // Free tier allows 10-50 requests/minute
        const COINGECKO_API = 'https://api.coingecko.com/api/v3/simple/price';

        const priceData = {};

        try {
          // Fetch ICP and BTC prices from CoinGecko
          // ICP = internet-computer, BTC for ckBTC
          const response = await fetch(
            `${COINGECKO_API}?ids=internet-computer,bitcoin&vs_currencies=usd`
          );

          if (response.ok) {
            const data = await response.json();

            // ICP price
            if (data['internet-computer']?.usd) {
              priceData.ICP = data['internet-computer'].usd;
            }

            // ckBTC tracks Bitcoin price 1:1
            if (data['bitcoin']?.usd) {
              priceData.ckBTC = data['bitcoin'].usd;
            }

            // ckUSDC is stablecoin pegged to $1
            priceData.ckUSDC = 1.0;
          } else {
            console.warn('CoinGecko API response not OK:', response.status);
          }
        } catch (err) {
          console.warn('Failed to fetch token prices from CoinGecko:', err);
        }

        // Ensure ckUSDC always has fallback
        if (!priceData.ckUSDC) {
          priceData.ckUSDC = 1.0;
        }

        if (isMounted) {
          setPrices(priceData);
          setLoading(false);
          setError(null);
        }
      } catch (err) {
        console.error('Error fetching token prices:', err);
        if (isMounted) {
          setError(err.message);
          setLoading(false);
        }
      }
    };

    // Initial fetch
    fetchPrices();

    // Refresh prices every 30 seconds
    intervalId = setInterval(fetchPrices, 30000);

    return () => {
      isMounted = false;
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, []);

  /**
   * Calculate USD value for a token amount
   * @param {number} amount - Token amount (already converted to token units, not base units)
   * @param {string} token - Token symbol (ICP, ckBTC, ckUSDC)
   * @returns {number} USD value
   */
  const calculateUSD = (amount, token) => {
    const price = prices[token];
    if (!price || !amount) return 0;

    // Amount is already in token units (e.g., 1.5 ICP, not 150000000)
    return Number(amount) * price;
  };

  /**
   * Format USD value with $ sign
   * @param {number} value - USD value
   * @returns {string} Formatted USD string
   */
  const formatUSD = (value) => {
    if (!value || value === 0) return '$0.00';
    if (value < 0.01) return '<$0.01';
    return `$${value.toFixed(2)}`;
  };

  return {
    prices,
    loading,
    error,
    calculateUSD,
    formatUSD
  };
}
