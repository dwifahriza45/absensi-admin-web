import { useCallback, useEffect, useRef, useState } from "react";
export function useData<T>(load: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const sequence = useRef({ value: 0 });
  const reload = useCallback(async () => {
    const current = ++sequence.current.value;
    setLoading(true);
    setError(null);
    try {
      const next = await load();
      if (current === sequence.current.value) setData(next);
    } catch (err) {
      if (current === sequence.current.value)
        setError(err instanceof Error ? err.message : "Gagal memuat data.");
    } finally {
      if (current === sequence.current.value) setLoading(false);
    }
  }, [load]);
  useEffect(() => {
    const counter = sequence.current;
    void reload();
    return () => {
      counter.value++;
    };
  }, [reload]);
  return { data, loading, error, reload };
}
