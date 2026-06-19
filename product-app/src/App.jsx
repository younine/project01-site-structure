import { useState } from 'react';
import { useAuth } from './hooks/useAuth';
import Sidebar from './components/Sidebar';
import ProductSpreadsheet from './components/ProductSpreadsheet';
import ApiKeyPanel from './components/ApiKeyPanel';
import './App.css';

export default function App() {
  const { user, loading: authLoading, logout, hasPermission } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  if (authLoading) return <div className="auth-loading">로딩 중...</div>;

  if (!user) {
    window.location.href = `/login?redirect=${encodeURIComponent('/products/')}`;
    return null;
  }

  if (!hasPermission('product_viewer')) {
    return (
      <div className="auth-loading" style={{ flexDirection: 'column', gap: 8 }}>
        <div style={{ fontSize: 15, color: 'var(--text)', fontWeight: 600 }}>접근 권한이 없습니다</div>
        <div style={{ fontSize: 12, color: 'var(--text3)' }}>제품 관리 권한이 필요합니다</div>
        <a href="/" style={{ fontSize: 12, color: 'var(--accent)', marginTop: 4 }}>← 대시보드로 이동</a>
      </div>
    );
  }

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
            <div className="topbar-title">📦 제품 관리</div>
          </div>
          {user.role === 'admin' && (
            <div className="topbar-right">
              <button className="btn-sheet" onClick={() => setShowApiKey(true)}>🔑 API</button>
            </div>
          )}
        </header>
        <div className="content">
          <ProductSpreadsheet hasPermission={hasPermission} />
        </div>
      </div>
      {showApiKey && <ApiKeyPanel onClose={() => setShowApiKey(false)} />}
    </div>
  );
}
