import { useCallback, useEffect, useState } from 'react';
import {
  getConsumptionStatuses,
  getConsumptionTypes,
  type ConsumptionStatusDto,
  type ConsumptionTypeDto,
} from '../api/customer/customer.api';

export function useConsumptionLookups(generatorGroupId: string | undefined) {
  const [statuses, setStatuses] = useState<ConsumptionStatusDto[]>([]);
  const [types, setTypes] = useState<ConsumptionTypeDto[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchTypes = useCallback(async () => {
    if (!generatorGroupId) return;
    const t = await getConsumptionTypes(generatorGroupId);
    setTypes(t);
  }, [generatorGroupId]);

  useEffect(() => {
    if (!generatorGroupId) return;
    setLoading(true);
    Promise.all([getConsumptionStatuses(), getConsumptionTypes(generatorGroupId)])
      .then(([s, t]) => { setStatuses(s); setTypes(t); })
      .catch((err) => console.error('Failed to load consumption lookups', err))
      .finally(() => setLoading(false));
  }, [generatorGroupId]);

  return { statuses, types, loading, refetchTypes: fetchTypes };
}
