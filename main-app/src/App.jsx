import { useState } from 'react';
import { useDashboard } from './hooks/useDashboard';
import { useAuth } from './hooks/useAuth';
import Sidebar from './components/Sidebar';
import NewProducts from './components/NewProducts';
import NaverBrandRank from './components/NaverBrandRank';
import LoginPage from './components/LoginPage';
import AdminSettings from './components/AdminSettings';
import './App.css';

function TopBar({ lastUpdated, onRefresh, loading, onMenuClick }) {
  return (
    <header className="topbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button className="hamburger-btn" onClick={onMenuClick} aria-label="메뉴">☰</button>
        <div className="topbar-title">대시보드</div>
      </div>
      <div className="topbar-right">
        {lastUpdated && <span className="sync-time">최종 갱신: {lastUpdated}</span>}
        <span className="status-badge">● 정상</span>
        <button className="refresh-btn" onClick={onRefresh} disabled={loading}>
          {loading ? '갱신 중...' : '↺ 새로고침'}
        </button>
      </div>
    </header>
  );
}

function CoupangCard({ data }) {
  const collected = data?.collected ?? '-';
  const soldout   = data?.soldout   ?? '-';
  const rematch   = data?.rematch   ?? '-';
  const lastAt    = data?.lastAt    ?? null;

  return (
    <div className="card coup-card">
      <div className="card-header">
        <div className="card-title">🛒 쿠팡 수집 현황</div>
        <a href="/coupang/" className="card-link">수집기 열기</a>
      </div>
      <div className="coup-body">
        <div className="coup-item">
          <span className="dot dot-success" />
          <span className="coup-label">수집 완료</span>
          <span className="coup-val">{collected}개</span>
        </div>
        <div className="coup-divider" />
        <div className="coup-item">
          <span className="dot dot-warning" />
          <span className="coup-label">품절</span>
          <span className="coup-val warn">{soldout}개</span>
        </div>
        <div className="coup-divider" />
        <div className="coup-item">
          <span className="dot dot-danger" />
          <span className="coup-label">재매칭요청</span>
          <span className="coup-val danger">{rematch}개</span>
        </div>
        {lastAt && <>
          <div className="coup-divider" />
          <div className="coup-item coup-time">
            <span className="coup-label">최종 수집</span>
            <span className="coup-val-sm">{lastAt}</span>
          </div>
        </>}
      </div>
    </div>
  );
}

// permission: null → 항상 표시 / 문자열 → 해당 권한 보유 시만 표시
function useDashboardCards(data, hasPermission) {
  return [
    { key: 'newProducts',   permission: null,       node: <NewProducts products={data.newProducts} /> },
    { key: 'coupang',       permission: 'coupang_viewer',  node: <CoupangCard data={data.coupangData} /> },
    { key: 'naverBrand',    permission: null,       node: <div className="half-card"><NaverBrandRank /></div> },
  ].filter(card => card.permission === null || hasPermission(card.permission));
}

export default function App() {
  const { user, loading: authLoading, login, logout, hasPermission } = useAuth();
  const { newProducts, coupangData, lastUpdated, loading, refresh } = useDashboard();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const pathname = window.location.pathname;
  const isLoginRoute = pathname === '/login';
  const isAdminSettings = /^\/admin-settings(\/)?$/.test(pathname);

  if (authLoading) {
    return <div className="auth-loading">로딩 중...</div>;
  }

  if (isAdminSettings) {
    if (!user || user.role !== 'admin') {
      window.location.href = '/';
      return null;
    }
    return <AdminSettings />;
  }

  if (isLoginRoute) {
    const params = new URLSearchParams(window.location.search);
    const redirect = params.get('redirect') || '/';
    return (
      <LoginPage
        onLogin={async (username, password) => {
          await login(username, password);
          window.location.href = redirect;
        }}
      />
    );
  }

  const cards = useDashboardCards({ newProducts, coupangData }, hasPermission);

  return (
    <div className="app-shell">
      <Sidebar
        coupangCount={coupangData?.collected ?? 0}
        user={user}
        hasPermission={hasPermission}
        onLogout={async () => { await logout(); window.location.reload(); }}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="main">
        <TopBar lastUpdated={lastUpdated} onRefresh={refresh} loading={loading} onMenuClick={() => setSidebarOpen(v => !v)} />
        <div className="content">
          {cards.map(card => <div key={card.key}>{card.node}</div>)}
        </div>
      </div>
    </div>
  );
}
