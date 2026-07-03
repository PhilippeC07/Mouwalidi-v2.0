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
  currentCounter?: number;
  monthlyFee?: number;
  amountPaid?: number;
  consumptionStatusId?: string;
  isCut?: boolean;
  closedBalance?: boolean;
}

export const updateMonthlyConsumption = async (
  id: string,
  payload: UpdateMonthlyConsumptionPayload,
): Promise<void> => {
  await api.patch(`/billing/monthly/${id}`, payload);
};
