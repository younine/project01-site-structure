import { useState, useRef } from 'react';
import Sidebar from './components/Sidebar';
import './App.css';

const COMP_CLS = { '높음': 'comp-high', '중간': 'comp-mid', '낮음': 'comp-low' };

function fmt(n) {
  if (n === null || n === undefined) return '-';
  return Number(n).toLocaleString();
}

function fmtPct(n) {
  if (n === null || n === undefined) return '-';
  return Number(n).toFixed(2) + '%';
}

function ResultCard({ data, onSearch }) {
  return (
    <div className="card result-card">
      <div className="card-header">
        <div>
          <div className="card-title">📊 {data.keyword}</div>
          {data.compIdx && (
            <div className="card-sub">
              경쟁도&nbsp;
              <span className={`comp-badge ${COMP_CLS[data.compIdx] || ''}`}>{data.compIdx}</span>
              {data.plAvgDepth != null && (
                <>&nbsp;· 평균 게재순위 <strong>{data.plAvgDepth}위</strong></>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 월간 검색량 */}
      <div className="section-label">월간 검색량</div>
      <div className="stat-row">
        <div className="stat-item">
          <div className="stat-label">PC 검색수</div>
          <div className="stat-value">{fmt(data.monthlyPcQcCnt)}</div>
        </div>
        <div className="stat-item">
          <div className="stat-label">모바일 검색수</div>
          <div className="stat-value">{fmt(data.monthlyMobileQcCnt)}</div>
        </div>
        <div className="stat-item">
          <div className="stat-label">PC 월평균 클릭</div>
          <div className="stat-value">{fmt(data.monthlyAvePcClkCnt)}</div>
        </div>
        <div className="stat-item">
          <div className="stat-label">모바일 월평균 클릭</div>
          <div className="stat-value">{fmt(data.monthlyAveMobileClkCnt)}</div>
        </div>
      </div>

      {/* CTR */}
      <div className="stat-row stat-row-2">
        <div className="stat-item">
          <div className="stat-label">PC 평균 CTR</div>
          <div className="stat-value stat-value-sm">{fmtPct(data.monthlyAvePcCtr)}</div>
        </div>
        <div className="stat-item">
          <div className="stat-label">모바일 평균 CTR</div>
          <div className="stat-value stat-value-sm">{fmtPct(data.monthlyAveMobileCtr)}</div>
        </div>
      </div>

      {/* 연관 키워드 */}
      {data.related && data.related.length > 0 && (
        <>
          <div className="section-label" style={{ borderTop: '1px solid var(--border)' }}>연관 키워드</div>
          <div className="tbl-wrap">
            <table>
              <thead>
                <tr>
                  <th>키워드</th>
                  <th>PC 검색</th>
                  <th>모바일 검색</th>
                  <th>경쟁도</th>
                  <th>PC 클릭</th>
                  <th>모바일 클릭</th>
                </tr>
              </thead>
              <tbody>
                {data.related.map(r => (
                  <tr key={r.keyword} className="rel-row" onClick={() => onSearch(r.keyword)}>
                    <td className="kw-cell">{r.keyword}</td>
                    <td>{fmt(r.monthlyPcQcCnt)}</td>
                    <td>{fmt(r.monthlyMobileQcCnt)}</td>
                    <td>
                      {r.compIdx
                        ? <span className={`comp-badge ${COMP_CLS[r.compIdx] || ''}`}>{r.compIdx}</span>
                        : '-'}
                    </td>
                    <td>{fmt(r.monthlyAvePcClkCnt)}</td>
                    <td>{fmt(r.monthlyAveMobileClkCnt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [keyword,     setKeyword]     = useState('');
  const [loading,     setLoading]     = useState(false);
  const [result,      setResult]      = useState(null);
  const [error,       setError]       = useState(null);
  const [history,     setHistory]     = useState([]);
  const inputRef = useRef(null);

  async function search(kw) {
    const q = (kw || keyword).trim();
    if (!q) return;
    if (kw) setKeyword(kw);
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) { window.location.href = '/'; return; }
      const res = await fetch('/api/nsearchad/estimate', {
        method:  'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body:    JSON.stringify({ keyword: q }),
      });
      if (res.status === 401) { window.location.href = '/'; return; }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setResult(data);
      setHistory(prev => [q, ...prev.filter(h => h !== q)].slice(0, 8));
    } catch (e) {
      setError(e.message);
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app-shell">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="main">
        <header className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button className="hamburger-btn" onClick={() => setSidebarOpen(v => !v)} aria-label="메뉴">☰</button>
            <div className="topbar-title">네이버 검색광고 키워드 분석</div>
          </div>
        </header>

        <div className="content">
          <div className="card search-card">
            <div className="card-header">
              <div className="card-title">키워드 입력</div>
            </div>
            <div className="input-row">
              <input
                ref={inputRef}
                className="input kw-input"
                type="text"
                placeholder="키워드를 입력하세요 (예: 모니터)"
                value={keyword}
                onChange={e => setKeyword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && search()}
                disabled={loading}
              />
              <button
                className="btn btn-primary"
                onClick={() => search()}
                disabled={loading || !keyword.trim()}
              >
                {loading ? '조회 중...' : '조회'}
              </button>
            </div>

            {history.length > 0 && (
              <div className="history-row">
                <span className="input-label">최근 조회</span>
                <div className="history-chips">
                  {history.map(h => (
                    <button
                      key={h}
                      className="chip"
                      onClick={() => search(h)}
                      disabled={loading}
                    >
                      {h}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="error-box">오류: {error}</div>
          )}

          {result && <ResultCard data={result} onSearch={search} />}

          {!result && !error && !loading && (
            <div className="empty-state">
              <div className="empty-icon">📊</div>
              <div>키워드를 입력하면 월간 검색량, 경쟁도, 클릭수, CTR과 연관 키워드를 확인할 수 있습니다</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
