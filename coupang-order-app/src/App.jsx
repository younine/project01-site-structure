import { useState } from 'react';
import './App.css';
import Sidebar from './components/Sidebar';
import useConverter from './hooks/useConverter';
import { useAuth } from './hooks/useAuth';
import UploadSection from './components/UploadSection';
import LogPanel from './components/LogPanel';
import PreviewTable from './components/PreviewTable';
import HsPanel from './components/HsPanel';

export default function App() {
  const [showHs, setShowHs] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, loading: authLoading, hasPermission, logout } = useAuth();
  const {
    zipFile, setZipFile, hsMap, loadHS, allRows,
    logs, progress, progressText, stats, warnings,
    converting, runConvert, fmt, setFmt, doDownload,
    bizNo, setBizNo, reset,
    hsSource, saveHsToServer,
  } = useConverter();

  if (authLoading) {
    return <div className="auth-loading">로딩 중...</div>;
  }

  if (!user) {
    window.location.href = `/login?redirect=${encodeURIComponent('/coupang/order/')}`;
    return null;
  }

  const canView = hasPermission('coupang_viewer');
  const isEditor = hasPermission('coupang_editor');

  if (!canView) {
    window.location.replace('/');
    return null;
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
            <div className="topbar-title">📦 쿠팡 발주서 변환기</div>
          </div>
          <div className="topbar-right">
            <span className="order-badge">v2.0</span>
            {isEditor && (
              <button className="hs-icon-btn" onClick={() => setShowHs(true)} title="HS코드 관리">
                ⚙️
              </button>
            )}
          </div>
        </header>

        <div className="order-content">
          <div className="card">
            <UploadSection
              zipFile={zipFile} setZipFile={setZipFile}
              loadHS={loadHS} hsMap={hsMap} hsSource={hsSource}
              bizNo={bizNo} setBizNo={setBizNo}
              isEditor={isEditor}
            />
            <div className="run-row">
              <button
                className="btn btn-primary"
                onClick={runConvert}
                disabled={!zipFile || converting}
              >
                {converting ? '변환 중...' : '▶ 변환 실행'}
              </button>
              <button className="btn btn-ghost" onClick={reset}>↺ 초기화</button>
              <span className="run-hint">
                {!zipFile
                  ? 'ZIP 파일을 업로드하면 활성화됩니다'
                  : converting
                  ? '변환 중입니다...'
                  : '▶ 버튼을 클릭하여 변환을 시작하세요'}
              </span>
            </div>
          </div>

          {logs.length > 0 && (
            <div className="card">
              <LogPanel logs={logs} progress={progress} progressText={progressText} stats={stats} warnings={warnings} />
            </div>
          )}

          {allRows.length > 0 && (
            <div className="card">
              <PreviewTable rows={allRows} fmt={fmt} setFmt={setFmt} onDownload={doDownload} onReset={reset} stats={stats} />
            </div>
          )}
        </div>
      </div>

      {showHs && (
        <HsPanel hsMap={hsMap} hsSource={hsSource} onSave={saveHsToServer} onClose={() => setShowHs(false)} />
      )}
    </div>
  );
}
