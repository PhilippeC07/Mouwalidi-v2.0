import { api } from '../axios';

export interface CreateBuildingPayload {
  name: string;
  generatorGroupId: string;
}

export interface BuildingListItem {
  id: string;
  name: string;
  floorCount: number;
}

export interface BuildingFloorDetail {
  id: string;
  floorNumber: number;
  apartmentSide: string;
  customer: {
    id: string;
    firstName: string;
    middleName: string | null;
    lastName: string;
  } | null;
}

export interface BuildingDetail {
  id: string;
  name: string;
  buildingfloors: BuildingFloorDetail[];
}

export const createBuilding = async (payload: CreateBuildingPayload) => {
  const { data } = await api.post('/building', payload);
  return data;
};

export const getBuildings = async (generatorGroupId: string): Promise<BuildingListItem[]> => {
  const { data } = await api.get<BuildingListItem[]>('/building', {
    params: { generatorGroupId },
  });
  return data;
};

export const getBuildingDetails = async (generatorGroupId: string): Promise<BuildingDetail[]> => {
  const { data } = await api.get<BuildingDetail[]>('/building/details', {
    params: { generatorGroupId },
  });
  return data;
};

export const updateBuilding = async (id: string, payload: { name: string }) => {
  const { data } = await api.patch(`/building/${id}`, payload);
  return data;
};

export const deleteBuilding = async (id: string) => {
  await api.delete(`/building/${id}`);
};
