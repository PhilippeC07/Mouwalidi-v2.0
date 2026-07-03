import { useCallback, useEffect, useState } from 'react';
import { getCustomers, type CustomerListItem } from '../api/customer/customer.api';

export function useCustomers(generatorGroupId: string | undefined) {
  const [data, setData] = useState<CustomerListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!generatorGroupId) return;
    setLoading(true);
    setError(null);
    try {
      const result = await getCustomers(generatorGroupId);
      setData(result);
    } catch {
      setError('Failed to load customers');
    } finally {
      setLoading(false);
    }
  }, [generatorGroupId]);

  useEffect(() => { void fetch(); }, [fetch]);

  return { data, loading, error, refetch: fetch };
}
