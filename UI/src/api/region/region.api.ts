import { api } from '../axios';

export type Region = {
  id: string;
  name: string;
  generatorGroups: {
    id: string;
    name: string;
    generators: {
      id: string;
      name: string;
    }[];
  }[];
};

export const getRegions = async (): Promise<Region[]> => {
  const { data } = await api.get('/generator/regions');
  return data;
};
