import { api } from '../axios';

export interface SubscriptionStatus {
  subscriptionStatus: string | null;
  currentPeriodEnd: string | null;
  isLocked: boolean;
  customerCount: number;
  pricePerCustomerUsd: number;
  estimatedMonthlyUsd: number;
}

export interface ConnectStatus {
  connected: boolean;
  onboarded: boolean;
}

export const createSubscriptionCheckout = async (): Promise<{ url: string }> => {
  const { data } = await api.post<{ url: string }>('/stripe/subscription/checkout');
  return data;
};

export const createBillingPortalSession = async (): Promise<{ url: string }> => {
  const { data } = await api.post<{ url: string }>('/stripe/subscription/portal');
  return data;
};

export const getSubscriptionStatus = async (): Promise<SubscriptionStatus> => {
  const { data } = await api.get<SubscriptionStatus>('/stripe/subscription/status');
  return data;
};

export const createConnectOnboardingLink = async (): Promise<{ url: string }> => {
  const { data } = await api.post<{ url: string }>('/stripe/connect/onboarding-link');
  return data;
};

export const getConnectStatus = async (): Promise<ConnectStatus> => {
  const { data } = await api.get<ConnectStatus>('/stripe/connect/status');
  return data;
};

export const createCustomerPaymentCheckout = async (): Promise<{ url: string }> => {
  const { data } = await api.post<{ url: string }>('/stripe/customer-payment/checkout');
  return data;
};
