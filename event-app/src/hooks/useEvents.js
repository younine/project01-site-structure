import { useState, useCallback, useEffect } from 'react';

function authHeader() {
  const token = localStorage.getItem('auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function useEvents() {
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/events', { headers: authHeader() });
      if (res.ok) setPromotions(await res.json());
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const addPromotion = useCallback(async (data) => {
    const res = await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader() },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error((await res.json()).error || '등록 실패');
    await load();
  }, [load]);

  const deletePromotion = useCallback(async (id) => {
    const res = await fetch(`/api/events/${id}`, {
      method: 'DELETE',
      headers: authHeader(),
    });
    if (!res.ok) throw new Error('삭제 실패');
    setPromotions(prev => prev.filter(p => p.id !== id));
  }, []);

  return { promotions, loading, addPromotion, deletePromotion };
}
