import { useCallback, useEffect, useState } from 'react';
import { getMonthlyCounterEntries, type MonthlyCounterEntry } from '../api/billing/billing.api';

export function useMonthlyCounterEntries(generatorGroupId: string | undefined, month: string) {
  const [data, setData] = useState<MonthlyCounterEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!generatorGroupId) return;
    setLoading(true);
    setError(null);
    try {
      const result = await getMonthlyCounterEntries(generatorGroupId, month);
      setData(result);
    } catch {
      setError('Failed to load meter readings');
    } finally {
      setLoading(false);
    }
  }, [generatorGroupId, month]);

  useEffect(() => { void fetch(); }, [fetch]);

  return { data, setData, loading, error, refetch: fetch };
}
