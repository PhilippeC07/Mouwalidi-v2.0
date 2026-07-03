import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import axios from 'axios';

export interface GeneratorItemModel {
  id: string;
  label: string;
  kvaCapacity: number;
  averageDieselConsumption: number;
  status: string;
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
      kvaCapacity: number;
      averageDieselConsumption: number;
      status: string;
    }[];
  }[];
}

interface RegionsContextValue {
  data: RegionModel[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const RegionsContext = createContext<RegionsContextValue>({
  data: [],
  loading: false,
  error: null,
  refetch: async () => {},
});

export function RegionsProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<RegionModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get<RegionResponseDto[]>(
        'http://localhost:3000/api/generator/regions',
      );
      setData(
        response.data.map((region) => ({
          id: region.id,
          label: region.name,
          groups: region.generatorGroups.map((group) => ({
            id: group.id,
            label: group.name,
            items: group.generators.map((gen) => ({
                id: gen.id,
                label: gen.name,
                kvaCapacity: gen.kvaCapacity,
                averageDieselConsumption: gen.averageDieselConsumption,
                status: gen.status,
              })),
          })),
        })),
      );
    } catch {
      setError('Failed to load regions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchData(); }, [fetchData]);

  return (
    <RegionsContext.Provider value={{ data, loading, error, refetch: fetchData }}>
      {children}
    </RegionsContext.Provider>
  );
}

export function useRegionsContext() {
  return useContext(RegionsContext);
}
