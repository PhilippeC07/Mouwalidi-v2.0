import { useEffect, useState } from 'react';
import axios from 'axios';

export interface GeneratorItemModel {
  id: string;
  label: string;
}

export interface RegionGroupModel {
  id: string;
  label: string;
  items: GeneratorItemModel[];
}

export interface RegionModel {
  id: string;
  label: string;
  groups: RegionGroupModel[];
}

interface RegionResponseDto {
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
}

export function useRegions() {
  const [data, setData] = useState<RegionModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRegions = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await axios.get<RegionResponseDto[]>(
        'http://localhost:3000/api/generator/regions',
      );

      const mapped: RegionModel[] = response.data.map((region) => ({
        id: region.id,
        label: region.name,
        groups: region.generatorGroups.map((group) => ({
          id: group.id,
          label: group.name,
          items: group.generators.map((generator) => ({
            id: generator.id,
            label: generator.name,
          })),
        })),
      }));

      setData(mapped);
    } catch (err) {
      console.error(err);
      setError('Failed to load regions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchRegions();
  }, []);

  return {
    data,
    loading,
    error,
    refetch: fetchRegions,
  };
}
