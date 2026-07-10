import { api } from '../axios';
import type { MonthlyConsumptionRecord } from '../customer/customer.api';

export interface CreateMonthlyBillingPayload {
  generatorGroupId: string;
  month: string;
  price: number;
  isCounter: boolean;
}

export interface MonthlyBillingEntry {
  id: string;
  date: string;
  price: number;
  isCounter: boolean;
  billsCreated: number;
}

export interface CreateMonthlyBillingResult {
  monthlyPriceId: string;
  consumptionsCreated: number;
}

export const createMonthlyBilling = async (
  payload: CreateMonthlyBillingPayload,
): Promise<CreateMonthlyBillingResult> => {
  const { data } = await api.post<CreateMonthlyBillingResult>('/billing/monthly', payload);
  return data;
};

export const getMonthlyBillings = async (
  generatorGroupId: string,
  isCounter: boolean,
): Promise<MonthlyBillingEntry[]> => {
  const { data } = await api.get<MonthlyBillingEntry[]>('/billing/monthly', {
    params: { generatorGroupId, isCounter },
  });
  return data;
};

export const createSingleBilling = async (
  customerId: string,
  month: string,
  price?: number,
): Promise<MonthlyConsumptionRecord> => {
  const { data } = await api.post<MonthlyConsumptionRecord>(`/billing/customer/${customerId}/monthly`, { month, price });
  return data;
};

export interface CustomerMonthlyRate {
  exists: boolean;
  price: number | null;
}

export const getCustomerMonthlyRate = async (
  customerId: string,
  month: string,
): Promise<CustomerMonthlyRate> => {
  const { data } = await api.get<CustomerMonthlyRate>(`/billing/customer/${customerId}/monthly-rate`, {
    params: { month },
  });
  return data;
};

export interface UpdateMonthlyConsumptionPayload {
  previousCounter?: number;
  currentCounter?: number;
  monthlyFee?: number;
  balanceOverride?: number | null;
  amountPaid?: number;
  paidDate?: string;
  consumptionStatusId?: string;
  isCut?: boolean;
  closedBalance?: boolean;
}

/* ── Accounting ── */
export interface GroupSummaryLine {
  groupId: string;
  groupName: string;
  regionName: string;
  totalBilled: number;
  totalPaid: number;
  outstanding: number;
  customerCount: number;
  collectionRate: number;
}

export interface CustomerTypeSummary {
  customerCount: number;
  totalBilled: number;
  totalPaid: number;
  outstanding: number;
}

export interface RegionSummaryLine {
  regionId: string;
  regionName: string;
  totalBilled: number;
  totalPaid: number;
  outstanding: number;
  customerCount: number;
  collectionRate: number;
}

export interface MonthlySummary {
  month: string;
  totalBilled: number;
  totalPaid: number;
  outstanding: number;
  collectionRate: number;
  counter: CustomerTypeSummary;
  fixed: CustomerTypeSummary;
  byGroup: GroupSummaryLine[];
  byRegion: RegionSummaryLine[];
}

export interface MonthlyCustomerEntry {
  consumptionId: string;
  customerId: string;
  customerName: string;
  groupName: string;
  regionName: string;
  balance: number;
  amountPaid: number;
  remaining: number;
  status: string;
  closedBalance: boolean;
  paidDate: string | null;
}

export const getMonthlySummary = async (month: string): Promise<MonthlySummary> => {
  const { data } = await api.get<MonthlySummary>('/billing/accounting/summary', { params: { month } });
  return data;
};

export interface RegionGroupBillingLine {
  groupId: string;
  groupName: string;
  customerCount: number;
  totalBilled: number;
  totalPaid: number;
  outstanding: number;
  collectionRate: number;
}

export interface RegionMonthlyTrendPoint {
  month: string;
  billed: number;
  paid: number;
}

export interface RegionBillingSummary {
  totalBilled: number;
  totalPaid: number;
  outstanding: number;
  collectionRate: number;
  byGroup: RegionGroupBillingLine[];
  monthlyTrend: RegionMonthlyTrendPoint[];
}

export const getRegionBillingSummary = async (regionId: string): Promise<RegionBillingSummary> => {
  const { data } = await api.get<RegionBillingSummary>(`/billing/region/${regionId}/summary`);
  return data;
};

export const getMonthlyReceivables = async (month: string): Promise<MonthlyCustomerEntry[]> => {
  const { data } = await api.get<MonthlyCustomerEntry[]>('/billing/accounting/receivables', { params: { month } });
  return data;
};

export const getMonthlyPayments = async (month: string): Promise<MonthlyCustomerEntry[]> => {
  const { data } = await api.get<MonthlyCustomerEntry[]>('/billing/accounting/payments', { params: { month } });
  return data;
};

export const updateMonthlyConsumption = async (
  id: string,
  payload: UpdateMonthlyConsumptionPayload,
): Promise<void> => {
  await api.patch(`/billing/monthly/${id}`, payload);
};

export interface MonthlyCounterEntry {
  consumptionId: string;
  customerId: string;
  customerName: string;
  groupName: string;
  regionName: string;
  previousCounter: number;
  currentCounter: number;
  kwhPrice: number;
  closedBalance: boolean;
}

export interface CounterUpdateItem {
  consumptionId: string;
  currentCounter: number;
}

export const getMonthlyCounterEntries = async (
  generatorGroupId: string,
  month: string,
): Promise<MonthlyCounterEntry[]> => {
  const { data } = await api.get<MonthlyCounterEntry[]>('/billing/monthly/counters', {
    params: { generatorGroupId, month },
  });
  return data;
};

export const bulkUpdateCounters = async (updates: CounterUpdateItem[]): Promise<{ updated: number }> => {
  const { data } = await api.patch<{ updated: number }>('/billing/monthly/bulk-counters', { updates });
  return data;
};

export interface CustomerBalance {
  customerId: string;
  consumptionId: string;
  balance: number;
  amountPaid: number;
  remaining: number;
  closedBalance: boolean;
}

export const getMonthlyCustomerBalances = async (
  generatorGroupId: string,
  month: string,
): Promise<CustomerBalance[]> => {
  const { data } = await api.get<CustomerBalance[]>('/billing/monthly/balances', {
    params: { generatorGroupId, month },
  });
  return data;
};

export interface CustomerAllTimeBalance {
  customerId: string;
  remaining: number;
}

/** Each customer's total unpaid amount across ALL their bills and deposits — not scoped to one month. */
export const getGroupCustomerAllTimeBalances = async (
  generatorGroupId: string,
): Promise<CustomerAllTimeBalance[]> => {
  const { data } = await api.get<CustomerAllTimeBalance[]>('/billing/monthly/balances/all-time', {
    params: { generatorGroupId },
  });
  return data;
};

export interface ReceiptData {
  consumptionId: string;
  customerId: string;
  customerName: string;
  buildingName: string | null;
  date: string;
  isCounter: boolean;
  ampere: number;
  threePhase: boolean;
  monthlyFee: number;
  previousCounter: number;
  currentCounter: number;
  kwhPrice: number;
  amountPaid: number;
  balance: number;
  remaining: number;
}

export const getReceipts = async (customerIds: string[], months: string[]): Promise<ReceiptData[]> => {
  const { data } = await api.post<ReceiptData[]>('/billing/receipts', { customerIds, months });
  return data;
};
