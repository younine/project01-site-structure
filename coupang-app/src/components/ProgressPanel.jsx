import { useEffect, useRef } from 'react';

const LOG_DOT = { success: '#16a34a', info: '#2563eb', warning: '#d97706' };

export default function ProgressPanel({ status, progress, logs }) {
  const { current, total, collected, soldout, errors } = progress;
  const pct = total > 0 ? Math.min(Math.round((current / total) * 100), 100) : 0;
  const logRef = useRef(null);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logs]);

  const barColor = status === 'done' ? '#16a34a' : status === 'error' ? '#dc2626' : '#2563eb';

  return (
    <div style={s.card}>
      <div style={s.header}>
        <span style={s.title}>진행 상황</span>
        <StatusBadge status={status} />
      </div>
      <div style={s.body}>
        <div style={s.barRow}>
          <div style={s.barBg}>
            <div style={{ ...s.barFill, width: `${pct}%`, background: barColor }} />
          </div>
          <span style={s.pct}>{pct}%</span>
        </div>

        <div style={s.statGrid}>
          <StatCard label="수집완료" value={collected} color="#16a34a" bg="#dcfce7" />
          <StatCard label="품절"     value={soldout}   color="#d97706" bg="#fef3c7" />
          <StatCard label="오류"     value={errors}    color="#dc2626" bg="#fee2e2" />
        </div>

        <div style={s.logHeader}>실시간 로그</div>
        <div style={s.logBox} ref={logRef}>
          {logs.length === 0
            ? <span style={s.logEmpty}>대기 중...</span>
            : logs.map((l, i) => (
              <div key={i} style={s.logRow}>
                <span style={{ ...s.dot, background: LOG_DOT[l.type] ?? '#888' }} />
                <span style={s.logTime}>{l.time}</span>
                <span style={s.logMsg}>{l.message}</span>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, color, bg }) {
  return (
    <div style={{ ...sc.card, background: bg }}>
      <div style={{ ...sc.val, color }}>{value}</div>
      <div style={sc.lbl}>{label}</div>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    idle:    { text: '대기 중', color: '#9399a8', bg: '#f4f5f7' },
    running: { text: '수집 중', color: '#2563eb', bg: 'rgba(37,99,235,0.1)' },
    done:    { text: '완료',   color: '#16a34a', bg: 'rgba(22,163,74,0.1)' },
    error:   { text: '오류',   color: '#dc2626', bg: 'rgba(220,38,38,0.1)' },
  };
  const { text, color, bg } = map[status] ?? map.idle;
  return <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 99, color, background: bg }}>{text}</span>;
}

const s = {
  card: { background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 12, overflow: 'hidden' },
  header: { padding: '14px 18px', borderBottom: '1px solid rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  title:  { fontSize: 13, fontWeight: 600, color: '#1a1d23' },
  body:   { padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 12 },
  barRow: { display: 'flex', alignItems: 'center', gap: 8 },
  barBg:  { flex: 1, height: 7, background: '#f0f0f0', borderRadius: 99, overflow: 'hidden' },
  barFill:{ height: '100%', borderRadius: 99, transition: 'width 0.3s ease, background 0.3s' },
  pct:    { fontSize: 12, fontWeight: 700, color: '#1a1d23', minWidth: 32, textAlign: 'right' },
  statGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 },
  logHeader: { fontSize: 11, fontWeight: 600, color: '#9399a8', textTransform: 'uppercase', letterSpacing: '0.5px' },
  logBox: {
    height: 180,
    overflowY: 'auto',
    background: '#0f1117',
    borderRadius: 8,
    padding: '10px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  logRow:  { display: 'flex', alignItems: 'flex-start', gap: 6, lineHeight: 1.4 },
  dot:     { width: 7, height: 7, borderRadius: '50%', flexShrink: 0, marginTop: 3 },
  logTime: { fontSize: 10, color: '#4b5563', fontFamily: 'monospace', flexShrink: 0 },
  logMsg:  { fontSize: 11, color: '#d1d5db', fontFamily: 'monospace', wordBreak: 'break-all' },
  logEmpty:{ fontSize: 11, color: '#4b5563', fontFamily: 'monospace' },
};

const sc = {
  card: { borderRadius: 8, padding: '10px 12px', textAlign: 'center' },
  val:  { fontSize: 20, fontWeight: 700, lineHeight: 1 },
  lbl:  { fontSize: 11, color: '#5a6072', marginTop: 4 },
};
