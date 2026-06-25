import { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import DailyTab from './DailyTab';
import RealtimeTab from './RealtimeTab';

export default function NrankPage({ user, hasPermission, onLogout }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [tab,         setTab]         = useState('daily');
  const [categories,  setCategories]  = useState([]);
  const [categoryId,  setCategoryId]  = useState(null);

  useEffect(() => {
    fetch('/api/nrank/categories')
      .then(r => r.json())
      .then(list => {
        setCategories(list);
        if (list.length > 0) setCategoryId(list[0].id);
      })
      .catch(() => {});
  }, []);

  const currentCategory = categories.find(c => c.id === categoryId) || null;

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
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button className="hamburger-btn" onClick={() => setSidebarOpen(v => !v)} aria-label="메뉴">☰</button>
            <div className="topbar-title">네이버 검색 랭킹</div>
          </div>
          {categories.length > 1 && (
            <div style={{ display: 'flex', gap: 4 }}>
              {categories.map(c => (
                <button
                  key={c.id}
                  className={`btn btn-sm${c.id === categoryId ? ' btn-primary' : ''}`}
                  onClick={() => setCategoryId(c.id)}
                >
                  {c.name}
                </button>
              ))}
            </div>
          )}
        </header>
        <div className="content">
          <div className="tabs">
            <button className={`tab-btn${tab === 'daily' ? ' active' : ''}`} onClick={() => setTab('daily')}>일일 브랜드 순위</button>
            <button className={`tab-btn${tab === 'realtime' ? ' active' : ''}`} onClick={() => setTab('realtime')}>실시간 조회</button>
          </div>
          {categoryId && tab === 'daily'    && <DailyTab    categoryId={categoryId} ourBrand={currentCategory?.ourBrand} />}
          {categoryId && tab === 'realtime' && <RealtimeTab categoryId={categoryId} ourBrand={currentCategory?.ourBrand} />}
        </div>
      </div>
    </div>
  );
}
