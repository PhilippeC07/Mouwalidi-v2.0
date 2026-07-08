import { useCallback, useEffect, useState } from 'react';
import { getGroupCustomerAllTimeBalances, type CustomerAllTimeBalance } from '../api/billing/billing.api';

export function useGroupAllTimeBalances(generatorGroupId: string | undefined) {
  const [data, setData] = useState<CustomerAllTimeBalance[]>([]);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    if (!generatorGroupId) return;
    setLoading(true);
    try {
      const result = await getGroupCustomerAllTimeBalances(generatorGroupId);
      setData(result);
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [generatorGroupId]);

  useEffect(() => { void fetch(); }, [fetch]);

  return { data, loading, refetch: fetch };
}
