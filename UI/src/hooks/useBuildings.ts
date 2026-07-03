import { useCallback, useEffect, useState } from 'react';
import { getBuildings, type BuildingListItem } from '../api/building/building.api';

export function useBuildings(generatorGroupId: string | undefined) {
  const [data, setData] = useState<BuildingListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!generatorGroupId) return;
    setLoading(true);
    setError(null);
    try {
      const result = await getBuildings(generatorGroupId);
      setData(result);
    } catch {
      setError('Failed to load buildings');
    } finally {
      setLoading(false);
    }
  }, [generatorGroupId]);

  useEffect(() => { void fetch(); }, [fetch]);

  return { data, loading, error, refetch: fetch };
}
