import { useState } from 'react';

function fmtPrice(p) {
  if (!p) return '-';
  return Number(p).toLocaleString('ko-KR') + '원';
}

export default function RealtimeTab({ ourBrand }) {
  const [keyword,  setKeyword]  = useState('');
  const [brand,    setBrand]    = useState(ourBrand || '');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);
  const [result,       setResult]       = useState(null);
  const [showAll,      setShowAll]      = useState(false);
  const [showAllProds, setShowAllProds] = useState(false);

  async function search(e) {
    e.preventDefault();
    if (!keyword.trim() || !brand.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setShowAll(false);
    setShowAllProds(false);
    try {
      const res = await fetch('/api/nrank/realtime', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword: keyword.trim(), brand: brand.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      setResult(json);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const products = result?.products || [];
  const allBrands = result?.allBrands || [];
  const visibleBrands = showAll ? allBrands : allBrands.slice(0, 10);  // 기본 10개

  return (
    <div>
      {/* 검색 폼 */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">실시간 브랜드 순위 조회</div>
          <span className="card-sub">네이버 쇼핑 검색 상위 300개 기준</span>
        </div>
        <form onSubmit={search} className="input-row">
          <span className="input-label">검색어</span>
          <input
            className="input"
            style={{ width: 180 }}
            value={keyword}
            onChange={e => setKeyword(e.target.value)}
            placeholder="예: 게이밍 키보드"
            required
          />
          <span className="input-label">브랜드</span>
          <input
            className="input"
            style={{ width: 140 }}
            value={brand}
            onChange={e => setBrand(e.target.value)}
            placeholder="예: 한성"
            required
          />
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? '검색 중...' : '검색'}
          </button>
        </form>
      </div>

      {error && (
        <div className="card">
          <div className="empty" style={{ color: 'var(--danger)' }}>{error}</div>
        </div>
      )}

      {loading && (
        <div className="card">
          <div className="loading">네이버 쇼핑 검색 중 (최대 300개)...</div>
        </div>
      )}

      {result && (
        <>
          {/* 타깃 브랜드 요약 */}
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">
                  "{result.matchedBrand || result.brand}" 브랜드 결과
                </div>
                <div className="card-sub">
                  키워드: {result.keyword}
                </div>
              </div>
            </div>
            <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {/* 한 문장 요약 */}
              {result.count > 0 ? (
                <div style={{
                  background: 'var(--accent-dim, #eff6ff)',
                  border: '1px solid var(--accent)',
                  borderRadius: 8, padding: '10px 14px',
                  fontSize: 13, lineHeight: '1.7',
                }}>
                  검색어 <b>"{result.keyword}"</b> 상위 <b>{result.totalItems}개</b> 결과 중{' '}
                  <b style={{ color: 'var(--accent)' }}>{result.matchedBrand || result.brand}</b> 상품이{' '}
                  <b style={{ color: 'var(--accent)' }}>{result.count}개</b> 노출되며,{' '}
                  최초 등장은 <b>{result.firstRank}위</b>입니다.{' '}
                  전체 <b>{result.totalBrands}개 브랜드</b> 중{' '}
                  노출 상품 기준 <b style={{ color: 'var(--warning)' }}>{result.brandRank}위 브랜드</b>입니다.
                </div>
              ) : (
                <div style={{
                  background: 'var(--danger-dim, #fef2f2)',
                  border: '1px solid var(--danger)',
                  borderRadius: 8, padding: '10px 14px',
                  fontSize: 13,
                }}>
                  검색어 <b>"{result.keyword}"</b> 상위 <b>{result.totalItems}개</b> 결과 내에{' '}
                  <b>"{result.brand}"</b> 브랜드 상품이 없습니다.
                </div>
              )}
              {/* 수치 요약 */}
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {[
                  { label: '100위 내 노출 수',  value: result.count100 > 0 ? `${result.count100}개` : '없음', color: result.count100 > 0 ? 'var(--success)' : 'var(--text3)' },
                  { label: '최상위 순위',       value: result.firstRank ? `${result.firstRank}위` : '-',       color: 'var(--accent)' },
                  { label: `${result.totalBrands}개 브랜드 중 순위`, value: result.brandRank ? `${result.brandRank}위` : '-', color: 'var(--warning)' },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{
                    flex: 1, minWidth: 110, textAlign: 'center',
                    background: 'var(--surface2)', borderRadius: 8, padding: '10px 8px',
                    border: '1px solid var(--border)',
                  }}>
                    <div style={{ fontSize: 22, fontWeight: 700, color }}>{value}</div>
                    <div className="card-sub" style={{ marginTop: 3 }}>{label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 전체 브랜드 현황 */}
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">브랜드별 집계</div>
                <div className="card-sub">상위 {result.totalItems}개 결과 · {result.totalBrands}개 브랜드 · 100위 내 개수 기준</div>
              </div>
              {allBrands.length > 10 && (
                <button className="btn btn-sm" onClick={() => setShowAll(v => !v)}>
                  {showAll ? '상위 10개만' : `전체 ${allBrands.length}개`}
                </button>
              )}
            </div>
            <div className="brand-stats-grid">
              {visibleBrands.map(b => (
                <div
                  key={b.brand}
                  className={`brand-stat-card${b.brand === (result.matchedBrand || result.brand) ? ' highlight' : ''}`}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <div className="brand-stat-name" title={b.brand}>{b.brand || '(없음)'}</div>
                    <span style={{
                      fontSize: 11, fontWeight: 700,
                      color: b.brandRank <= 3 ? 'var(--accent)' : b.brandRank <= 10 ? 'var(--warning)' : 'var(--text3)',
                    }}>
                      {b.brandRank}위
                    </span>
                  </div>
                  <div className="brand-stat-row">
                    <span>최상위 순위</span>
                    <span className="brand-stat-val">{b.firstRank}위</span>
                  </div>
                  <div className="brand-stat-row">
                    <span>100위 내</span>
                    <span className="brand-stat-val">{b.count100}개</span>
                  </div>
                  <div className="brand-stat-row">
                    <span>300위 내</span>
                    <span className="brand-stat-val">{b.count}개</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 상품 목록 */}
          {products.length > 0 && (
            <div className="card">
              <div className="card-header">
                <div className="card-title">"{result.matchedBrand || result.brand}" 상품 목록</div>
                <span className="card-sub">{products.length}개</span>
              </div>
              <div className="tbl-wrap">
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: 50, textAlign: 'center' }}>순위</th>
                      <th style={{ width: 44 }}></th>
                      <th>상품명</th>
                      <th className="price-col" style={{ width: 100 }}>가격</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(showAllProds ? products : products.filter(p => p.rank <= 100)).map(p => (
                      <tr key={p.rank}>
                        <td style={{ textAlign: 'center', fontWeight: 600, color: p.rank <= 10 ? 'var(--accent)' : 'var(--text3)' }}>
                          {p.rank}
                        </td>
                        <td>
                          {p.image
                            ? <img src={p.image} alt="" className="product-img" />
                            : <div className="product-img" style={{ background: 'var(--surface2)' }} />}
                        </td>
                        <td className="product-title">
                          <a href={p.link} target="_blank" rel="noreferrer">{p.title}</a>
                        </td>
                        <td className="price-col">{fmtPrice(p.price)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {products.filter(p => p.rank > 100).length > 0 && (
                <button
                  onClick={() => setShowAllProds(v => !v)}
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
                  {showAllProds ? '상위 100위만' : `전체 ${products.length}개`}
                </button>
              )}
            </div>
          )}

          {products.length === 0 && result.count === 0 && (
            <div className="card">
              <div className="empty">"{result.brand}" 브랜드 상품이 상위 {result.totalItems}개 내에 없습니다.</div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
