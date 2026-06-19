import { useState, useCallback, useEffect } from 'react';

function fmt(date) {
  return date ? new Date(date).toLocaleString('ko-KR', {
    month: 'numeric', day: 'numeric', hour: 'numeric', minute: '2-digit',
  }) : null;
}

export function useDashboard() {
  const [newProducts, setNewProducts] = useState([]);
  const [coupangData, setCoupangData] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const newRes = await fetch('/api/monitor/newproducts').catch(() => null);
      if (newRes?.ok) {
        const data = await newRes.json();
        const raw = Array.isArray(data) ? data : (data.newProducts || []);
        setNewProducts(raw.map(p => ({
          brand:      p.brand,
          modelName:  p.name,
          inch:       p.inch       || '',
          res:        p.res        || '',
          hz:         p.hz         || '',
          panel:      p.panel      || '',
          shape:      p.shape      || '',
          brightness: p.brightness || '',
          dual_mode:  p.dual_mode  || '',
          price:      p.price,
          ourModel:   p.ownModel,
          ourPrice:   p.ownPrice,
          danawUrl:   p.id ? `https://prod.danawa.com/info/?pcode=${p.id}` : null,
        })));
      }

      const [cacheRes, settingsRes] = await Promise.all([
        fetch('/api/coupang/cache').catch(() => null),
        fetch('/api/coupang/settings').catch(() => null),
      ]);

      if (cacheRes?.ok) {
        const cache = await cacheRes.json();
        if (cache.products) {
          const soldout = cache.products.filter(p => p.coupangStatus === '품절').length;

          let rematch = 0;
          if (settingsRes?.ok) {
            const settings = await settingsRes.json();
            const mappings = settings.productMappings || [];
            rematch = mappings.filter(m => {
              const matched = cache.products.find(p =>
                p.modelCode === m.skuid || p.itemId === m.collectCode
              );
              if (!matched) return false;
              const couponRaw = matched.couponDiscountPrice;
              const salePrice = matched.coupangSalePrice ?? matched.finalBenefitPrice ?? 0;
              const currentPrice = (couponRaw && couponRaw !== 'X')
                ? Number(couponRaw)
                : salePrice;
              return currentPrice > 0 && currentPrice < Number(m.originalSalePrice);
            }).length;
          }

          setCoupangData({
            collected: cache.products.length,
            soldout,
            rematch,
            lastAt: fmt(cache.cachedAt),
          });
        }
      }

      setLastUpdated(fmt(Date.now()));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return { newProducts, coupangData, lastUpdated, loading, refresh };
}
