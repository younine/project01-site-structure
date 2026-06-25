import { useState, useCallback, useEffect } from 'react';
import { authFetch } from '../components/authFetch';

export function useEvents() {
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch('/api/events');
      if (res.ok) setPromotions(await res.json());
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const addPromotion = useCallback(async (data) => {
    const res = await authFetch('/api/events', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error((await res.json()).error || '등록 실패');
    await load();
  }, [load]);

  const deletePromotion = useCallback(async (id) => {
    const res = await authFetch(`/api/events/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('삭제 실패');
    setPromotions(prev => prev.filter(p => p.id !== id));
  }, []);

  return { promotions, loading, addPromotion, deletePromotion };
}
