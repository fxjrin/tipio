// Merge Tailwind classes conditionally (like clsx)
export const cn = (...classes) => {
  return classes.filter(Boolean).join(' ');
};

// Convert human-readable amount to token base units (e.g., 1.5 ICP → 150000000)
export const toBaseUnits = (amount, decimals) => {
  return BigInt(Math.round(amount * 10 ** decimals));
};

// Convert token base units to human-readable amount (e.g., 150000000 → 1.5 ICP)
export const toMainUnit = (amount, decimals) => {
  return Number(amount) / 10 ** decimals;
};
