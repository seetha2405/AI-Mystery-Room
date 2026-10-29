import { useCallback, useEffect, useState } from 'react';
import { getCase } from '../api/client.js';
export function useCase(caseId) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    try {
      setError(null);
      const next = await getCase(caseId);
      setData(next);
      localStorage.setItem('lastCaseId', caseId);
      return next;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [caseId]);
  useEffect(() => {
    let active = true;
    let timer;
    const started = Date.now();
    const poll = async () => {
      try {
        const next = await getCase(caseId);
        if (!active) return;
        setData(next);
        setLoading(false);
        const pending = (next.evidence ?? []).some(
          (item) => item.imageStatus === 'pending' || item.frameStatus === 'pending',
        );
        if (pending && Date.now() - started < 120_000) timer = setTimeout(poll, 4000);
      } catch (err) {
        if (active) {
          setError(err);
          setLoading(false);
        }
      }
    };
    poll();
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [caseId]);
  return { data, setData, error, loading, refresh };
}
