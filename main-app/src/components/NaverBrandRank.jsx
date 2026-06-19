import { useState, useEffect, useCallback } from 'react';

const STATUS = {
  STABLE: { icon: '→', cls: '' },
  UP:     { icon: '↑', cls: 'rank-up' },
  DOWN:   { icon: '↓', cls: 'rank-down' },
  NEW:    { icon: 'N', cls: 'rank-new' },
};

function fmtDate(syncDate) {
  if (!syncDate || syncDate.length !== 8) return null;
  return `${syncDate.slice(0, 4)}.${syncDate.slice(4, 6)}.${syncDate.slice(6, 8)} 기준`;
}

export default function NaverBrandRank() {
  const [ranks, setRanks] = useState([]);
  const [syncDate, setSyncDate] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (force = false) => {
    setLoading(true);
    try {
      const res = await fetch(force ? '/api/nrank/best?force=1' : '/api/nrank/best');
      if (res.ok) {
        const data = await res.json();
        setRanks(data.ranks || []);
        setSyncDate(data.syncDate || null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const visible = expanded ? ranks : ranks.slice(0, 10);

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <div className="card-title">🏆 네이버 브랜드 순위</div>
          <div className="card-sub">모니터 카테고리 · 주간</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {syncDate && <span className="card-sub">{fmtDate(syncDate)}</span>}
          <button
            className="rank-refresh-btn"
            onClick={() => load(true)}
            disabled={loading}
            title="새로고침"
          >
            {loading ? '...' : '↺'}
          </button>
        </div>
      </div>
      <div className="brand-rank-body">
        {ranks.length === 0 ? (
          <div className="empty">{loading ? '불러오는 중...' : '데이터 없음'}</div>
        ) : (
          <>
            <ol className="brand-rank-list">
              {visible.map(item => {
                const s = STATUS[item.status] || STATUS.STABLE;
                return (
                  <li key={item.rank} className="brand-rank-item">
                    <span className="brand-rank-no">{item.rank}</span>
                    {item.brandUrl
                      ? <a href={item.brandUrl} target="_blank" rel="noreferrer" className="brand-rank-name">{item.title}</a>
                      : <span className="brand-rank-name">{item.title}</span>}
                    <span className={`brand-rank-status ${s.cls}`}>{s.icon}</span>
                  </li>
                );
              })}
            </ol>
            {ranks.length > 10 && (
              <button className="brand-rank-more" onClick={() => setExpanded(v => !v)}>
                {expanded ? '접기 ↑' : '더보기 ↓'}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
