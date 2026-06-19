import { useState, useEffect, useCallback, useRef } from 'react';

export function useProducts() {
  const [productMap, setProductMap] = useState({});
  const mountedRef = useRef(true);

  const fetchProducts = useCallback(async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch('/api/products', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok || !mountedRef.current) return;
      const data = await res.json();
      const map = {};
      (data.products || []).forEach(p => {
        const id = (p.skuId || '').trim();
        if (id) map[id] = String(p.salePrice || '');
      });
      if (mountedRef.current) setProductMap(map);
    } catch {}
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    fetchProducts();
    const timer = setInterval(fetchProducts, 5 * 60 * 1000);
    return () => { mountedRef.current = false; clearInterval(timer); };
  }, [fetchProducts]);

  return { productMap };
}
