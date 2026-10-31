import { useCallback, useEffect, useRef, useState } from 'react';
import { getCase } from '../api/client.js';
export function useCase(caseId) {
  const [data, setStoredData] = useState(null);
  const dataVersion = useRef(0);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const setData = useCallback((next) => {
    dataVersion.current += 1;
    setStoredData(next);
  }, []);
  const refresh = useCallback(async () => {
    const requestVersion = dataVersion.current;
    try {
      setError(null);
      const next = await getCase(caseId);
      if (requestVersion === dataVersion.current) setData(next);
      localStorage.setItem('lastCaseId', caseId);
      return next;
    } catch (err) {
      if (requestVersion === dataVersion.current) setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [caseId, setData]);
  useEffect(() => {
    let active = true;
    let timer;
    const started = Date.now();
    const poll = async () => {
      const requestVersion = dataVersion.current;
      try {
        const next = await getCase(caseId);
        if (!active) return;
        if (requestVersion === dataVersion.current) setData(next);
        setLoading(false);
        const pending = (next.evidence ?? []).some(
          (item) => item.imageStatus === 'pending' || item.frameStatus === 'pending',
        );
        if (pending && Date.now() - started < 120_000) timer = setTimeout(poll, 4000);
      } catch (err) {
        if (active && requestVersion === dataVersion.current) {
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
  }, [caseId, setData]);
  return { data, setData, error, loading, refresh };
}
