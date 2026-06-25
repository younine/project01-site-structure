import { useState, useCallback } from 'react';
import SpreadsheetGrid from './SpreadsheetGrid';
import { buildModelIndex, matchProduct } from '../utils/productMatcher';
import { authFetch } from './authFetch';

const ORDER_COLS = ['상품명', '주문번호', '고객명', '연락처', '주소', '수량', '우편번호'];
const RESULT_HEADERS = ['주문번호', '구매자명', '상품명', '수량', '판매금액', '수령인명', '주소', '연락처', '우편번호', '배송시구분', 'HS코드'];
const NUM_COLS = [3, 4];
const PREVIEW_MAX = 20;
const PREVIEW_COLS = [
  { l: '주문번호', i: 0 },
  { l: '구매자명', i: 1 },
  { l: '상품명', i: 2 },
  { l: '수량', i: 3, num: true },
  { l: '판매금액', i: 4, num: true },
  { l: '수령인', i: 5 },
  { l: '주소', i: 6 },
  { l: '우편번호', i: 8 },
];

function extractZip(address) {
  if (!address) return '';
  const m = address.match(/\[(\d{5,6})\]/);
  if (m) return m[1];
  const m2 = address.match(/^(\d{5,6})\s/);
  if (m2) return m2[1];
  return '';
}

function cleanAddress(address) {
  return (address || '').replace(/\[\d{5,6}\]\s*/, '').trim();
}


function isPlaceholderRow(row) {
  return row.some(cell => {
    const c = (cell || '').trim();
    return (c.includes('택배사') && c.includes('입력')) ||
           (c.includes('송장번호') && c.includes('입력'));
  });
}

