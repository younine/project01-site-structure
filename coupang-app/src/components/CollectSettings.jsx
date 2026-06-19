import { useState, useRef, useEffect } from 'react';

export default function CollectSettings({ onStart, onStop, status, savedUrls = [], isEditor = false }) {
  const [url, setUrl]               = useState('');
  const [maxItems, setMaxItems]     = useState(200);
  const [maxPages, setMaxPages]     = useState(30);
  const [concurrent, setConcurrent] = useState(3);
  const [dropOpen, setDropOpen]     = useState(false);
  const [preview, setPreview]       = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const dropRef = useRef(null);

  const isRunning = status === 'running';

  const fetchPreview = async (targetUrl) => {
    const trimmed = (targetUrl || '').trim();
    if (!trimmed || !trimmed.includes('shop.coupang.com')) {
      setPreview(null);
      return;
    }
    setPreviewLoading(true);
    setPreview(null);
    try {
      const res  = await fetch(`/api/coupang/preview?url=${encodeURIComponent(trimmed)}`);
      const data = await res.json();
      if (data.ok) setPreview(data);
    } catch {}
    finally { setPreviewLoading(false); }
  };

  useEffect(() => {
    if (!dropOpen) return;
    const handler = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) {
        setDropOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [dropOpen]);

  return (
    <div style={s.card}>
      <div style={s.header}>
        <span style={s.title}>수집 설정</span>
      </div>
      <div style={s.body}>
        <div style={s.field}>
          <label style={s.label}>쿠팡 URL</label>
          <div style={s.urlWrap} ref={dropRef}>
            <input
              style={s.urlInput}
              value={url}
              onChange={e => { setUrl(e.target.value); setPreview(null); }}
              onBlur={e => fetchPreview(e.target.value)}
              placeholder="https://shop.coupang.com/..."
              disabled={isRunning}
            />
            <button
              style={{ ...s.dropBtn, ...(dropOpen ? s.dropBtnActive : {}) }}
              onClick={() => setDropOpen(o => !o)}
              disabled={isRunning}
              title="저장된 URL 목록"
            >
              ▼
            </button>
            {dropOpen && (
              <div style={s.dropdown}>
                {savedUrls.length === 0 ? (
                  <div style={s.dropEmpty}>저장된 URL이 없습니다</div>
                ) : (
                  savedUrls.map(u => (
                    <div
                      key={u.id}
                      style={s.dropItem}
                      onMouseDown={() => { setUrl(u.url); setDropOpen(false); fetchPreview(u.url); }}
                    >
                      <span style={s.dropAlias}>{u.alias}</span>
                      <span style={s.dropUrl}>{u.url}</span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {previewLoading && (
          <div style={s.previewBox}>조회 중…</div>
        )}
        {preview && !previewLoading && (
          <div style={s.previewBox}>
            예상 상품 수: <strong>{preview.totalCount.toLocaleString()}개</strong>
            {' / '}
            예상 페이지: <strong>{preview.estimatedPages}페이지</strong>
          </div>
        )}

        <div style={s.grid3}>
          <div style={s.field}>
            <label style={s.label}>최대 상품 수</label>
            <input
              style={s.input}
              type="number" min={1} max={500}
              value={maxItems}
              onChange={e => setMaxItems(Number(e.target.value))}
              disabled={isRunning}
            />
          </div>
          <div style={s.field}>
            <label style={s.label}>최대 페이지</label>
            <input
              style={s.input}
              type="number" min={1} max={50}
              value={maxPages}
              onChange={e => setMaxPages(Number(e.target.value))}
              disabled={isRunning}
            />
          </div>
          <div style={s.field}>
            <label style={s.label}>동시 요청 수</label>
            <input
              style={s.input}
              type="number" min={1} max={10}
              value={concurrent}
              onChange={e => setConcurrent(Number(e.target.value))}
              disabled={isRunning}
            />
          </div>
        </div>

        {isRunning ? (
          <button style={s.btnStop} onClick={onStop}>
            ⏹ 수집 중지
          </button>
        ) : (
          <button style={s.btnStart} onClick={() => onStart({ url, maxItems, maxPages, concurrent })}>
            ▶ 수집 시작
          </button>
        )}
      </div>
    </div>
  );
}

const s = {
  card: {
    background: '#fff',
    border: '1px solid rgba(0,0,0,0.08)',
    borderRadius: 12,
    overflow: 'hidden',
  },
  header: {
    padding: '14px 18px',
    borderBottom: '1px solid rgba(0,0,0,0.08)',
  },
  title: { fontSize: 13, fontWeight: 600, color: '#1a1d23' },
  body: { padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 12 },
  field: { display: 'flex', flexDirection: 'column', gap: 5 },
  label: {
    fontSize: 11, fontWeight: 600, color: '#9399a8',
    textTransform: 'uppercase', letterSpacing: '0.5px',
  },
  input: {
    padding: '8px 10px',
    borderRadius: 8,
    border: '1px solid rgba(0,0,0,0.14)',
    fontSize: 12,
    background: '#f8f9fa',
    color: '#1a1d23',
    outline: 'none',
    width: '100%',
  },
  urlWrap: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  urlInput: {
    flex: 1,
    padding: '8px 10px',
    borderRadius: '8px 0 0 8px',
    border: '1px solid rgba(0,0,0,0.14)',
    borderRight: 'none',
    fontSize: 12,
    background: '#f8f9fa',
    color: '#1a1d23',
    outline: 'none',
    minWidth: 0,
  },
  dropBtn: {
    padding: '8px 10px',
    borderRadius: '0 8px 8px 0',
    border: '1px solid rgba(0,0,0,0.14)',
    background: '#f0f1f3',
    color: '#5a6072',
    fontSize: 10,
    cursor: 'pointer',
    flexShrink: 0,
    lineHeight: 1,
  },
  dropBtnActive: {
    background: '#e5e7eb',
    color: '#1a1d23',
  },
  dropdown: {
    position: 'absolute',
    top: 'calc(100% + 4px)',
    left: 0,
    right: 0,
    background: '#fff',
    border: '1px solid rgba(0,0,0,0.12)',
    borderRadius: 8,
    boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
    zIndex: 100,
    overflow: 'hidden',
  },
  dropEmpty: {
    padding: '14px 12px',
    fontSize: 12,
    color: '#9399a8',
    textAlign: 'center',
  },
  dropItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    padding: '10px 12px',
    cursor: 'pointer',
    borderBottom: '1px solid rgba(0,0,0,0.06)',
    transition: 'background 0.1s',
  },
  dropAlias: {
    fontSize: 12,
    fontWeight: 600,
    color: '#1a1d23',
  },
  dropUrl: {
    fontSize: 11,
    color: '#9399a8',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  grid3: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    gap: 8,
  },
  btnStart: {
    width: '100%',
    padding: '10px 0',
    borderRadius: 8,
    border: 'none',
    background: '#2563eb',
    color: '#fff',
    fontWeight: 700,
    fontSize: 13,
    cursor: 'pointer',
    marginTop: 4,
  },
  previewBox: {
    fontSize: 11,
    color: '#5a6072',
    background: '#f0f4ff',
    border: '1px solid rgba(37,99,235,0.15)',
    borderRadius: 6,
    padding: '6px 10px',
  },
  btnStop: {
    width: '100%',
    padding: '10px 0',
    borderRadius: 8,
    border: 'none',
    background: '#dc2626',
    color: '#fff',
    fontWeight: 700,
    fontSize: 13,
    cursor: 'pointer',
    marginTop: 4,
  },
};
