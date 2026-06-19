import { useState, useCallback } from 'react';
import { makeOrderNo, getDateStr } from '../utils/orderNumber';

const VENDOR_CODE = 'MC';
const RESULT_HEADERS = ['주문번호', '구매자명', '상품명', '수량', '판매금액', '수령인명', '주소', '연락처', '우편번호', '배송시구분', 'HS코드'];
const NUM_COLS = [3, 4];
const PREVIEW_MAX = 20;
// 인덱스: 주문번호(0) 구매자명(1) 상품명(2) 수량(3) 판매금액(4) 수령인명(5) 주소(6) 연락처(7) 우편번호(8) 배송시구분(9) HS코드(10) 발주형태(11, 내부용)
const PREVIEW_COLS = [
  { l: '주문번호', i: 0 },
  { l: '구매자명', i: 1 },
  { l: '상품명', i: 2 },
  { l: '수량', i: 3, num: true },
  { l: '판매금액', i: 4, num: true },
  { l: '수령인', i: 5 },
  { l: '주소', i: 6 },
];

function extractZip(address) {
  if (!address) return '';
  const m = address.match(/\[(\d{5,6})\]/);
  if (m) return m[1];
  const m2 = address.match(/\((\d{5,6})\)/);
  if (m2) return m2[1];
  return '';
}

function cleanAddress(addr) {
  return (addr || '').replace(/[\[(]\d{5,6}[\])]\s*/, '').trim();
}

function findProduct(productName, items) {
  if (!productName || !items?.length) return null;
  const clean = productName.trim().toLowerCase();
  let found = items.find(it => (it.modelName || '').toLowerCase() === clean);
  if (found) return found;
  found = items.find(it => {
    const name = (it.modelName || '').toLowerCase();
    return clean.includes(name) || name.includes(clean);
  });
  return found || null;
}

