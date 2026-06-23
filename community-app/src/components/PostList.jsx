import { useState, useEffect, useCallback } from 'react';

const TOKEN_KEY = 'auth_token';

function authFetch(url, opts = {}) {
  const token = localStorage.getItem(TOKEN_KEY);
  return fetch(url, {
    ...opts,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });
}

function formatDate(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return iso; }
}

// 다중선택 사이트용
function MultiFilterChips({ label, options, values, onChange }) {
  return (
    <div className="filter-chip-row">
      <span className="filter-chip-label">{label}</span>
      <div className="filter-chip-group">
        {options.map(opt => {
          const active = values.includes(opt.value);
          return (
            <button
              key={opt.value}
              className={`filter-chip${active ? ' active' : ''}`}
              onClick={() => onChange(
                active ? values.filter(v => v !== opt.value) : [...values, opt.value]
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// 단일선택 게시판용 (전체 없음, 재클릭하면 해제)
function SingleFilterChips({ label, options, value, onChange }) {
  return (
    <div className="filter-chip-row">
      <span className="filter-chip-label">{label}</span>
      <div className="filter-chip-group">
        {options.map(opt => (
          <button
            key={opt.value}
            className={`filter-chip${value === opt.value ? ' active' : ''}`}
            onClick={() => onChange(opt.value === value ? '' : opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function PostList() {
  const [posts, setPosts]           = useState([]);
  const [sources, setSources]       = useState({});
  const [total, setTotal]           = useState(0);
  const [page, setPage]             = useState(1);
  const [filters, setFilters]       = useState({ siteIds: [], boardId: '' });
  const [collecting, setCollecting] = useState(false);
  const [loading, setLoading]       = useState(true);

  const LIMIT = 50;

  const fetchSources = useCallback(() =>
    authFetch('/api/community/sources').then(r => r.json()).then(setSources).catch(() => {}), []);

  const fetchPosts = useCallback((pg = 1, f = filters) => {
    setLoading(true);
    const params = new URLSearchParams({ page: pg, limit: LIMIT });
    if (f.siteIds.length > 0) params.set('siteId', f.siteIds.join(','));
    if (f.boardId) params.set('boardId', f.boardId);
    authFetch(`/api/community/posts?${params}`)
      .then(r => r.json())
      .then(data => { setPosts(data.posts || []); setTotal(data.total || 0); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [filters]);

  useEffect(() => { fetchSources(); fetchPosts(1, filters); }, []);

  function applyFilter(next) {
    const merged = { ...filters, ...next };
    setFilters(merged);
    setPage(1);
    fetchPosts(1, merged);
  }

  function changePage(pg) { setPage(pg); fetchPosts(pg); }

  async function triggerCollect() {
    setCollecting(true);
    try {
      const res = await authFetch('/api/community/collect', { method: 'POST' });
      const data = await res.json();
      if (data.ok) { fetchPosts(1, filters); fetchSources(); }
    } catch {}
    setCollecting(false);
  }

  const siteOptions = Object.entries(sources).map(([id, s]) => ({ value: id, label: s.name }));

  // 사이트 1개만 선택됐을 때만 게시판 표시
  const selectedOneSite = filters.siteIds.length === 1 ? filters.siteIds[0] : null;
  const boardOptions = selectedOneSite && sources[selectedOneSite]
    ? sources[selectedOneSite].boards.map(b => ({ value: b.boardId, label: b.boardName }))
    : [];

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div>
      {/* 필터 */}
      <div className="filter-panel">
        <MultiFilterChips
          label="사이트"
          options={siteOptions}
          values={filters.siteIds}
          onChange={v => applyFilter({ siteIds: v, boardId: '' })}
        />
        {selectedOneSite && boardOptions.length > 0 && (
          <SingleFilterChips
            label="게시판"
            options={boardOptions}
            value={filters.boardId}
            onChange={v => applyFilter({ boardId: v })}
          />
        )}
        <div className="filter-panel-footer">
          <span className="filter-count">총 {total.toLocaleString()}건</span>
        </div>
      </div>

      {/* 게시글 목록 */}
      {loading ? (
        <div className="empty-state"><div style={{ fontSize: 20 }}>⏳</div><p>불러오는 중...</p></div>
      ) : posts.length === 0 ? (
        <div className="empty-state">
          <div style={{ fontSize: 24 }}>📭</div>
          <p>수집된 게시글이 없습니다.</p>
          <p style={{ marginTop: 8 }}>
            <button className="btn btn-primary btn-sm" onClick={triggerCollect} disabled={collecting}>
              {collecting ? '수집 중...' : '지금 수집하기'}
            </button>
          </p>
        </div>
      ) : (
        <div className="post-list">
          {posts.map(p => (
            <div key={p.id} className="post-card">
              <div className="post-meta-left">
                <span className="badge badge-site">{p.siteName}</span>
                <span className="badge badge-board">{p.boardName}</span>
              </div>
              <div className="post-body">
                <a className="post-title" href={p.url} target="_blank" rel="noopener noreferrer">
                  {p.title}
                </a>
                <div className="post-date">{formatDate(p.publishedAt || p.collectedAt)}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="pagination">
          <button className="page-btn" onClick={() => changePage(page - 1)} disabled={page === 1}>‹</button>
          {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
            const pg = totalPages <= 7 ? i + 1 : (page <= 4 ? i + 1 : page - 3 + i);
            if (pg < 1 || pg > totalPages) return null;
            return <button key={pg} className={`page-btn${pg === page ? ' active' : ''}`} onClick={() => changePage(pg)}>{pg}</button>;
          })}
          <button className="page-btn" onClick={() => changePage(page + 1)} disabled={page === totalPages}>›</button>
        </div>
      )}
    </div>
  );
}
