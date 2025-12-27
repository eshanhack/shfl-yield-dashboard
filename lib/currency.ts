// Currency conversion utilities

export interface Currency {
  code: string;
  symbol: string;
  name: string;
}

export const CURRENCIES: Currency[] = [
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "GBP", symbol: "£", name: "British Pound" },
  { code: "AUD", symbol: "A$", name: "Australian Dollar" },
  { code: "CAD", symbol: "C$", name: "Canadian Dollar" },
  { code: "JPY", symbol: "¥", name: "Japanese Yen" },
  { code: "CHF", symbol: "Fr", name: "Swiss Franc" },
  { code: "CNY", symbol: "¥", name: "Chinese Yuan" },
  { code: "INR", symbol: "₹", name: "Indian Rupee" },
  { code: "KRW", symbol: "₩", name: "South Korean Won" },
  { code: "SGD", symbol: "S$", name: "Singapore Dollar" },
  { code: "HKD", symbol: "HK$", name: "Hong Kong Dollar" },
  { code: "NZD", symbol: "NZ$", name: "New Zealand Dollar" },
  { code: "SEK", symbol: "kr", name: "Swedish Krona" },
  { code: "MXN", symbol: "MX$", name: "Mexican Peso" },
  { code: "BRL", symbol: "R$", name: "Brazilian Real" },
  { code: "ZAR", symbol: "R", name: "South African Rand" },
  { code: "AED", symbol: "د.إ", name: "UAE Dirham" },
  { code: "THB", symbol: "฿", name: "Thai Baht" },
  { code: "PHP", symbol: "₱", name: "Philippine Peso" },
];

// Approximate exchange rates from USD (updated periodically)
// In production, these would be fetched from an API
export const EXCHANGE_RATES: Record<string, number> = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  AUD: 1.57,
  CAD: 1.44,
  JPY: 157.5,
  CHF: 0.90,
  CNY: 7.30,
  INR: 84.5,
  KRW: 1450,
  SGD: 1.35,
  HKD: 7.82,
  NZD: 1.73,
  SEK: 11.0,
  MXN: 20.5,
  BRL: 6.15,
  ZAR: 18.5,
  AED: 3.67,
  THB: 34.5,
  PHP: 58.5,
};

export function convertFromUSD(amountUSD: number, targetCurrency: string): number {
  const rate = EXCHANGE_RATES[targetCurrency] || 1;
  return amountUSD * rate;
}

export function formatCurrency(amount: number, currencyCode: string): string {
  const currency = CURRENCIES.find(c => c.code === currencyCode);
  if (!currency) return `$${amount.toFixed(2)}`;
  
  // Handle currencies with no decimal places (JPY, KRW)
  const noDecimals = ["JPY", "KRW"];
  const decimals = noDecimals.includes(currencyCode) ? 0 : 2;
  
  // Format with appropriate decimal places
  const formatted = amount.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  
  return `${currency.symbol}${formatted}`;
}

export function formatCurrencyCompact(amount: number, currencyCode: string): string {
  const currency = CURRENCIES.find(c => c.code === currencyCode);
  if (!currency) return `$${amount.toFixed(2)}`;
  
  if (amount >= 1_000_000) {
    return `${currency.symbol}${(amount / 1_000_000).toFixed(2)}M`;
  }
  if (amount >= 1_000) {
    return `${currency.symbol}${(amount / 1_000).toFixed(1)}K`;
  }
  
  const noDecimals = ["JPY", "KRW"];
  const decimals = noDecimals.includes(currencyCode) ? 0 : 2;
  
  return `${currency.symbol}${amount.toFixed(decimals)}`;
}

