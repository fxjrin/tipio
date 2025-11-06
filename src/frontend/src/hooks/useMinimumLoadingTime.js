import { useState, useEffect } from 'react';

/**
 * Custom hook to ensure loading state shows for a minimum duration
 * This ensures the TipioLoader animation looks smooth
 *
 * @param {boolean} isLoading - The actual loading state from your data fetch
 * @param {number} minDuration - Minimum duration in milliseconds (default: 2000ms)
 * @returns {boolean} - Returns true if still loading OR minimum time hasn't elapsed
 */
export function useMinimumLoadingTime(isLoading, minDuration = 2000) {
  const [isMinimumTimeElapsed, setIsMinimumTimeElapsed] = useState(false);
  const [wasLoading, setWasLoading] = useState(false);

  useEffect(() => {
    if (isLoading && !wasLoading) {
      // Loading just started - reset timer
      setWasLoading(true);
      setIsMinimumTimeElapsed(false);

      const timer = setTimeout(() => {
        setIsMinimumTimeElapsed(true);
      }, minDuration);

      return () => clearTimeout(timer);
    }

    if (!isLoading && wasLoading) {
      // Loading finished
      setWasLoading(false);
    }
  }, [isLoading, wasLoading, minDuration]);

  // Show loading if:
  // 1. Currently loading, OR
  // 2. Was loading but minimum time hasn't elapsed yet
  return isLoading || (wasLoading && !isMinimumTimeElapsed);
}
