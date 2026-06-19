import { useState } from 'react';
import Sidebar         from './components/Sidebar';
import CollectSettings from './components/CollectSettings';
import ProgressPanel   from './components/ProgressPanel';
import ResultPanel     from './components/ResultPanel';
import { useCollector }      from './hooks/useCollector';
import { useServerSettings } from './hooks/useServerSettings';
import { useAuth }           from './hooks/useAuth';

export default function App() {
  const { user, loading: authLoading, hasPermission, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { status, progress, logs, results, collectedAt, tab, setTab, start, stop } = useCollector();
  const {
    savedUrls, addSavedUrl, removeSavedUrl,
    settings, addSetting, removeSetting, removeSettings, updateSetting, bulkSaveSettings,
  } = useServerSettings();

  const rematchItems = settings.map(s => {
    const matched = results.find(r => r.modelCode === s.skuid || r.itemId === s.collectCode);
    const currentPrice = matched ? (matched.couponPrice || matched.salePrice) : 0;
    return {
      id: s.id, skuid: s.skuid, skuname: s.skuname,
      currentPrice,
      supplyPrice: Number(s.supplyPrice) || 0,
      originalSalePrice: Number(s.originalSalePrice) || 0,
      naverUrl: s.naverUrl,
    };
  }).filter(row => row.currentPrice > 0 && row.currentPrice < row.originalSalePrice);

  if (authLoading) {
    return <div className="auth-loading">로딩 중...</div>;
  }

  if (!user) {
    window.location.href = `/login?redirect=${encodeURIComponent('/coupang/')}`;
    return null;
  }

  const canView = hasPermission('coupang_viewer');
  const isEditor = hasPermission('coupang_editor');

  if (!canView) {
    return (
      <div className="auth-loading">
        <div style={{ fontSize: 15, color: '#1a1d23', fontWeight: 600 }}>접근 권한이 없습니다</div>
        <div style={{ fontSize: 12, color: '#9399a8' }}>쿠팡 수집기 권한이 필요합니다</div>
        <a href="/" style={{ fontSize: 12, color: '#2563eb' }}>← 대시보드로 이동</a>
      </div>
    );
  }

  const activeHash = tab === 'rematch' ? '#rematch' : '';

  return (
    <div className="app-shell">
      <Sidebar
        user={user}
        hasPermission={hasPermission}
        onLogout={async () => { await logout(); window.location.href = '/login'; }}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        activeHash={activeHash}
      />
      <div className="main">
        <header className="topbar">
          <div className="topbar-left">
            <button className="hamburger-btn" onClick={() => setSidebarOpen(v => !v)}>☰</button>
            <div className="topbar-title">🛒 쿠팡 가격 수집기</div>
          </div>
        </header>
        <main style={s.body}>
          <div style={s.panel}>
            <CollectSettings onStart={start} onStop={stop} status={status} savedUrls={savedUrls} isEditor={isEditor} />
            <ProgressPanel status={status} progress={progress} logs={logs} />
          </div>
          <div style={s.content}>
            <ResultPanel
              results={results}
              collectedAt={collectedAt}
              tab={tab}
              setTab={setTab}
              settings={settings}
              addSetting={addSetting}
              removeSetting={removeSetting}
              removeSettings={removeSettings}
              updateSetting={updateSetting}
              bulkSaveSettings={bulkSaveSettings}
              rematchItems={rematchItems}
              savedUrls={savedUrls}
              addSavedUrl={addSavedUrl}
              removeSavedUrl={removeSavedUrl}
              isEditor={isEditor}
            />
          </div>
        </main>
      </div>
    </div>
  );
}

const s = {
  body: {
    display: 'flex',
    gap: 20,
    padding: '16px 0 0',
    maxWidth: 1440,
    margin: '0 auto',
    alignItems: 'flex-start',
  },
  panel: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
    width: 300,
    flexShrink: 0,
  },
  content: { flex: 1, minWidth: 0 },
};
