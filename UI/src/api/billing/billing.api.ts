import { api } from '../axios';

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

export interface UpdateMonthlyConsumptionPayload {
  previousCounter?: number;
  currentCounter?: number;
  monthlyFee?: number;
  amountPaid?: number;
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
}

export const getMonthlySummary = async (month: string): Promise<MonthlySummary> => {
  const { data } = await api.get<MonthlySummary>('/billing/accounting/summary', { params: { month } });
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
