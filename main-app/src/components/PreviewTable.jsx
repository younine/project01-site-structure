import './PreviewTable.css';

const COLS = [
  {l:'발주번호',i:19,c:'hl'},{l:'No.',i:0,c:'mono'},{l:'상품코드',i:1,c:'mono'},
  {l:'BARCODE',i:2,c:'mono'},{l:'상품명',i:3,c:''},{l:'매입유형',i:4,c:'mono'},
  {l:'물류센터',i:5,c:'mono'},{l:'발주수량',i:6,c:'num'},{l:'납품가능',i:7,c:'num'},
  {l:'매입가(단)',i:9,c:'num'},{l:'발주금액',i:12,c:'num'},{l:'S열입고금액',i:18,c:'num'},
  {l:'HS코드',i:22,c:'hs'},{l:'납품일자',i:29,c:'mono'},{l:'세금계산서',i:31,c:'mono'},{l:'납품처AG',i:32,c:''}
];

const fmt = (v, c) => {
  if (v == null || v === '') return '';
  if (c === 'num') return Number(String(v).replace(/,/g,'')).toLocaleString('ko-KR');
  return String(v);
};

const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

export default function PreviewTable({ rows, fmt: dlFmt, setFmt, onDownload, onReset, stats }) {
  const preview = rows.slice(0, 50);

  return (
    <div className="preview-section">
      <div className="section-label">STEP 2 — 변환 결과 미리보기 (상위 50행)</div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>{COLS.map(c => <th key={c.l}>{c.l}</th>)}</tr>
          </thead>
          <tbody>
            {preview.map((r, i) => (
              <tr key={i}>
                {COLS.map(c => (
                  <td key={c.l} className={c.c}>{fmt(r[c.i], c.c)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="btn-row">
        <div className="dl-wrap">
          <button className="btn btn-primary" onClick={onDownload}>
            ⬇ {dlFmt.toUpperCase()} 다운로드
          </button>
          <div className="fmt-toggle">
            <button className={`fmt-btn${dlFmt === 'xls' ? ' active' : ''}`} onClick={() => setFmt('xls')}>XLS</button>
            <button className={`fmt-btn${dlFmt === 'xlsx' ? ' active' : ''}`} onClick={() => setFmt('xlsx')}>XLSX</button>
          </div>
        </div>
        <button className="btn btn-ghost" onClick={onReset}>↺ 초기화</button>
        {stats && (
          <div className="total-info">
            전체 <strong>{stats.nProd.toLocaleString()}</strong>행 · 발주금액 합계 <strong>{Math.round(stats.tAmt/10000).toLocaleString()}만원</strong>
          </div>
        )}
      </div>
    </div>
  );
}
