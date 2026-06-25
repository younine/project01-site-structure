import { useRef } from 'react';
import useCompuzone from '../hooks/useCompuzone';

const fmt = n => n ? Number(n).toLocaleString('ko-KR') : '0';

const PREVIEW_COLS = [
  { l: '메인주문번호', i: 0 },
  { l: '구매자명', i: 1 },
  { l: '상품명', i: 2 },
  { l: '수량', i: 3, num: true },
  { l: '판매금액', i: 4, num: true },
  { l: '수령인', i: 5 },
  { l: '주소', i: 6 },
];
const PREVIEW_MAX = 20;

export default function CompuzoneTab() {
  const { file, setFile, rows, logs, converting, stats, runConvert, doDownload, reset } = useCompuzone();
  const fileRef = useRef();

  const handleFile = (f) => {
    if (!f) return;
    if (!f.name.match(/\.xlsx?$/i)) { alert('.xlsx 또는 .xls 파일만 가능합니다'); return; }
    setFile(f);
  };

  return (
    <div className="tab-content">
      <div className="section">
        <div className="section-title">파일 업로드</div>
        <div
          className={`drop-zone${file ? ' loaded' : ''}`}
          onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('dragover'); }}
          onDragLeave={e => e.currentTarget.classList.remove('dragover')}
          onDrop={e => { e.preventDefault(); e.currentTarget.classList.remove('dragover'); handleFile(e.dataTransfer.files[0]); }}
          onClick={() => fileRef.current.click()}
        >
          <input
            ref={fileRef} type="file" accept=".xlsx,.xls"
            onChange={e => handleFile(e.target.files[0])}
            style={{ display: 'none' }}
          />
          <div className="drop-icon">📊</div>
          <div className="drop-title">컴퓨존 주문서 엑셀 업로드</div>
          <div className="drop-sub">.xlsx 또는 .xls · 드래그하거나 클릭하여 업로드</div>
          {file && <div className="drop-status">✓ {file.name} ({(file.size / 1024).toFixed(0)}KB)</div>}
        </div>
        <div className="action-row">
          <button className="btn btn-primary" onClick={runConvert} disabled={!file || converting}>
            {converting ? '변환 중...' : '▶ 변환 실행'}
          </button>
          <button className="btn btn-secondary" onClick={reset}>↺ 초기화</button>
        </div>
      </div>

      {logs.length > 0 && (
        <div className="section">
          <div className="section-title">처리 로그</div>
          {stats && (
            <div className="stats-row">
              <div className="stat-card">
                <div className="stat-val">{fmt(stats.nProd)}</div>
                <div className="stat-label">변환 상품</div>
              </div>
              <div className="stat-card">
                <div className="stat-val">{fmt(stats.tQty)}</div>
                <div className="stat-label">총 수량</div>
              </div>
              <div className="stat-card">
                <div className="stat-val">{Math.round(stats.tAmt / 10000).toLocaleString()}</div>
                <div className="stat-label">총 금액(만원)</div>
              </div>
            </div>
          )}
          <div className="log-area">
            {logs.map((l, i) => (
              <div key={i} className={`log-line log-${l.type}`}>
                <span className="log-time">{l.t}</span>
                <span className="log-msg">{l.msg}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {rows.length > 0 && (
        <div className="section">
          <div className="section-title">변환 결과 미리보기</div>
          <div className="preview-scroll">
            <table className="preview-table">
              <thead>
                <tr>{PREVIEW_COLS.map(c => <th key={c.l}>{c.l}</th>)}</tr>
              </thead>
              <tbody>
                {rows.slice(0, PREVIEW_MAX).map((r, i) => (
                  <tr key={i}>
                    {PREVIEW_COLS.map(c => (
                      <td key={c.l} className={c.num ? 'num-cell' : ''}>{c.num ? fmt(r[c.i]) : r[c.i]}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {rows.length > PREVIEW_MAX && (
            <div className="preview-more">외 {rows.length - PREVIEW_MAX}건 더 있음</div>
          )}
          <div className="download-row">
            <button className="btn btn-download" onClick={doDownload}>↓ 다운로드</button>
            <button className="btn btn-secondary" onClick={reset}>↺ 초기화</button>
            <span className="total-info">전체 <strong>{fmt(rows.length)}</strong>행</span>
          </div>
        </div>
      )}
    </div>
  );
}
