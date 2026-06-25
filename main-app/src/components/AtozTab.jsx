import { useState, useCallback } from 'react';
import SpreadsheetGrid from './SpreadsheetGrid';
import { makeOrderNo, getDateStr } from '../utils/orderNumber';
import { buildModelIndex, matchProduct } from '../utils/productMatcher';
import { authFetch } from './authFetch';

const VENDOR_CODE = 'ATZ';
const VENDOR_NAME = '아토즈';

const VENDOR_COLS = ['상품명', '수량'];
const DIRECT_COLS = ['제품명', '수량', '수취인명', '수취인연락처', '통합배송지', '우편번호'];

// A:주문자 B:HS코드 C:공급가 D:상품명 E:수량 F:수취인명 G:수취인연락처 H:통합배송지 I:우편번호 J:배송방법 K:주문번호
const RESULT_HEADERS = ['주문자', 'HS코드', '공급가', '상품명', '수량', '수취인명', '수취인연락처', '통합배송지', '우편번호', '배송방법', '주문번호'];
const NUM_COLS = [2, 4];
const PREVIEW_MAX = 20;
const PREVIEW_COLS = [
  { l: '주문자', i: 0 },
  { l: 'HS코드', i: 1 },
  { l: '판매금액', i: 2, num: true },
  { l: '상품명', i: 3 },
  { l: '수량', i: 4, num: true },
  { l: '수취인명', i: 5 },
  { l: '수취인연락처', i: 6 },
  { l: '통합배송지', i: 7 },
  { l: '우편번호', i: 8 },
  { l: '배송방법', i: 9 },
  { l: '주문번호', i: 10 },
];


function extractZip(address) {
  if (!address) return '';
  const m = address.match(/\[(\d{5,6})\]/);
  if (m) return m[1];
  const m2 = address.match(/^(\d{5,6})\s/);
  if (m2) return m2[1];
  return '';
}

function parseQty(q) {
  const m = String(q || '').match(/\d+/);
  return m ? Number(m[0]) || 1 : 1;
}

function cleanAddress(addr) {
  return (addr || '').replace(/\[\d{5,6}\]\s*/, '').trim();
}

