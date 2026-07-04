// Supported currencies + formatting helper.

export type CurrencyMeta = { code: string; symbol: string; label: string; locale: string };

export const CURRENCIES: CurrencyMeta[] = [
  { code: "INR", symbol: "₹", label: "Indian Rupee", locale: "en-IN" },
  { code: "USD", symbol: "$", label: "US Dollar", locale: "en-US" },
  { code: "EUR", symbol: "€", label: "Euro", locale: "en-IE" },
  { code: "GBP", symbol: "£", label: "British Pound", locale: "en-GB" },
  { code: "AED", symbol: "د.إ", label: "UAE Dirham", locale: "en-AE" },
  { code: "JPY", symbol: "¥", label: "Japanese Yen", locale: "ja-JP" },
];

export function currencyMeta(code: string): CurrencyMeta {
  return CURRENCIES.find((c) => c.code === code) ?? CURRENCIES[0];
}

// Format an amount for display, e.g. formatMoney(1234.5, "INR") => "₹1,234.50"
export function formatMoney(amount: number, code: string): string {
  const meta = currencyMeta(code);
  try {
    return new Intl.NumberFormat(meta.locale, {
      style: "currency",
      currency: meta.code,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${meta.symbol}${amount.toFixed(2)}`;
  }
}
