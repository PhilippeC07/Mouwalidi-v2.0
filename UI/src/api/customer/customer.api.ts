import { api } from '../axios';

export interface CreateCustomerPayload {
  firstName: string;
  middleName?: string;
  lastName: string;
  phoneNumber?: string;
  specialMonthlyFee?: number;
  specialKwhPrice?: number;
  specialPeriod?: number;
  isCounter: boolean;
  status: string;
  description?: string;
  consumptionStatusId: string;
  consumptionTypeId: string;
  buildingId: string;
  floorNumber: number;
  apartmentSide: string;
}

export interface ConsumptionStatusDto {
  id: string;
  Status: string;
}

export interface ConsumptionTypeDto {
  id: string;
  description: string;
  Ampere: number;
  isCounter: boolean;
  ThreePhase: boolean;
}

export interface CustomerListItem {
  id: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  phoneNumber: string | null;
  status: string;
  isCounter: boolean;
  description: string | null;
  consumptionStatusId: string;
  consumptionTypeId: string;
  consumptionStatus: { Status: string };
  consumptionType: { description: string; Ampere: number; ThreePhase: boolean };
  buildingFloor: { floorNumber: number; apartmentSide: string; buildingId: string } | null;
}

export interface UpdateCustomerPayload {
  firstName?: string;
  middleName?: string;
  lastName?: string;
  phoneNumber?: string;
  isCounter?: boolean;
  status?: string;
  description?: string;
  consumptionStatusId?: string;
  consumptionTypeId?: string;
  buildingId?: string;
  floorNumber?: number;
  apartmentSide?: string;
}

export const createCustomer = async (payload: CreateCustomerPayload) => {
  const { data } = await api.post('/customer', payload);
  return data;
};

export const updateCustomer = async (id: string, payload: UpdateCustomerPayload) => {
  const { data } = await api.patch(`/customer/${id}`, payload);
  return data;
};

export const getConsumptionStatuses = async (): Promise<ConsumptionStatusDto[]> => {
  const { data } = await api.get<ConsumptionStatusDto[]>('/customer/consumption-statuses');
  return data;
};

export const getCustomers = async (generatorGroupId: string): Promise<CustomerListItem[]> => {
  const { data } = await api.get<CustomerListItem[]>('/customer', {
    params: { generatorGroupId },
  });
  return data;
};

export interface CreateConsumptionTypePayload {
  description: string;
  Ampere: number;
  isCounter: boolean;
  ThreePhase: boolean;
  generatorGroupId: string;
}

export const createConsumptionType = async (payload: CreateConsumptionTypePayload) => {
  const { data } = await api.post('/customer/consumption-types', payload);
  return data;
};

export const getConsumptionTypes = async (generatorGroupId: string): Promise<ConsumptionTypeDto[]> => {
  const { data } = await api.get<ConsumptionTypeDto[]>('/customer/consumption-types', {
    params: { generatorGroupId },
  });
  return data;
};

export interface UpdateConsumptionTypePayload {
  description?: string;
  Ampere?: number;
  isCounter?: boolean;
  ThreePhase?: boolean;
}

export const updateConsumptionType = async (id: string, payload: UpdateConsumptionTypePayload) => {
  const { data } = await api.patch(`/customer/consumption-types/${id}`, payload);
  return data;
};

export const deleteConsumptionType = async (id: string) => {
  await api.delete(`/customer/consumption-types/${id}`);
};

export const deleteCustomer = async (id: string) => {
  await api.delete(`/customer/${id}`);
};

export interface MonthlyConsumptionRecord {
  id: string;
  date: string;
  previousCounter: number;
  currentCounter: number;
  monthlyFee: number;
  amountPaid: number;
  kwhPrice: number;
  isCut: boolean;
  closedBalance: boolean;
  consumptionStatusId: string;
  consumptionStatus: { Status: string };
}

export interface CustomerDetail {
  id: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  phoneNumber: string | null;
  status: string;
  isCounter: boolean;
  description: string | null;
  consumptionStatus: { Status: string };
  consumptionType: { description: string; Ampere: number; isCounter: boolean; ThreePhase: boolean };
  buildingFloor: {
    floorNumber: number;
    apartmentSide: string;
    building: { name: string };
  } | null;
  monthlyConsumptions: MonthlyConsumptionRecord[];
}

export const getCustomerDetails = async (id: string): Promise<CustomerDetail> => {
  const { data } = await api.get<CustomerDetail>(`/customer/${id}`);
  return data;
};
