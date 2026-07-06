import { useEffect, useState } from 'react';

const PREFIX = 'mouwalidi:';

function read<T>(key: string, fallback: T): T {
  try {
    const stored = sessionStorage.getItem(PREFIX + key);
    return stored !== null ? (JSON.parse(stored) as T) : fallback;
  } catch {
    return fallback;
  }
}

/**
 * Drop-in replacement for useState that persists the value to sessionStorage,
 * so filters/sorting/view choices survive navigating away and back.
 */
export function usePersistentState<T>(key: string, defaultValue: T) {
  const [state, setState] = useState<T>(() => read(key, defaultValue));

  useEffect(() => {
    try {
      sessionStorage.setItem(PREFIX + key, JSON.stringify(state));
    } catch {
      // ignore quota/serialization errors — falls back to in-memory only
    }
  }, [key, state]);

  return [state, setState] as const;
}
