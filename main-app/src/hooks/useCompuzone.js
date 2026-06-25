import { useState, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { makeOrderNo, getDateStr } from '../utils/orderNumber';
import { authFetch } from '../components/authFetch';

const VENDOR_CODE = 'CPZ';

const FIXED = {
  buyer: '컴퓨존',
  recipient: '컴퓨존 가산재고B동',
  address: '서울특별시 금천구 가산로9길 87',
  phone: '02-2126-0126',
  zipcode: '08517',
  delivery: '선불',
};

function sanitize(val) {
  if (val == null) return '';
  return String(val).replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim();
}

function parseOrderSheet(buf) {
  const wb = XLSX.read(new Uint8Array(buf), { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });
  const data = [];
  for (let i = 2; i < rows.length; i++) {
    const r = rows[i];
    if (!r || !r[0]) continue;
    data.push({
      hsCode: sanitize(r[0]),
      productName: sanitize(r[5]),
      totalAmtVat: r[3] ? Number(r[3]) : 0,
      qty: r[10] ? Number(r[10]) : 0,
    });
  }
  return data;
}

export default function useCompuzone() {
  const [file, setFile] = useState(null);
  const [rows, setRows] = useState([]);
  const [logs, setLogs] = useState([]);
  const [converting, setConverting] = useState(false);
  const [stats, setStats] = useState(null);

  const addLog = useCallback((msg, type = 'normal') => {
    const now = new Date();
    const t = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;
    setLogs(prev => [...prev, { t, msg, type }]);
  }, []);

  const runConvert = useCallback(async () => {
    if (!file) return;
    setConverting(true);
    setRows([]);
    setLogs([]);
    setStats(null);

    // 컴퓨존은 항상 업체발주 → -00 고정
    const orderNo = makeOrderNo(VENDOR_CODE, '업체발주');
    addLog(`변환 시작 · 주문번호: ${orderNo}`, 'info');

    try {
      const buf = await file.arrayBuffer();
      const data = parseOrderSheet(buf);
      addLog(`주문정보 ${data.length}행 파싱 완료`, 'ok');

      const result = data.map(d => [
        orderNo, FIXED.buyer, d.productName, d.qty, d.totalAmtVat,
        FIXED.recipient, FIXED.address, FIXED.phone, FIXED.zipcode,
        FIXED.delivery, d.hsCode,
      ]);

      setRows(result);
      const tQty = result.reduce((s, r) => s + (Number(r[3]) || 0), 0);
      const tAmt = result.reduce((s, r) => s + (Number(r[4]) || 0), 0);
      setStats({ nProd: result.length, tQty, tAmt });
      addLog(`변환 완료: ${result.length}행`, 'info');
    } catch (e) {
      addLog(`오류: ${e.message}`, 'err');
    } finally {
      setConverting(false);
    }
  }, [file, addLog]);

  const doDownload = useCallback(async () => {
    if (!rows.length) return;
    const headers = ['메인주문번호','구매자명','상품명(F)','수량(K)','판매금액(D)','수령인명','주소','수령인전화번호','우편번호','배송시구분','hs_code(A)'];
    const filename = `컴퓨존_발주_${getDateStr()}.xls`;
    try {
      const res = await authFetch('/api/compuzone/xls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ headers, rows, numCols: [3, 4], filename }),
      });
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = filename;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert(`다운로드 실패: ${e.message}`);
    }
  }, [rows]);

  const reset = useCallback(() => {
    setFile(null); setRows([]); setLogs([]); setStats(null);
  }, []);

  return { file, setFile, rows, logs, converting, stats, runConvert, doDownload, reset };
}
