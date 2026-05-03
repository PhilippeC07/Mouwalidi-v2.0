import { api } from '../axios';

export interface GeneratorDto {
  id: string;
  name: string;
  location: string;
  kvaCapacity: number;
  averageDieselConsumption: number;
  status: string;
  totalClients: number;
  totalLoad: number;
  totalRevenue: number;
  overdueCount: number;
  unpaidCount: number;
  monthlyBill: number;
}

export const getGenerators = async (): Promise<GeneratorDto[]> => {
  const { data } = await api.get<GeneratorDto[]>('/generator/generators');
  return data;
};
