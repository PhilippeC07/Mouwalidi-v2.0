import { useCallback, useEffect, useState } from 'react';
import { getCustomerDetails, type CustomerDetail } from '../api/customer/customer.api';

export function useCustomerDetails(customerId: string | undefined) {
  const [data, setData] = useState<CustomerDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!customerId) return;
    setLoading(true);
    setError(null);
    try {
      const result = await getCustomerDetails(customerId);
      setData(result);
    } catch {
      setError('Failed to load customer details');
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => { void fetchData(); }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}
