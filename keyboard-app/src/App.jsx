import { useState } from 'react';
import Sidebar from './components/Sidebar';
import FilterTabs from './components/FilterTabs';
import ResultTable from './components/ResultTable';
import NewProducts from './components/NewProducts';
import { useKeyboard } from './hooks/useKeyboard';
import { useAuth } from './hooks/useAuth';

export default function App() {
  const { models, newProducts, loading, error, lastUpdated, reload } = useKeyboard();
  const { user, hasPermission, logout } = useAuth();
  const [tab, setTab] = useState('compare');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const ownCount = models.length;
  const compCount = models.reduce((a, m) => a + (m.comps || []).length, 0);
  const lowerCount = models.reduce((a, m) => a + (m.comps || []).filter(c => c.diffOwn < 0).length, 0);
  const newCount = newProducts.filter(p => p.type === '경쟁사').length;

  const d = lastUpdated;
  const dateStr = d
    ? `최종 갱신: ${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}.`
    : null;

  return (
    <div className="app-shell">
      <Sidebar
        user={user}
        hasPermission={hasPermission}
        onLogout={async () => { await logout(); window.location.href = '/login'; }}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="main">
        <header className="topbar">
          <div className="topbar-left">
            <button className="hamburger-btn" onClick={() => setSidebarOpen(v => !v)}>☰</button>
            <div className="topbar-title">⌨ 키보드 가격 비교</div>
          </div>
          <div className="topbar-right">
            {dateStr && <span style={{ fontSize: 11, color: 'var(--text3)' }}>{dateStr}</span>}
            {ownCount > 0 && (
              <div style={{ display: 'flex', gap: 16, fontSize: 12 }}>
                <span style={{ color: 'var(--text2)' }}>자사 <strong>{ownCount}개</strong></span>
                <span style={{ color: 'var(--text2)' }}>경쟁사 <strong>{compCount}개</strong></span>
                <span style={{ color: '#dc2626' }}>저가 <strong>{lowerCount}건</strong></span>
              </div>
            )}
            <button onClick={reload} disabled={loading} style={s.reloadBtn}>
              {loading ? '로딩 중…' : '새로고침'}
            </button>
          </div>
        </header>

        <main style={s.main}>
          <div style={s.summaryGrid}>
            <div style={s.card}>
              <div style={s.cardLabel}>자사보다 저가</div>
              <div style={{ ...s.cardValue, color: '#dc2626' }}>{lowerCount}건</div>
              <div style={s.cardSub}>경쟁사 제품 기준</div>
            </div>
            <div style={s.card}>
              <div style={s.cardLabel}>이번달 타사 신제품</div>
              <div style={{ ...s.cardValue, color: '#d97706' }}>{newCount}개</div>
              <div style={s.cardSub}>
                {new Date().getFullYear()}년 {new Date().getMonth() + 1}월
              </div>
            </div>
          </div>

          <div style={s.toolbar}>
            <FilterTabs tab={tab} setTab={setTab} compareCount={models.length} newCount={newCount} />
          </div>

          {error && <div style={s.error}>오류: {error}</div>}

          {loading && !error && (
            <div style={s.loadingWrap}>
              <div style={s.spinner} />
              <span style={s.loadingText}>데이터 로딩 중…</span>
            </div>
          )}

          {!loading && !error && (
            <>
              {tab === 'compare' && <ResultTable models={models} />}
              {tab === 'new' && <NewProducts products={newProducts} />}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

const s = {
  reloadBtn: {
    padding: '6px 14px', fontSize: 12, fontWeight: 500,
    color: '#5a6072', background: '#fff',
    border: '1px solid rgba(0,0,0,0.12)', borderRadius: 6, cursor: 'pointer',
  },
  main: { padding: '16px 0 0', maxWidth: 1400, margin: '0 auto' },
  summaryGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 20 },
  card: { background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 10, padding: '14px 16px' },
  cardLabel: { fontSize: 11, color: '#9399a8', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' },
  cardValue: { fontSize: 22, fontWeight: 600, letterSpacing: '-0.5px' },
  cardSub: { fontSize: 11, color: '#9399a8', marginTop: 2 },
  toolbar: { display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 0 },
  error: {
    padding: '14px 16px', borderRadius: 8,
    background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)',
    color: '#dc2626', marginBottom: 16, fontSize: 13,
  },
  loadingWrap: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '60px 0' },
  spinner: { width: 20, height: 20, border: '2px solid rgba(37,99,235,0.15)', borderTop: '2px solid #2563eb', borderRadius: '50%', animation: 'spin 0.8s linear infinite' },
  loadingText: { fontSize: 13, color: '#9399a8' },
};
