import { useState, useEffect } from 'react';
import { authFetch } from './authFetch';

const PAGE_SIZE = 7;

function formatPrice(p) {
  const n = parseInt(p, 10);
  if (!n) return '';
  return n.toLocaleString('ko-KR') + '원';
}

function formatInch(inch) {
  const m = inch.match(/\(([\d.]+)인치\)/);
  return m ? m[1] + '"' : inch;
}

export default function CandidateList({ onSelect }) {
  const [items, setItems]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [showAll, setShowAll]     = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [selected, setSelected]   = useState(new Set());

  useEffect(() => {
    authFetch('/api/coupang/register/candidates')
      .then(r => r.ok ? r.json() : r.json().then(d => Promise.reject(d.error || '조회 실패')))
      .then(data => { setItems(data); setLoading(false); })
      .catch(e => { setError(String(e)); setLoading(false); });
  }, []);

  const visible = showAll ? items : items.slice(0, PAGE_SIZE);

  function toggleItem(code) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(code) ? next.delete(code) : next.add(code);
      return next;
    });
  }

  function toggleAll() {
    const visibleCodes = visible.map(i => i.product_code);
    const allChecked = visibleCodes.every(c => selected.has(c));
    setSelected(prev => {
      const next = new Set(prev);
      visibleCodes.forEach(c => allChecked ? next.delete(c) : next.add(c));
      return next;
    });
  }

  function handleSearch() {
    if (!selected.size) return;
    const codes = Array.from(selected).join('\n');
    setSelected(new Set());
    onSelect(codes);
  }

  const visibleCodes = visible.map(i => i.product_code);
  const allVisibleChecked = visibleCodes.length > 0 && visibleCodes.every(c => selected.has(c));

  if (loading) return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div className="card-title">등록 대상 추천</div>
      <div style={{ color: 'var(--text3)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, padding: '0 16px 12px' }}>
        <span className="spinner spinner-dark" />불러오는 중...
      </div>
    </div>
  );

  if (error) return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div className="card-title">등록 대상 추천</div>
      <div className="msg-error">{error}</div>
    </div>
  );

  if (items.length === 0) return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div className="card-title">등록 대상 추천</div>
      <div style={{ color: 'var(--text3)', fontSize: 12, padding: '0 16px 12px' }}>미등록 상품이 없습니다.</div>
    </div>
  );

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      {/* 헤더 */}
      <div className="card-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span>
          등록 대상 추천
          <span style={{ marginLeft: 7, fontWeight: 400, color: 'var(--accent)', fontSize: 12 }}>
            {items.length}개
          </span>
        </span>
        <button
          className="btn btn-secondary"
          style={{ height: 26, padding: '0 10px', fontSize: 11 }}
          onClick={() => setCollapsed(v => !v)}
        >
          {collapsed ? '펼치기' : '접기'}
        </button>
      </div>

      {!collapsed && (
        <>
          {/* 전체선택 + 조회 버튼 행 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, padding: '0 16px' }}>
            <label className="candidate-check-label" onClick={e => { e.preventDefault(); toggleAll(); }}>
              <input
                type="checkbox"
                className="candidate-checkbox"
                checked={allVisibleChecked}
                onChange={toggleAll}
                onClick={e => e.stopPropagation()}
              />
              <span style={{ fontSize: 12, color: 'var(--text2)' }}>
                {allVisibleChecked ? '선택 해제' : '전체 선택'}
              </span>
            </label>
            {selected.size > 0 && (
              <button className="btn btn-primary" style={{ height: 28, padding: '0 14px', fontSize: 12 }} onClick={handleSearch}>
                {selected.size}개 조회
              </button>
            )}
            {selected.size > 0 && (
              <button className="btn btn-secondary" style={{ height: 28, padding: '0 10px', fontSize: 12 }} onClick={() => setSelected(new Set())}>
                선택 취소
              </button>
            )}
          </div>

          {/* 목록 */}
          <div className="candidate-list">
            {visible.map(item => {
              const isSelected = selected.has(item.product_code);
              return (
                <div
                  key={item.product_code}
                  className={`candidate-item${isSelected ? ' selected' : ''}`}
                  onClick={() => toggleItem(item.product_code)}
                  title="클릭하여 선택 / 해제"
                >
                  <input
                    type="checkbox"
                    className="candidate-checkbox"
                    checked={isSelected}
                    onChange={() => toggleItem(item.product_code)}
                    onClick={e => e.stopPropagation()}
                    style={{ flexShrink: 0, marginTop: 2 }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="candidate-name">{item.product_name}</div>
                    <div className="candidate-meta">
                      {item.registration_month && <span>{item.registration_month}</span>}
                      {item.inch && <span>{formatInch(item.inch)}</span>}
                      {item.resolution && <span>{item.resolution}</span>}
                      {item.price && <span style={{ color: 'var(--accent)' }}>{formatPrice(item.price)}</span>}
                      <span style={{ color: 'var(--text3)', fontFamily: 'monospace', fontSize: 11 }}>{item.product_code}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {items.length > PAGE_SIZE && (
            <button
              className="btn btn-secondary"
              style={{ marginTop: 8, marginBottom: 12, marginLeft: 16, marginRight: 16, width: 'calc(100% - 32px)', fontSize: 12, height: 30 }}
              onClick={() => setShowAll(v => !v)}
            >
              {showAll ? '▲ 접기' : `▼ 더보기 (${items.length - PAGE_SIZE}개 더)`}
            </button>
          )}
        </>
      )}
    </div>
  );
}
