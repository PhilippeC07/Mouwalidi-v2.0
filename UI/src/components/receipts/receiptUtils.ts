import type { ReceiptData } from '../../api/billing/billing.api';

export function fmtDate(iso: string) {
  const d = new Date(iso);
  const day = String(d.getUTCDate()).padStart(2, '0');
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${d.getUTCFullYear()}`;
}

export function consumptionLabel(r: ReceiptData) {
  return r.threePhase ? `3x${r.ampere} Amp(KWH)` : `${r.ampere} Amp(KWH)`;
}

/** Plain display: whole numbers as-is, otherwise 1 decimal place — no thousands separators. */
export function plainNumber(n: number): string {
  const rounded = Math.round(n * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

export function receiptMonthNum(iso: string): number {
  return new Date(iso).getUTCMonth() + 1;
}
