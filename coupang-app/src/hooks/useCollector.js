import { useState, useCallback, useRef, useEffect } from 'react';

function now() {
  return new Date().toLocaleTimeString('ko-KR', { hour12: false });
}

function formatCollectedAt(date) {
  return new Date(date).toLocaleString('ko-KR', {
    year: 'numeric', month: 'numeric', day: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
}

function normalizeProduct(p, idx) {
  const salePrice   = p.coupangSalePrice ?? p.finalBenefitPrice ?? 0;
  const normalPrice = p.normalPrice ?? salePrice;
  const discountRate = normalPrice > 0 ? Math.round((1 - salePrice / normalPrice) * 100) : 0;
  const couponRaw    = p.couponDiscountPrice;
  const couponPrice  = couponRaw && couponRaw !== 'X' ? Number(couponRaw) : null;

  return {
    id:            p.itemId || p.productCode || String(idx),
    itemId:        p.itemId       || '',
    productCode:   p.productCode  || '',
    modelCode:     p.modelCode    || '',
    name:          p.productName  || '',
    subName:       '',
    originalPrice: normalPrice,
    salePrice,
    discountRate,
    couponPrice,
    rating:        0,
    reviewCount:   0,
    status:        p.coupangStatus || '판매중',
    delivery:      '로켓배송',
    hasCoupon:     couponPrice != null,
  };
}

export function useCollector() {
  const [status,   setStatus]   = useState('idle');
  const [progress, setProgress] = useState({ current: 0, total: 0, collected: 0, soldout: 0, errors: 0 });
  const [logs,     setLogs]     = useState([]);
  const [results,  setResults]  = useState([]);
  const VALID_TABS = ['all', 'soldout', 'coupon', 'rematch', 'settings'];
  const [tab, setTab] = useState(() => {
    const hash = window.location.hash.slice(1);
    return VALID_TABS.includes(hash) ? hash : 'all';
  });
  const [collectedAt, setCollectedAt] = useState(null);
  const abortRef = useRef(null);

  useEffect(() => {
    function onHashChange() {
      const hash = window.location.hash.slice(1);
      if (VALID_TABS.includes(hash)) setTab(hash);
    }
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    fetch('/api/coupang/cache')
      .then(r => r.json())
      .then(data => {
        if (!data.products) return;
        const normalized = data.products.map(normalizeProduct);
        setResults(normalized);
        setCollectedAt(formatCollectedAt(data.cachedAt));
      })
      .catch(() => {});
  }, []);

  const pushLog = useCallback((type, message) => {
    setLogs(prev => [...prev.slice(-199), { type, message, time: now() }]);
  }, []);

  const start = useCallback(async (config) => {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setStatus('running');
    setProgress({ current: 0, total: 0, collected: 0, soldout: 0, errors: 0 });
    setResults([]);
    setLogs([{ type: 'info', message: `수집 시작: ${config.url || '(URL 없음)'}`, time: now() }]);

    try {
      const res = await fetch('/api/coupang/collect', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'text/event-stream' },
        body:    JSON.stringify({
          url:               config.url,
          maxItems:          config.maxItems,
          maxPages:          config.maxPages,
          detailConcurrency: config.concurrent,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error || res.statusText);
      }

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          let data;
          try { data = JSON.parse(line.slice(6)); } catch { continue; }

          if (data.type === 'progress') {
            pushLog('info', data.message || '처리 중...');
            setProgress(prev => ({
              ...prev,
              current:   data.current   ?? prev.current,
              total:     data.total     ?? prev.total,
              collected: data.collected ?? prev.collected,
              soldout:   data.soldout   ?? prev.soldout,
              errors:    data.errors    ?? prev.errors,
            }));

          } else if (data.type === 'done') {
            const normalized = (data.products || []).map(normalizeProduct);
            const collected  = normalized.filter(p => p.status !== '품절').length;
            const soldout    = normalized.filter(p => p.status === '품절').length;
            setResults(normalized);
            setCollectedAt(formatCollectedAt(data.collectedAt || new Date()));
            setProgress({ current: normalized.length, total: normalized.length, collected, soldout, errors: 0 });
            setStatus('done');
            pushLog('success', `수집 완료! 총 ${collected}개 수집 (품절: ${soldout}개)`);

          } else if (data.type === 'error') {
            throw new Error(data.error || '알 수 없는 오류');
          }
        }
      }
    } catch (e) {
      if (e.name === 'AbortError') return;
      setStatus('error');
      pushLog('warning', `오류: ${e.message}`);
    }
  }, [pushLog]);

  const stop = useCallback(() => {
    if (abortRef.current) { abortRef.current.abort(); abortRef.current = null; }
    setStatus('idle');
    pushLog('warning', '수집이 중지되었습니다.');
    setProgress(prev => ({ ...prev, current: 0, total: 0 }));
  }, [pushLog]);

  return {
    status, progress, logs,
    results,
    collectedAt,
    tab, setTab,
    start, stop,
  };
}