export default function MiracleTab() {
  const [text, setText] = useState('');
  const [parsing, setParsing] = useState(false);
  const [resultRows, setResultRows] = useState([]);
  const [downloading, setDownloading] = useState(false);
  const [parseError, setParseError] = useState('');
  const [parsed, setParsed] = useState(false);

  const handleParse = useCallback(async () => {
    if (!text.trim()) return;
    setParsing(true);
    setParseError('');
    setResultRows([]);
    setParsed(false);

    try {
      const token = localStorage.getItem('auth_token');

      const [parseRes, settingsRes, productsRes] = await Promise.all([
        fetch('/api/b2b/parse', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ text }),
        }),
        fetch('/api/b2b/settings', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('/api/products', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (!parseRes.ok) {
        const err = await parseRes.json().catch(() => ({}));
        throw new Error(err.error || '파싱 실패');
      }

      const { items } = await parseRes.json();
      const settingsData = settingsRes.ok ? await settingsRes.json() : {};
      const productsData = productsRes.ok ? await productsRes.json() : {};
      const settingsItems = productsData.products || [];
      const wh = (settingsData.warehouses || []).find(w => w.vendor === '미라클') || {};
      let warehouseZip = wh.zip || '';
      let warehouseClean = wh.address || '';
      let warehousePhone = wh.phone || '';
      // 구형 포맷 폴백
      if (!warehouseClean) {
        const oldAddr = settingsData.miracle_warehouse_address || '';
        warehouseZip = extractZip(oldAddr);
        warehouseClean = warehouseZip ? cleanAddress(oldAddr) : oldAddr.trim();
      }

      let directSeq = 1;
      const rows = items.map((item) => {
        const product = (item.modelName
          ? settingsItems.find(it => it.modelName === item.modelName)
          : null) || findProduct(item.상품명, settingsItems);
        const unitPrice = Number(product?.miraclePrice || 0);
        const qty = Number(item.수량) || 1;
        const salesAmt = unitPrice * qty;
        const orderType = item.발주형태 || '직발송';
        const orderNo = item.주문번호 || makeOrderNo(VENDOR_CODE, orderType, orderType === '직발송' ? directSeq++ : 0);

        let recipient, phone, addr, zip;

        if (orderType === '업체발주') {
          recipient = '(주)디지털미라클';
          phone = warehousePhone;
          addr = warehouseClean;
          zip = warehouseZip;
        } else {
          const rawAddr = item.주소 || '';
          zip = extractZip(rawAddr);
          addr = zip ? cleanAddress(rawAddr) : rawAddr.trim();
          recipient = item.수령인 || '';
          phone = item.연락처 || '';
        }

        return [
          orderNo,
          '(주)디지털미라클',
          item.상품명 || '',
          qty,
          salesAmt,
          recipient,
          addr,
          phone,
          zip,
          '선불',
          product?.hsCode || '',
          orderType,           // index 11: 내부 카운팅용, 파일 미포함
        ];
      });

      // 주문번호 기준 정렬
      rows.sort((a, b) => String(a[1]).localeCompare(String(b[1])));

      setResultRows(rows);
      setParsed(true);
    } catch (e) {
      setParseError(e.message);
    } finally {
      setParsing(false);
    }
  }, [text]);

  const handleDownload = useCallback(async () => {
    if (!resultRows.length) return;
    const filename = `미라클_발주서_${getDateStr()}.xls`;
    setDownloading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch('/api/order/miracle/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          headers: RESULT_HEADERS,
          rows: resultRows.map(r => r.slice(0, RESULT_HEADERS.length).map(String)),
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
  }, [resultRows]);

  const vendorCount = resultRows.filter(r => r[11] === '업체발주').length;
  const directCount = resultRows.filter(r => r[11] === '직발송').length;

  return (
    <div className="tab-content">
      <div className="section">
        <div className="section-title">카카오톡 주문 텍스트</div>
        <p className="section-desc">
          카카오톡에서 받은 주문 내용을 붙여넣으세요. Claude AI가 상품명·수량·수령인·연락처·주소를 자동 추출하고 업체발주/직발송을 분류합니다.
        </p>
        <textarea
          className="kakao-textarea"
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="카카오톡 주문 텍스트를 여기에 붙여넣으세요..."
          rows={10}
        />
        <div className="action-row">
          <button className="btn btn-primary" onClick={handleParse} disabled={parsing || !text.trim()}>
            {parsing ? 'AI 파싱 중...' : '파싱'}
          </button>
          {parseError && <span className="msg msg-error">{parseError}</span>}
          {parsed && !parseError && (
            <span className="msg msg-success">
              파싱 완료 — 전체 {resultRows.length}건 (업체발주 {vendorCount} / 직발송 {directCount})
            </span>
          )}
        </div>
      </div>

      {resultRows.length > 0 && (
        <div className="section">
          <div className="section-title">파싱 결과 미리보기 ({resultRows.length}건)</div>
          <div className="preview-scroll">
            <table className="preview-table">
              <thead>
                <tr>{PREVIEW_COLS.map(c => <th key={c.l}>{c.l}</th>)}</tr>
              </thead>
              <tbody>
                {resultRows.slice(0, PREVIEW_MAX).map((row, ri) => (
                  <tr key={ri} className={row[11] === '업체발주' ? 'row-vendor' : ''}>
                    {PREVIEW_COLS.map(c => (
                      <td key={c.l} className={c.num ? 'num-cell' : ''}>{c.num ? Number(row[c.i]).toLocaleString('ko-KR') : row[c.i]}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {resultRows.length > PREVIEW_MAX && (
            <div className="preview-more">외 {resultRows.length - PREVIEW_MAX}건 더 있음</div>
          )}
          <div className="download-row">
            <button
              className="btn btn-download-miracle"
              onClick={handleDownload}
              disabled={downloading}
            >
              {downloading ? '생성 중...' : `↓ 미라클 발주서 다운로드 (${resultRows.length}건)`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
