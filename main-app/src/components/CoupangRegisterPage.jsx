import { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import CategoryTab from './CategoryTab';
import { authFetch } from './authFetch';

export default function CoupangRegisterPage({ user, hasPermission, onLogout }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [categories, setCategories]   = useState([]);
  const [activeTab, setActiveTab]     = useState(null);

  useEffect(() => {
    if (!user) return;
    authFetch('/api/coupang/register/categories')
      .then(r => r.ok ? r.json() : [])
      .then(list => {
        setCategories(list);
        if (list.length > 0) setActiveTab(list[0].id);
      })
      .catch(() => {});
  }, [user]);

  if (!user) {
    window.location.href = `/login?redirect=${encodeURIComponent('/coupang/register/')}`;
    return null;
  }

  if (!hasPermission('coupang_viewer')) {
    return (
      <div className="auth-loading">
        <div style={{ fontSize: 15, fontWeight: 600 }}>접근 권한이 없습니다</div>
        <div style={{ fontSize: 12, color: 'var(--text3)' }}>쿠팡 수집기 권한이 필요합니다</div>
        <a href="/" style={{ fontSize: 12, color: 'var(--accent)' }}>← 대시보드로 이동</a>
      </div>
    );
  }

  const isAdmin = user.role === 'admin';

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
            <div className="topbar-title">📝 쿠팡 신제품 등록</div>
          </div>
        </header>

        {categories.length > 0 && (
          <div className="cat-tab-bar">
            {categories.map(cat => (
              <button
                key={cat.id}
                className={`cat-tab${activeTab === cat.id ? ' active' : ''}`}
                onClick={() => setActiveTab(cat.id)}
              >
                {cat.label}
                {!cat.hasTemplate && <span className="cat-no-tpl">양식 없음</span>}
              </button>
            ))}
            {isAdmin && (
              <button className="cat-tab cat-tab-add" onClick={() => {
                const name = prompt('새 카테고리 ID (영문, 예: keyboard)');
                if (name && !categories.find(c => c.id === name)) {
                  setCategories(prev => [...prev, { id: name, label: name, hasCSV: false, hasTemplate: false }]);
                  setActiveTab(name);
                }
              }}>+ 카테고리 추가</button>
            )}
          </div>
        )}

        <div className="page-body">
          {activeTab && (
            <CategoryTab
              key={activeTab}
              category={categories.find(c => c.id === activeTab) || { id: activeTab, label: activeTab, hasCSV: false, hasTemplate: false }}
              isAdmin={isAdmin}
            />
          )}
        </div>
      </div>
    </div>
  );
}