export default function AtozTab() {
  const [mode, setMode] = useState('vendor');
  const [vendorRows, setVendorRows] = useState([VENDOR_COLS.map(() => '')]);
  const [directRows, setDirectRows] = useState([DIRECT_COLS.map(() => '')]);
  const [resultRows, setResultRows] = useState([]);
  const [converting, setConverting] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');
  const [converted, setConverted] = useState(false);
  const [unmatchedNames, setUnmatchedNames] = useState(new Set());
  const switchMode = (m) => {
    setMode(m);
    setConverted(false);
    setResultRows([]);
    setError('');
    setUnmatchedNames(new Set());
  };

  const runConvert = useCallback(async () => {
    setConverting(true);
    setError('');
    setConverted(false);
    setResultRows([]);
    setUnmatchedNames(new Set());

    try {
      const [settingsRes, productsRes] = await Promise.all([
        authFetch('/api/b2b/settings'),
        authFetch('/api/products'),
      ]);
      if (!settingsRes.ok) throw new Error('설정 로드 실패 (로그인 필요)');
      const { warehouses = [], atoz_warehouse_address = '' } = await settingsRes.json();
      const productsData = productsRes.ok ? await productsRes.json() : {};
      const items = productsData.products || [];

      const wh = warehouses.find(w => w.vendor === '아토즈') || {};
      let warehouseZip = wh.zip || '';
      let warehouseClean = wh.address || '';
      let warehousePhone = wh.phone || '';
      // 구형 포맷 폴백
      if (!warehouseClean && atoz_warehouse_address) {
        warehouseZip = extractZip(atoz_warehouse_address);
        warehouseClean = warehouseZip ? cleanAddress(atoz_warehouse_address) : atoz_warehouse_address.trim();
      }

      const modelIndex = buildModelIndex(items);
      const unmatchedSet = new Set();
      const rows = [];

      if (mode === 'vendor') {
        const dataRows = vendorRows.filter(r => r.some(c => c.trim()));
        if (!dataRows.length) throw new Error('입력 데이터가 없습니다');

        for (const row of dataRows) {
          const [productName, qty] = row;
          if (!productName?.trim()) continue;
          const { item: product, matched } = matchProduct(productName, modelIndex);
          if (!matched) unmatchedSet.add(productName.trim());
          const unitPrice = Number(product?.atozPrice || 0);
          const qty_n = parseQty(qty);
          const orderNo = makeOrderNo(VENDOR_CODE, '업체발주', 0);

          rows.push([
            VENDOR_NAME, product?.hsCode || '', unitPrice * qty_n,
            productName.trim(), qty_n,
            '아토즈인터내셔널', warehousePhone, warehouseClean, warehouseZip,
            '차량출고', orderNo,
          ]);
        }
      } else {
        const dataRows = directRows.filter(r => r.some(c => c.trim()));
        if (!dataRows.length) throw new Error('입력 데이터가 없습니다');

        let seq = 1;
        const orderNoByKey = new Map(); // 수취인명+연락처+배송지 동일 시 같은 주문번호 부여
        for (const row of dataRows) {
          const [productName, qty, recipient, phone, address, zip] = row;
          if (!productName?.trim()) continue;
          const { item: product, matched } = matchProduct(productName, modelIndex);
          if (!matched) unmatchedSet.add(productName.trim());
          const unitPrice = Number(product?.atozPrice || 0);
          const qty_n = parseQty(qty);

          const zipFromAddr = extractZip(address || '');
          const finalZip = zipFromAddr || (zip || '').trim();
          const finalAddr = zipFromAddr ? cleanAddress(address || '') : (address || '').trim();

          const recipientTrim = (recipient || '').trim();
          const phoneTrim = (phone || '').trim();
          const dupKey = `${recipientTrim}|${phoneTrim}|${finalAddr}`;
          let orderNo = orderNoByKey.get(dupKey);
          if (!orderNo) {
            orderNo = makeOrderNo(VENDOR_CODE, '직발송', seq++);
            orderNoByKey.set(dupKey, orderNo);
          }

          rows.push([
            VENDOR_NAME, product?.hsCode || '', unitPrice * qty_n,
            productName.trim(), qty_n,
            recipientTrim, phoneTrim, finalAddr, finalZip,
            '택배출고', orderNo,
          ]);
        }
      }

      if (!rows.length) throw new Error('변환할 데이터가 없습니다');
      setResultRows(rows);
      setUnmatchedNames(unmatchedSet);
      setConverted(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setConverting(false);
    }
  }, [mode, vendorRows, directRows]);

  const handleDownload = useCallback(async () => {
    if (!resultRows.length) return;
    const suffix = mode === 'vendor' ? '업체발주' : '직발송';
    const filename = `아토즈_${suffix}_${getDateStr()}.xls`;
    setDownloading(true);
    try {
      const res = await authFetch('/api/order/atoz/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          headers: RESULT_HEADERS,
          rows: resultRows.map(r => r.map(String)),
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
      setDownloading(false);
    }
  }, [resultRows, mode]);

  return (
    <div className="tab-content">
      <div className="section">
        <div className="section-title">발주 유형</div>
        <div className="result-tabs">
          <button className={`result-tab${mode === 'vendor' ? ' active' : ''}`} onClick={() => switchMode('vendor')}>
            업체발주
          </button>
          <button className={`result-tab${mode === 'direct' ? ' active' : ''}`} onClick={() => switchMode('direct')}>
            직발송
          </button>
        </div>
        <div style={{ marginTop: 10 }}>
          <a
            href="https://docs.google.com/spreadsheets/d/134lWW67-IrbTD946K170A66TC5o0KiYCf5PqzhHI2Z8/edit"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary"
          >
            📋 아토즈 발주 시트 바로가기
          </a>
        </div>
      </div>

      {mode === 'vendor' && (
        <div className="section">
          <div className="section-title">업체발주 (아토즈 창고 배송)</div>
          <p className="section-desc">
            상품명·수량을 입력하세요. 배송지는 공용 설정의 아토즈 창고 주소로 자동 입력됩니다.
          </p>
          <SpreadsheetGrid columns={VENDOR_COLS} rows={vendorRows} onChange={setVendorRows} />
        </div>
      )}

      {mode === 'direct' && (
        <div className="section">
          <div className="section-title">직발송</div>
          <p className="section-desc">
            제품명·수량·수취인 정보를 입력하세요. 첫 행이 헤더면 컬럼 순서를 자동 인식합니다.
          </p>
          <SpreadsheetGrid columns={DIRECT_COLS} rows={directRows} onChange={setDirectRows} />
        </div>
      )}

      <div className="action-row">
        <button className="btn btn-primary" onClick={runConvert} disabled={converting}>
          {converting ? '변환 중...' : '▶ 변환 실행'}
        </button>
        <button className="btn btn-secondary" onClick={() => { setConverted(false); setResultRows([]); setError(''); setUnmatchedNames(new Set()); setVendorRows([VENDOR_COLS.map(() => '')]); setDirectRows([DIRECT_COLS.map(() => '')]); }}>
          ↺ 초기화
        </button>
        {error && <span className="msg msg-error">{error}</span>}
        {converted && !error && (
          <span className="msg msg-success">
            변환 완료 — {resultRows.length}건
            {unmatchedNames.size > 0 && (
              <span className="msg-warn"> · 미매칭 {unmatchedNames.size}건 확인 필요</span>
            )}
          </span>
        )}
      </div>

      {resultRows.length > 0 && (
        <div className="section">
          <div className="section-title">
            {mode === 'vendor' ? '업체발주' : '직발송'} 미리보기 ({resultRows.length}건)
          </div>
          <div className="preview-scroll">
            <table className="preview-table">
              <thead>
                <tr>{PREVIEW_COLS.map(c => <th key={c.l}>{c.l}</th>)}</tr>
              </thead>
              <tbody>
                {resultRows.slice(0, PREVIEW_MAX).map((row, ri) => {
                  const unmatched = unmatchedNames.has((row[3] || '').trim());
                  return (
                    <tr key={ri} className={unmatched ? 'row-unmatched' : (row[9] === '차량출고' ? 'row-vendor' : '')}>
                      {PREVIEW_COLS.map(c => (
                        <td key={c.l} className={c.num ? 'num-cell' : ''}>
                          {c.num ? Number(row[c.i]).toLocaleString('ko-KR') : row[c.i]}
                          {c.i === 3 && unmatched && <span className="badge-unmatched">미매칭</span>}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {resultRows.length > PREVIEW_MAX && (
            <div className="preview-more">외 {resultRows.length - PREVIEW_MAX}건 더 있음</div>
          )}
          <div className="download-row">
            <button className="btn btn-download-atoz" onClick={handleDownload} disabled={downloading}>
              {downloading ? '생성 중...' : `↓ 아토즈 발주서 다운로드 (${resultRows.length}건)`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
