import { useState, useEffect } from 'react';
import './App.css';
import Sidebar from './components/Sidebar';
import CompuzoneTab from './components/CompuzoneTab';
import AtozTab from './components/AtozTab';
import OrderConverter from './components/OrderConverter';
import MiracleTab from './components/MiracleTab';
import SettingsEditor from './components/SettingsEditor';
import { useAuth } from './hooks/useAuth';

const isSettings = /\/b2b-order\/settings(\/)?$/.test(window.location.pathname);

function VendorCard({ id, title, color, children }) {
  return (
    <div id={id} className="vendor-card">
      <div className="vendor-card-header" style={{ background: color }}>
        <span className="vendor-card-title">{title}</span>
      </div>
      <div className="vendor-card-body">{children}</div>
    </div>
  );
}

const VENDOR_SECTIONS = ['compuzone', 'atoz', 'assacom', 'miracle'];

function useScrollActiveHash(ready) {
  const [activeHash, setActiveHash] = useState(window.location.hash || '#compuzone');

  useEffect(() => {
    if (!ready) return;
    const visibleSet = new Set();
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(e => {
          if (e.isIntersecting) visibleSet.add(e.target.id);
          else visibleSet.delete(e.target.id);
        });
        const active = VENDOR_SECTIONS.find(id => visibleSet.has(id));
        if (active) setActiveHash('#' + active);
      },
      { threshold: 0 }
    );
    VENDOR_SECTIONS.forEach(id => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [ready]);

  return activeHash;
}

export default function App() {
  const { user, loading, hasPermission, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const scrollActiveHash = useScrollActiveHash(!loading && !isSettings);

  if (loading) return null;

  if (!user) {
    window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
    return null;
  }

  const canView = hasPermission('b2b_viewer');
  const isEditor = hasPermission('b2b_editor');

  if (!canView) {
    return (
      <div className="auth-loading">
        <div style={{ fontSize: 15, fontWeight: 600 }}>접근 권한이 없습니다</div>
        <div style={{ fontSize: 12, color: 'var(--text3)' }}>B2B 발주 권한이 필요합니다</div>
        <a href="/" style={{ fontSize: 12, color: 'var(--accent)' }}>← 대시보드로 이동</a>
      </div>
    );
  }

  const sidebarProps = {
    user,
    hasPermission,
    onLogout: async () => { await logout(); window.location.href = '/login'; },
    isOpen: sidebarOpen,
    onClose: () => setSidebarOpen(false),
    activeHash: isSettings ? undefined : scrollActiveHash,
  };

  if (isSettings) {
    if (!isEditor) { window.location.replace('/b2b-order/'); return null; }
    return (
      <div className="app-shell">
        <Sidebar {...sidebarProps} />
        <div className="main">
          <header className="topbar">
            <div className="topbar-left">
              <button className="hamburger-btn" onClick={() => setSidebarOpen(v => !v)}>☰</button>
              <div className="topbar-title">⚙️ 공용 설정</div>
            </div>
            <div className="topbar-right">
              <a href="/b2b-order/" className="settings-link">← B2B 발주</a>
            </div>
          </header>
          <main className="app-main"><SettingsEditor /></main>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <Sidebar {...sidebarProps} />
      <div className="main">
        <header className="topbar">
          <div className="topbar-left">
            <button className="hamburger-btn" onClick={() => setSidebarOpen(v => !v)}>☰</button>
            <div className="topbar-title">📦 B2B 발주</div>
          </div>
          <div className="topbar-right">
            {isEditor && (
              <a href="/b2b-order/settings/" className="settings-link">⚙️ 공용 설정</a>
            )}
          </div>
        </header>
        <main className="app-main">
          <VendorCard id="compuzone" title="컴퓨존" color="#1e40af">
            <CompuzoneTab />
          </VendorCard>
          <VendorCard id="atoz" title="아토즈" color="#b45309">
            <AtozTab />
          </VendorCard>
          <VendorCard id="assacom" title="아싸컴" color="#065f46">
            <OrderConverter />
          </VendorCard>
          <VendorCard id="miracle" title="미라클" color="#5b21b6">
            <MiracleTab />
          </VendorCard>
        </main>
      </div>
    </div>
  );
}
