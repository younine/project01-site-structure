import { useState, useEffect, useCallback } from 'react';

function rankClass(r) {
  if (!r) return 'rnone';
  if (r === 1)  return 'r1';
  if (r === 2)  return 'r2';
  if (r === 3)  return 'r3';
  if (r <= 5)   return 'r5';
  if (r <= 10)  return 'r10';
  if (r <= 20)  return 'r20';
  if (r <= 50)  return 'r50';
  return 'rlo';
}

function fmtDate(d) {
  if (!d) return '';
  const p = d.split('-');
  return p.length === 3 ? `${p[1]}/${p[2]}` : d;
}

function fmtPrice(p) {
  if (!p) return '-';
  return Number(p).toLocaleString('ko-KR') + '원';
}

function RankChange({ prev, cur }) {
  if (!prev || !cur) return null;
  const diff = prev - cur; // 양수 = 순위 상승 (숫자 작아짐)
  if (diff === 0) return <span style={{ color: 'var(--text3)', fontSize: 10 }}>━</span>;
  if (diff > 0)   return <span className="rank-up"   style={{ fontSize: 10 }}>▲{diff}</span>;
  return              <span className="rank-down" style={{ fontSize: 10 }}>▼{Math.abs(diff)}</span>;
}

export default function DailyTab({ categoryId, ourBrand }) {
  const [data,          setData]          = useState(null);
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState(null);
  const [selBrand,      setSelBrand]      = useState(ourBrand || '');
  const [showAllBrands,    setShowAllBrands]    = useState(false);
  const [showAllProducts,  setShowAllProducts]  = useState(false);

  // 카테고리가 바뀌면 데이터 초기화 후 재조회
  useEffect(() => {
    setData(null);
    setSelBrand(ourBrand || '');
    setShowAllBrands(false);
    setShowAllProducts(false);
  }, [categoryId, ourBrand]);

  const load = useCallback(async (force = false) => {
    setLoading(true);
    setError(null);
    try {
      const qs  = new URLSearchParams({ category: categoryId, ...(force && { force: '1' }) });
      const res = await fetch(`/api/nrank/brand?${qs}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setData(json);
      setSelBrand(prev => prev || ourBrand || (json.brands?.[0] ?? ''));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [categoryId]);

  useEffect(() => { if (categoryId) load(); }, [load, categoryId]);

  if (loading && !data) return <div className="card"><div className="loading">데이터 불러오는 중...</div></div>;
  if (error)            return <div className="card"><div className="empty" style={{ color: 'var(--danger)' }}>{error}</div></div>;
  if (!data)            return null;

  const { brands = [], dates = [], data: rankMap = {}, brandRankMap = {}, products = [] } = data;
  const latestDate = dates[dates.length - 1];
  const prevDate   = dates.length >= 2 ? dates[dates.length - 2] : null;

  // 브랜드별 300위 내 제품 수 (최신일 기준)
  const brandCountMap = {};
  for (const p of products) {
    if (p.ranks[latestDate]) brandCountMap[p.brand] = (brandCountMap[p.brand] || 0) + 1;
  }

  const brand100Map = data.brand100Map || {};

  // 전일 브랜드 순위 계산 (서버와 동일 로직: 100위 내 수 → 최상위 순위)
  const prevBrandRankMap = {};
  if (prevDate) {
    const prev100 = {};
    for (const p of products) {
      const r = p.ranks[prevDate];
      if (r && r <= 100) prev100[p.brand] = (prev100[p.brand] || 0) + 1;
    }
    [...brands]
      .sort((a, b) => {
        const cnt = (prev100[b] || 0) - (prev100[a] || 0);
        if (cnt !== 0) return cnt;
        return (rankMap[a]?.[prevDate] ?? 9999) - (rankMap[b]?.[prevDate] ?? 9999);
      })
      .forEach((b, i) => { prevBrandRankMap[b] = i + 1; });
  }

  // 선택 브랜드의 상품 목록 (최신일 기준 순위 오름차순)
  const brandProducts = products
    .filter(p => p.brand === selBrand && p.ranks[latestDate])
    .sort((a, b) => (a.ranks[latestDate] ?? 9999) - (b.ranks[latestDate] ?? 9999));

  return (
    <div>
      {/* ── 헤더 / 새로고침 ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        {data.cachedAt && (
          <span className="card-sub">갱신: {new Date(data.cachedAt).toLocaleString('ko-KR')}</span>
        )}
        <button className="btn btn-sm" onClick={() => load(true)} disabled={loading}>
          {loading ? '갱신 중...' : '↺ 새로고침'}
        </button>
      </div>

      {/* ── 브랜드 순위 카드 그리드 ── */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">브랜드 순위</div>
            {latestDate && <div className="card-sub">{latestDate} 기준</div>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {prevDate && <span className="card-sub">전일({fmtDate(prevDate)}) 대비 변동</span>}
            {brands.length > 10 && (
              <button className="btn btn-sm" onClick={() => setShowAllBrands(v => !v)}>
                {showAllBrands ? '상위 10개만' : `전체 ${brands.length}개`}
              </button>
            )}
          </div>
        </div>
        <div className="brand-stats-grid" style={{ padding: '12px 16px' }}>
          {(showAllBrands ? brands : brands.slice(0, 10)).map(brand => {
            const curRank  = rankMap[brand]?.[latestDate];
            const prevRank = prevDate ? rankMap[brand]?.[prevDate] : null;
            const bRank    = brandRankMap[brand];
            const isOurs   = brand === ourBrand;
            const isSelected = brand === selBrand;

            return (
              <div
                key={brand}
                className={`brand-stat-card${isOurs ? ' highlight' : ''}${isSelected ? ' selected' : ''}`}
                style={{ cursor: 'pointer', outline: isSelected ? '2px solid var(--accent)' : 'none' }}
                onClick={() => { setSelBrand(brand); setShowAllProducts(false); }}
                title="클릭하여 제품 상세 보기"
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <div className="brand-stat-name" title={brand}>{brand}</div>
                  <span style={{
                    fontSize: 12, fontWeight: 700,
                    color: bRank <= 3 ? 'var(--accent)' : bRank <= 10 ? 'var(--warning)' : 'var(--text3)',
                  }}>
                    {bRank}위
                  </span>
                </div>
                <div className="brand-stat-row">
                  <span>최상위 순위</span>
                  <span className="brand-stat-val">{curRank ?? '-'}위</span>
                </div>
                <div className="brand-stat-row">
                  <span>100위 내</span>
                  <span className="brand-stat-val">{brand100Map[brand] ?? 0}개</span>
                </div>
                <div className="brand-stat-row">
                  <span>300위 내</span>
                  <span className="brand-stat-val">{brandCountMap[brand] ?? 0}개</span>
                </div>
                {prevDate && prevBrandRankMap[brand] && (
                  <div className="brand-stat-row" style={{ marginTop: 2 }}>
                    <span>전일 대비</span>
                    <span className="brand-stat-val">
                      <RankChange prev={prevBrandRankMap[brand]} cur={bRank} />
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 선택 브랜드 제품 랭킹 ── */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span
                style={{
                  background: selBrand === ourBrand ? 'var(--accent-dim, #eff6ff)' : 'var(--surface2)',
                  color: selBrand === ourBrand ? 'var(--accent)' : 'var(--text2)',
                  border: `1px solid ${selBrand === ourBrand ? 'var(--accent)' : 'var(--border2)'}`,
                  borderRadius: 6, padding: '2px 8px', fontSize: 11,
                }}
              >
                {selBrand}
              </span>
              제품 랭킹{dates.length >= 2 ? ' 변동' : ''}
            </div>
            <div className="card-sub">
              {latestDate} 기준 · {brandProducts.length}개 제품
            </div>
          </div>
          {dates.length < 2 && (
            <span className="card-sub" style={{ fontSize: 10 }}>데이터 누적 시 변동 표시</span>
          )}
        </div>

        {brandProducts.length === 0 ? (
          <div className="empty">해당 날짜에 노출된 제품이 없습니다.</div>
        ) : (() => {
          const top100   = brandProducts.filter(p => (p.ranks[latestDate] ?? 999) <= 100);
          const rest     = brandProducts.filter(p => (p.ranks[latestDate] ?? 999) >  100);
          const visible  = showAllProducts ? brandProducts : top100;
          return (
            <>
              <div className="tbl-wrap">
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: 50, textAlign: 'center' }}>현재</th>
                      {prevDate && <th style={{ width: 60, textAlign: 'center' }}>변동</th>}
                      <th>제품명</th>
                      <th style={{ width: 90, textAlign: 'right' }}>가격</th>
                      {dates.slice(0, -1).slice(-7).reverse().map(d => (
                        <th key={d} style={{ textAlign: 'center', minWidth: 44 }}>{fmtDate(d)}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((p, i) => {
                      const curR  = p.ranks[latestDate];
                      const prevR = prevDate ? p.ranks[prevDate] : null;
                      return (
                        <tr key={i}>
                          <td className={`heatmap-cell ${rankClass(curR)}`} style={{ textAlign: 'center', fontWeight: 700 }}>
                            {curR ?? '-'}
                          </td>
                          {prevDate && (
                            <td style={{ textAlign: 'center' }}>
                              {prevR
                                ? <RankChange prev={prevR} cur={curR} />
                                : <span style={{ color: 'var(--warning)', fontSize: 10, fontWeight: 700 }}>NEW</span>}
                            </td>
                          )}
                          <td>
                            <a
                              href={p.link}
                              target="_blank"
                              rel="noreferrer"
                              style={{ color: 'var(--text)', fontSize: 12, display: 'block', maxWidth: 340, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                              onMouseOver={e => { e.target.style.color = 'var(--accent)'; e.target.style.textDecoration = 'underline'; }}
                              onMouseOut={e => { e.target.style.color = 'var(--text)'; e.target.style.textDecoration = 'none'; }}
                            >{p.title}</a>
                          </td>
                          <td style={{ textAlign: 'right', fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>
                            {fmtPrice(p.price)}
                          </td>
                          {dates.slice(0, -1).slice(-7).reverse().map(d => {
                            const r = p.ranks[d];
                            return (
                              <td key={d} className={`heatmap-cell ${rankClass(r)}`} style={{ textAlign: 'center' }}>
                                {r ?? '-'}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {rest.length > 0 && (
                <button
                  onClick={() => setShowAllProducts(v => !v)}
                  style={{
                    display: 'block', width: '100%', padding: '9px 0',
                    fontSize: 12, color: 'var(--text3)',
                    background: 'none', border: 'none',
                    borderTop: '1px solid var(--border)',
                    cursor: 'pointer', transition: 'background 0.15s',
                  }}
                  onMouseOver={e => { e.currentTarget.style.background = 'var(--surface2)'; e.currentTarget.style.color = 'var(--text)'; }}
                  onMouseOut={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text3)'; }}
                >
                  {showAllProducts ? '상위 100위만' : `전체 ${brandProducts.length}개`}
                </button>
              )}
            </>
          );
        })()}
      </div>

      {/* 범례 */}
      <div className="card" style={{ padding: '10px 16px' }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <span className="card-sub">순위 색상:</span>
          {[
            { cls: 'r1',  label: '1위' }, { cls: 'r2', label: '2위' }, { cls: 'r3', label: '3위' },
            { cls: 'r5',  label: '4~5위' }, { cls: 'r10', label: '6~10위' },
            { cls: 'r20', label: '11~20위' }, { cls: 'r50', label: '21~50위' }, { cls: 'rlo', label: '51위~' },
          ].map(({ cls, label }) => (
            <span key={cls} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <span className={`heatmap-cell ${cls}`} style={{ display: 'inline-block', width: 18, height: 14, borderRadius: 3 }} />
              <span style={{ fontSize: 10, color: 'var(--text3)' }}>{label}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
