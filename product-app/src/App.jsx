import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './hooks/useAuth';
import Sidebar from './components/Sidebar';
import ProductSheet from './components/ProductSheet';
import ApiKeyPanel from './components/ApiKeyPanel';
import './App.css';

function getToken() { return localStorage.getItem('auth_token'); }

export default function App() {
  const { user, loading: authLoading, logout, hasPermission } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [activeTab, setActiveTab] = useState('market');

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (!user) return;
    fetch('/api/products', { headers: { Authorization: `Bearer ${getToken()}` } })
      .then(r => r.ok ? r.json() : { products: [] })
      .then(data => {
        setRows((data.products || []).map(p => ({
          id: Math.random().toString(36).slice(2), ...p,
        })));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  const handleSave = useCallback(async (rowsToSave) => {
    setSaving(true);
    setMsg('');
    try {
      const products = rowsToSave.map(({ id, ...rest }) => rest);
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ products }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || '저장 실패');
      }
      setMsg('저장되었습니다.');
      setTimeout(() => setMsg(''), 3000);
    } catch (e) {
      setMsg(`오류: ${e.message}`);
    } finally {
      setSaving(false);
    }
  }, []);

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
          <div className="product-tabs">
            <button
              className={`product-tab${activeTab === 'market' ? ' active' : ''}`}
              onClick={() => setActiveTab('market')}
            >마켓 코드</button>
            <button
              className={`product-tab${activeTab === 'b2b' ? ' active' : ''}`}
              onClick={() => setActiveTab('b2b')}
            >B2B단가표</button>
          </div>
          <ProductSheet
            activeTab={activeTab}
            rows={rows}
            setRows={setRows}
            loading={loading}
            saving={saving}
            msg={msg}
            onSave={handleSave}
            hasPermission={hasPermission}
          />
        </div>
      </div>
      {showApiKey && <ApiKeyPanel onClose={() => setShowApiKey(false)} />}
    </div>
  );
}
