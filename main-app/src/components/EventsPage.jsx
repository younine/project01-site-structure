import { useState } from 'react';
import Sidebar from './Sidebar';
import Calendar from './Calendar';
import PromoForm from './PromoForm';
import PromoList from './PromoList';
import DetailPanel from './DetailPanel';
import { useEvents } from '../hooks/useEvents';

export default function EventsPage({ user, hasPermission, onLogout }) {
  const { promotions, loading, addPromotion, deletePromotion } = useEvents();
  const [sidebarOpen,   setSidebarOpen]   = useState(false);
  const [selectedPromo, setSelectedPromo] = useState(null);

  if (!user) {
    window.location.href = `/login?redirect=${encodeURIComponent('/events/')}`;
    return null;
  }

  const handleDelete = async (id) => {
    await deletePromotion(id);
    if (selectedPromo?.id === id) setSelectedPromo(null);
  };

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
            <div className="topbar-title">📅 행사 스케줄 관리</div>
          </div>
          <div className="topbar-right">
            {loading && <span style={{ color: 'var(--text3)', fontSize: 11 }}>불러오는 중...</span>}
          </div>
        </header>
        <div className="content events-layout">
          <div className="col-left">
            <Calendar promotions={promotions} onSelect={setSelectedPromo} selectedId={selectedPromo?.id} />
          </div>
          <div className="col-right">
            <PromoForm onSubmit={addPromotion} />
            <PromoList promotions={promotions} onSelect={setSelectedPromo} selectedId={selectedPromo?.id} />
          </div>
        </div>
      </div>
      <DetailPanel
        promotion={selectedPromo}
        onClose={() => setSelectedPromo(null)}
        onDelete={handleDelete}
      />
    </div>
  );
}
