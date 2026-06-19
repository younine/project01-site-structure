import { useEffect, useRef } from 'react';
import './LogPanel.css';

export default function LogPanel({ logs, progress, progressText, stats, warnings }) {
  const logRef = useRef();
  useEffect(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, [logs]);

  const fmt = n => n ? Number(n).toLocaleString('ko-KR') : '0';

  return (
    <div className="log-panel">
      {stats && (
        <div className="stats-row">
          <div className="stat-card"><div className="stat-val">{stats.nPO}</div><div className="stat-label">발주서 수</div></div>
          <div className="stat-card"><div className="stat-val">{fmt(stats.nProd)}</div><div className="stat-label">변환 상품</div></div>
          <div className="stat-card"><div className="stat-val">{fmt(stats.tQty)}</div><div className="stat-label">총 발주수량</div></div>
          <div className="stat-card"><div className="stat-val">{Math.round(stats.tAmt/10000).toLocaleString()}</div><div className="stat-label">발주금액(만원)</div></div>
        </div>
      )}

      {warnings.length > 0 && (
        <div className="warn-box">
          ⚠️ <strong>주의</strong><br />
          {warnings.map((w, i) => <div key={i}>• {w}</div>)}
        </div>
      )}

      <div className="section-label orange">처리 로그</div>
      <div className="progress-wrap">
        <div className="progress-bar"><div className="progress-fill" style={{ width: `${progress}%` }}></div></div>
        <div className="progress-info"><span>{progressText}</span><span>{progress}%</span></div>
      </div>
      <div className="log-area" ref={logRef}>
        {logs.map((l, i) => (
          <div key={i} className={`log-line log-${l.type}`}>
            <span className="log-time">{l.t}</span>
            <span className="log-msg">{l.msg}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
