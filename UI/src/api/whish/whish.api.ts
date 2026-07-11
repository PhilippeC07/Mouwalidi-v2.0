import { api } from '../axios';

export interface WhishRecipient {
  phoneNumber: string | null;
  priceUsd?: number;
  customerCount?: number;
  pricePerCustomerUsd?: number;
}

export interface SubscriptionClaim {
  id: string;
  adminUserId: string;
  amountClaimed: number;
  referenceNumber: string;
  note: string | null;
  status: string;
  createdAt: string;
  reviewedAt: string | null;
  admin?: { id: string; email: string; name: string | null };
}

export interface CustomerPaymentClaim {
  id: string;
  customerId: string;
  adminUserId: string;
  amount: number;
  currency: string;
  status: string;
  method: string;
  referenceNumber: string | null;
  createdAt: string;
  customer?: { firstName: string; middleName: string | null; lastName: string };
}

export const getSubscriptionRecipient = async (): Promise<WhishRecipient> => {
  const { data } = await api.get<WhishRecipient>('/whish/subscription/recipient');
  return data;
};

export const submitSubscriptionClaim = async (referenceNumber: string, note?: string): Promise<SubscriptionClaim> => {
  const { data } = await api.post<SubscriptionClaim>('/whish/subscription/claims', { referenceNumber, note });
  return data;
};

export const getMySubscriptionClaims = async (): Promise<SubscriptionClaim[]> => {
  const { data } = await api.get<SubscriptionClaim[]>('/whish/subscription/claims/mine');
  return data;
};

export const getPendingSubscriptionClaims = async (): Promise<SubscriptionClaim[]> => {
  const { data } = await api.get<SubscriptionClaim[]>('/whish/subscription/claims');
  return data;
};

export const approveSubscriptionClaim = async (id: string): Promise<{ success: boolean }> => {
  const { data } = await api.post<{ success: boolean }>(`/whish/subscription/claims/${id}/approve`);
  return data;
};

export const rejectSubscriptionClaim = async (id: string, note?: string): Promise<SubscriptionClaim> => {
  const { data } = await api.post<SubscriptionClaim>(`/whish/subscription/claims/${id}/reject`, { note });
  return data;
};

export const getCustomerPaymentRecipient = async (): Promise<WhishRecipient> => {
  const { data } = await api.get<WhishRecipient>('/whish/customer-payment/recipient');
  return data;
};

export const submitCustomerPaymentClaim = async (referenceNumber: string, note?: string): Promise<CustomerPaymentClaim> => {
  const { data } = await api.post<CustomerPaymentClaim>('/whish/customer-payment/claims', { referenceNumber, note });
  return data;
};

export const listCustomerPaymentClaims = async (): Promise<CustomerPaymentClaim[]> => {
  const { data } = await api.get<CustomerPaymentClaim[]>('/whish/customer-payment/claims');
  return data;
};

export const approveCustomerPaymentClaim = async (id: string): Promise<{ success: boolean }> => {
  const { data } = await api.post<{ success: boolean }>(`/whish/customer-payment/claims/${id}/approve`);
  return data;
};

export const rejectCustomerPaymentClaim = async (id: string): Promise<CustomerPaymentClaim> => {
  const { data } = await api.post<CustomerPaymentClaim>(`/whish/customer-payment/claims/${id}/reject`);
  return data;
};

export const setWhishPhoneNumber = async (phoneNumber: string): Promise<{ whishPhoneNumber: string }> => {
  const { data } = await api.patch<{ whishPhoneNumber: string }>('/whish/phone-number', { phoneNumber });
  return data;
};
