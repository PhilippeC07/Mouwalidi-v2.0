import { useCallback, useEffect, useState } from 'react';
import { getBuildingDetails, type BuildingDetail } from '../api/building/building.api';

export function useBuildingDetails(generatorGroupId: string | undefined) {
  const [data, setData] = useState<BuildingDetail[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!generatorGroupId) return;
    setLoading(true);
    setError(null);
    try {
      const result = await getBuildingDetails(generatorGroupId);
      setData(result);
    } catch {
      setError('Failed to load building details');
    } finally {
      setLoading(false);
    }
  }, [generatorGroupId]);

  useEffect(() => { void fetch(); }, [fetch]);

  return { data, loading, error, refetch: fetch };
}
