export function formatMoney(amount: number, decimals: number = 2): string {
  return amount.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}
