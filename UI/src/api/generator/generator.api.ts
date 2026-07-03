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

export const updateRegion = async (id: string, name: string): Promise<void> => {
  await api.put(`/generator/region/${id}`, { name });
};

export const deleteRegion = async (id: string): Promise<void> => {
  await api.delete(`/generator/region/${id}`);
};

export const updateGeneratorGroup = async (
  id: string,
  dto: { name?: string; regionId?: string },
): Promise<void> => {
  await api.patch(`/generator/group/${id}`, dto);
};

export const deleteGeneratorGroup = async (id: string): Promise<void> => {
  await api.delete(`/generator/group/${id}`);
};

export const updateGenerator = async (
  id: string,
  dto: { name?: string; generatorGroupId?: string; kvaCapacity?: number; averageDieselConsumption?: number; status?: string },
): Promise<void> => {
  await api.patch(`/generator/${id}`, dto);
};

export const deleteGenerator = async (id: string): Promise<void> => {
  await api.delete(`/generator/${id}`);
};

export const createRegion = async (name: string): Promise<{ id: string; name: string }> => {
  const { data } = await api.post('/generator/region', { name });
  return data;
};

export const createGeneratorGroup = async (
  name: string,
  regionId: string,
): Promise<{ id: string; name: string; regionId: string }> => {
  const { data } = await api.post('/generator/group', { name, regionId });
  return data;
};

export interface CreateGeneratorPayload {
  name: string;
  generatorGroupId: string;
  kvaCapacity: number;
  averageDieselConsumption: number;
  status: string;
}

export const createGenerator = async (
  payload: CreateGeneratorPayload,
): Promise<{ id: string; name: string }> => {
  const { data } = await api.post('/generator', payload);
  return data;
};
