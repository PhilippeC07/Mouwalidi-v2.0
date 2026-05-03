import { useEffect, useState } from 'react';
import { getGenerators, type GeneratorDto } from '../api/generator/generator.api';

export function useGetGenerators() {
  const [data, setData] = useState<GeneratorDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGenerators = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await getGenerators();
      setData(result);
    } catch (err) {
      console.error(err);
      setError('Failed to load generators');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchGenerators();
  }, []);

  return { data, loading, error, refetch: fetchGenerators };
}
