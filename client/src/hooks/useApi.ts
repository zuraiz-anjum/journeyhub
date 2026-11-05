import { useCallback, useEffect, useState } from 'react';
import api, { getErrorMessage } from '../api/client';

// Loads data from a GET endpoint and keeps track of loading / error.
// Pass null as the url to skip the request (e.g. while an id is missing).
export function useApi<T>(url: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(url !== null);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (url === null) return;
    let cancelled = false;

    async function load(path: string) {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get<T>(path);
        if (!cancelled) setData(res.data);
      } catch (err) {
        if (!cancelled) setError(getErrorMessage(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load(url);
    return () => {
      cancelled = true;
    };
  }, [url, reloadKey]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  return { data, loading, error, reload, setData };
}