export default function OrderConverter() {
  const [inputRows, setInputRows] = useState([ORDER_COLS.map(() => '')]);
  const [assacomRows, setAssacomRows] = useState([]);
  const [miracleRows, setMiracleRows] = useState([]);
  const [converting, setConverting] = useState(false);
  const [downloading, setDownloading] = useState('');
  const [error, setError] = useState('');
  const [converted, setConverted] = useState(false);
  const [unmatchedNames, setUnmatchedNames] = useState(new Set());

  // 붙여넣기 시 플레이스홀더 행 즉시 제거
  const handleInputChange = useCallback((newRows) => {
    const filtered = newRows.filter(row => !isPlaceholderRow(row));
    setInputRows(filtered.length ? filtered : [ORDER_COLS.map(() => '')]);
  }, []);

  const runConvert = useCallback(async () => {
    setConverting(true);
    setError('');
    setConverted(false);
    setUnmatchedNames(new Set());
    try {
      const productsRes = await authFetch('/api/products');
      if (!productsRes.ok) throw new Error('제품 데이터 로드 실패 (로그인 필요)');
      const productsData = await productsRes.json();
      const items = productsData.products || [];

      const dataRows = inputRows.filter(r => r.some(c => c.trim()));
      if (!dataRows.length) throw new Error('입력 데이터가 없습니다');

      const modelIndex = buildModelIndex(items);
      const unmatchedSet = new Set();
      const assacom = [];
      const miracle = [];

      for (const row of dataRows) {
        const [productName, orderNo, customerName, phone, address, qty, zipFromCol] = row;
        if (!orderNo?.trim()) continue;

        const isMiracle = orderNo.trim().toUpperCase().startsWith('MC');
        const buyerName = isMiracle ? '(주)디지털미라클' : '아싸컴';

        const { item: product, matched } = matchProduct(productName, modelIndex);
        if (!matched) unmatchedSet.add((productName || '').trim());
        const unitPrice = isMiracle
          ? Number(product?.miraclePrice || 0)
          : Number(product?.assacomPrice || 0);
        const qty_n = Number(qty) || 1;
        const salesAmt = unitPrice * qty_n;

        const zipFromAddr = extractZip(address);
        const zip = zipFromAddr || (zipFromCol || '').trim();
        const cleanAddr = zipFromAddr ? cleanAddress(address) : (address || '').trim();

        const resultRow = [
          orderNo, buyerName, productName,
          qty_n, salesAmt,
          customerName, cleanAddr, phone, zip,
          '선불', product?.hsCode || '',
        ];

        if (isMiracle) miracle.push(resultRow);
        else assacom.push(resultRow);
      }

      // 변환 시점에 합산: 주문번호 + 상품명 + 수령인 기준
      const mergedMap = new Map();
      for (const row of assacom) {
        const key = `${row[0]}||${row[2]}||${row[5]}`;
        if (mergedMap.has(key)) {
          const existing = mergedMap.get(key);
          existing[3] = Number(existing[3]) + Number(row[3]);
          existing[4] = Number(existing[4]) + Number(row[4]);
        } else {
          mergedMap.set(key, [...row]);
        }
      }

      setAssacomRows([...mergedMap.values()]);
      setMiracleRows(miracle);
      setUnmatchedNames(unmatchedSet);
      setConverted(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setConverting(false);
    }
  }, [inputRows]);

  const handleDownload = useCallback(async (type) => {
    const rows = type === 'assacom' ? assacomRows : miracleRows;
    const filename = type === 'assacom' ? '아싸컴_발주서.xls' : '미라클_발주서.xls';
    if (!rows.length) { alert('다운로드할 데이터가 없습니다'); return; }

    setDownloading(type);
    try {
      const res = await authFetch('/api/order/assacom/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          headers: RESULT_HEADERS,
          rows: rows.map(r => r.map(String)),
          numCols: NUM_COLS,
          filename,
        }),
      });
      if (!res.ok) throw new Error('다운로드 실패');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = filename;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert(e.message);
    } finally {
      setDownloading('');
    }
  }, [assacomRows, miracleRows]);

  return (
    <div className="tab-content">
      <div className="section">
        <div className="section-title">주문 데이터 입력</div>
        <SpreadsheetGrid columns={ORDER_COLS} rows={inputRows} onChange={handleInputChange} />
        <div className="action-row">
          <button className="btn btn-primary" onClick={runConvert} disabled={converting}>
            {converting ? '변환 중...' : '▶ 변환 실행'}
          </button>
          {error && <span className="msg msg-error">{error}</span>}
          {converted && !error && (
            <span className="msg msg-success">
              변환 완료 — 아싸컴 {assacomRows.length}건 / 미라클 {miracleRows.length}건
              {unmatchedNames.size > 0 && (
                <span className="msg-warn"> · 미매칭 {unmatchedNames.size}건 확인 필요</span>
              )}
            </span>
          )}
        </div>
      </div>

      {converted && assacomRows.length > 0 && (
        <div className="section">
          <div className="section-title">아싸컴 미리보기 ({assacomRows.length}건)</div>
          <div className="preview-scroll">
            <table className="preview-table">
              <thead>
                <tr>{PREVIEW_COLS.map(c => <th key={c.l}>{c.l}</th>)}</tr>
              </thead>
              <tbody>
                {assacomRows.slice(0, PREVIEW_MAX).map((row, ri) => {
                  const unmatched = unmatchedNames.has((row[2] || '').trim());
                  return (
                    <tr key={ri} className={unmatched ? 'row-unmatched' : ''}>
                      {PREVIEW_COLS.map(c => (
                        <td key={c.l} className={c.num ? 'num-cell' : ''}>
                          {c.num ? Number(row[c.i]).toLocaleString('ko-KR') : row[c.i]}
                          {c.i === 2 && unmatched && <span className="badge-unmatched">미매칭</span>}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {assacomRows.length > PREVIEW_MAX && (
            <div className="preview-more">외 {assacomRows.length - PREVIEW_MAX}건 더 있음</div>
          )}
          <div className="download-row">
            <button className="btn btn-download" onClick={() => handleDownload('assacom')} disabled={!!downloading}>
              {downloading === 'assacom' ? '생성 중...' : `↓ 아싸컴 다운로드 (${assacomRows.length}건)`}
            </button>
          </div>
        </div>
      )}

      {converted && miracleRows.length > 0 && (
        <div className="section">
          <div className="section-title">미라클 미리보기 ({miracleRows.length}건)</div>
          <div className="preview-scroll">
            <table className="preview-table">
              <thead>
                <tr>{PREVIEW_COLS.map(c => <th key={c.l}>{c.l}</th>)}</tr>
              </thead>
              <tbody>
                {miracleRows.slice(0, PREVIEW_MAX).map((row, ri) => {
                  const unmatched = unmatchedNames.has((row[2] || '').trim());
                  return (
                    <tr key={ri} className={unmatched ? 'row-unmatched' : ''}>
                      {PREVIEW_COLS.map(c => (
                        <td key={c.l} className={c.num ? 'num-cell' : ''}>
                          {c.num ? Number(row[c.i]).toLocaleString('ko-KR') : row[c.i]}
                          {c.i === 2 && unmatched && <span className="badge-unmatched">미매칭</span>}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {miracleRows.length > PREVIEW_MAX && (
            <div className="preview-more">외 {miracleRows.length - PREVIEW_MAX}건 더 있음</div>
          )}
          <div className="download-row">
            <button className="btn btn-download-miracle" onClick={() => handleDownload('miracle')} disabled={!!downloading}>
              {downloading === 'miracle' ? '생성 중...' : `↓ 미라클 다운로드 (${miracleRows.length}건)`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
