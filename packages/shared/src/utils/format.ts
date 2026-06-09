// Format utilities
// SPDX-License-Identifier: Apache-2.0

/**
 * Format price for display
 */
export function formatPrice(price: string | bigint, currency: string = 'XRP', decimals: number = 6): string {
  const priceBigInt = typeof price === 'string' ? BigInt(price) : price;
  const divisor = BigInt(10 ** decimals);
  const whole = priceBigInt / divisor;
  const fractional = priceBigInt % divisor;
  
  const fractionalStr = fractional.toString().padStart(decimals, '0').replace(/0+$/, '');
  
  if (fractionalStr === '') {
    return `${whole.toString()} ${currency}`;
  }
  
  return `${whole.toString()}.${fractionalStr} ${currency}`;
}

/**
 * Parse price string to base units
 */
export function parsePrice(price: string, decimals: number = 6): string {
  const [whole, fractional = ''] = price.split('.');
  const paddedFractional = fractional.padEnd(decimals, '0').slice(0, decimals);
  const value = BigInt(whole) * BigInt(10 ** decimals) + BigInt(paddedFractional);
  return value.toString();
}

/**
 * Truncate address for display
 */
export function truncateAddress(address: string, startChars: number = 6, endChars: number = 4): string {
  if (address.length <= startChars + endChars + 3) {
    return address;
  }
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
}

/**
 * Sleep for specified milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
