import { useCallback, useEffect, useState } from 'react';
import { getMonthlyCustomerBalances, type CustomerBalance } from '../api/billing/billing.api';

export function useCustomerBalances(generatorGroupId: string | undefined, month: string) {
  const [data, setData] = useState<CustomerBalance[]>([]);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    if (!generatorGroupId) return;
    setLoading(true);
    try {
      const result = await getMonthlyCustomerBalances(generatorGroupId, month);
      setData(result);
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [generatorGroupId, month]);

  useEffect(() => { void fetch(); }, [fetch]);

  return { data, loading, refetch: fetch };
}
