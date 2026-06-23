import { useState } from 'react';
import { useAuth } from './hooks/useAuth';
import Sidebar from './components/Sidebar';
import PostList from './components/PostList';
import SettingsPanel from './components/SettingsPanel';
import './App.css';

const TOKEN_KEY = 'auth_token';

function authFetch(url, opts = {}) {
  const token = localStorage.getItem(TOKEN_KEY);
  return fetch(url, {
    ...opts,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });
}

export default function App() {
  const { user, loading: authLoading, logout, hasPermission } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [tab, setTab] = useState('posts');
  const [collecting, setCollecting] = useState(false);
  const [lastCollected, setLastCollected] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  if (authLoading) return <div className="auth-loading">로딩 중...</div>;

  async function triggerCollect() {
    setCollecting(true);
    try {
      const res = await authFetch('/api/community/collect', { method: 'POST' });
      const data = await res.json();
      if (data.ok) {
        setLastCollected(new Date().toLocaleString('ko-KR'));
        setRefreshKey(k => k + 1);
      }
    } catch {}
    setCollecting(false);
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
            <div className="topbar-title">📰 커뮤니티 수집</div>
          </div>
          <div className="topbar-right">
            {lastCollected && <span className="last-updated">최종 수집: {lastCollected}</span>}
            <button className="btn btn-primary" onClick={triggerCollect} disabled={collecting}>
              {collecting ? '수집 중...' : '지금 갱신'}
            </button>
          </div>
        </header>

        <div className="content">
          <div className="tab-bar">
            <button className={`tab-btn${tab === 'posts' ? ' active' : ''}`} onClick={() => setTab('posts')}>게시글</button>
            <button className={`tab-btn${tab === 'settings' ? ' active' : ''}`} onClick={() => setTab('settings')}>설정</button>
          </div>

          {tab === 'posts'
            ? <PostList key={refreshKey} />
            : <SettingsPanel />
          }
        </div>
      </div>
    </div>
  );
}
