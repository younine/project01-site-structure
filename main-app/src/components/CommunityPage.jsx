import { useState } from 'react';
import Sidebar from './Sidebar';
import PostList from './PostList';
import SettingsPanel from './SettingsPanel';
import { authFetch } from './authFetch';

export default function CommunityPage({ user, hasPermission, onLogout }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [tab, setTab] = useState('posts');
  const [collecting, setCollecting] = useState(false);
  const [lastCollected, setLastCollected] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

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
        onLogout={onLogout}
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
            {lastCollected && <span className="sync-time">최종 수집: {lastCollected}</span>}
            <button className="refresh-btn" onClick={triggerCollect} disabled={collecting}>
              {collecting ? '수집 중...' : '↺ 지금 갱신'}
            </button>
          </div>
        </header>
        <div className="content">
          <div className="community-tab-bar">
            <button className={`community-tab-btn${tab === 'posts' ? ' active' : ''}`} onClick={() => setTab('posts')}>게시글</button>
            <button className={`community-tab-btn${tab === 'settings' ? ' active' : ''}`} onClick={() => setTab('settings')}>설정</button>
          </div>
          {tab === 'posts' ? <PostList key={refreshKey} /> : <SettingsPanel />}
        </div>
      </div>
    </div>
  );
}
