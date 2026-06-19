import { useState, useEffect } from 'react';

export function useKeyboard() {
  const [models, setModels] = useState([]);
  const [newProducts, setNewProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [compareRes, newRes] = await Promise.all([
        fetch('/api/keyboard/compare'),
        fetch('/api/keyboard/new'),
      ]);
      if (!compareRes.ok) throw new Error(`비교 데이터 오류: ${compareRes.status}`);
      if (!newRes.ok) throw new Error(`신제품 데이터 오류: ${newRes.status}`);
      const [compare, newProds] = await Promise.all([compareRes.json(), newRes.json()]);
      setModels(Array.isArray(compare) ? compare : []);
      setNewProducts(Array.isArray(newProds) ? newProds : []);
      setLastUpdated(new Date());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  return { models, newProducts, loading, error, lastUpdated, reload: load };
}
