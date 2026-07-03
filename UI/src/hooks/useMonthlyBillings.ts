import { useCallback, useEffect, useState } from 'react';
import { getMonthlyBillings, type MonthlyBillingEntry } from '../api/billing/billing.api';

export function useMonthlyBillings(
  generatorGroupId: string | undefined,
  isCounter: boolean,
  externalKey = 0,
) {
  const [data, setData] = useState<MonthlyBillingEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!generatorGroupId) return;
    setLoading(true);
    setError(null);
    try {
      const result = await getMonthlyBillings(generatorGroupId, isCounter);
      setData(result);
    } catch {
      setError('Failed to load billing history');
    } finally {
      setLoading(false);
    }
  }, [generatorGroupId, isCounter]);

  useEffect(() => { void fetch(); }, [fetch, externalKey]);

  return { data, loading, error, refetch: fetch };
}
