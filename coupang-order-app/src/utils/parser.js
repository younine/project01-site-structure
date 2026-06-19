import * as XLSX from 'xlsx';
import { WH } from './warehouseDB';

export const HEADERS = [
  'No.','상품코드','BARCODE','상품명/옵션/BARCODE','매입유형/면세여부',
  '물류센터','발주수량','업체납품가능수량','입고수량',
  '매입가','공급가액','부가세','매입가','공급가액','부가세',
  '생산년도','유통기한관리','제조(수입)일자\n유통기한','매입가',
  '발주번호','마진','마진율','HS코드',
  '발주처','납품처','수령인','수령인연락처','수령인주소',
  '배송방법','납품일자','결제방법','세금계산서','납품처'
];

const pn = v => {
  if (v == null) return 0;
  const s = String(v).replace(/,/g, '').trim();
  if (s === '-' || s === '') return 0;
  const n = parseFloat(s);
  return isNaN(n) ? 0 : Math.round(n);
};

function fmtDate(v) {
  if (!v) return '';
  if (v instanceof Date) {
    const y = v.getFullYear(), m = String(v.getMonth()+1).padStart(2,'0'), d = String(v.getDate()).padStart(2,'0');
    return `${y}${m}${d}`;
  }
  const s = String(v);
  const match = s.match(/(\d{4})[\/\-](\d{2})[\/\-](\d{2})/);
  if (match) return match[1]+match[2]+match[3];
  if (/^\d{8}$/.test(s)) return s;
  return s;
}

function cleanCo(s) {
  if (!s) return '';
  return String(s).replace(/^\[.*?\]\s*/, '').replace(/\(주\)/g, '㈜').trim();
}

const tv = v => v instanceof Date ? v : (typeof v === 'number' ? v : pn(v));

export function parseHS(buf) {
  const wb = XLSX.read(new Uint8Array(buf), { type: 'array' });
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: null });
  const m = {};
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r || !r[0] || !r[2]) continue;
    m[String(r[0]).trim()] = String(r[2]).trim();
  }
  return m;
}

export function parsePO(buf) {
  const wb = XLSX.read(new Uint8Array(buf), { type: 'array', cellDates: true });
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: null, raw: false });
  const meta = { poNumber: '', companyName: '', deliveryDate: '' };
  const prods = [];
  let pStart = -1;

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]; if (!r) continue;
    const c0 = r[0] ? String(r[0]).trim() : '';
    if (c0 === '거래처명') meta.companyName = cleanCo(r[2]);
    if (c0 === '발주번호') meta.poNumber = r[2] ? String(r[2]).trim() : '';
    if (c0 === '입고예정일시' && !meta.deliveryDate) {
      const nr = rows[i+1];
      if (nr) meta.deliveryDate = nr[5] ? fmtDate(nr[5]) : '';
    }
    if (c0 === 'No.' && r[2] && String(r[2]).trim() === '상품명/옵션/BARCODE') { pStart = i+2; break; }
  }

  if (pStart < 0) return { meta, prods };
  let cur = null;

  for (let i = pStart; i < rows.length; i++) {
    const r = rows[i]; if (!r) continue;
    const c0 = r[0] ? String(r[0]).trim() : null;
    if (c0 && (c0 === '합계' || c0.startsWith('4.') || c0.startsWith('5.'))) break;
    if (c0 && /^\d+$/.test(c0)) {
      cur = {
        seq: c0, sku: r[1] ? String(r[1]).trim() : '', name: r[2] ? String(r[2]).trim() : '',
        ptype: r[3] ? String(r[3]).trim() : '', wh: r[5] ? String(r[5]).trim() : '',
        oQty: tv(r[6]), sQty: tv(r[7]), rQty: tv(r[8]),
        uPrice: tv(r[9]), uSupply: tv(r[10]), uVat: tv(r[11]),
        tPrice: tv(r[12]), tSupply: tv(r[13]), tVat: tv(r[14]),
        pYear: r[15] ? String(r[15]).trim() : '-',
        expMgmt: r[19] ? String(r[19]).trim() : 'N',
        expDate: r[20] ? String(r[20]).trim() : '-',
        barcode: '', tax: ''
      };
      prods.push(cur);
    } else if ((c0 === null || c0 === '') && r[2] && cur && !cur.barcode) {
      cur.barcode = String(r[2]).trim();
      cur.tax = r[3] ? String(r[3]).trim() : '';
    }
  }
  return { meta, prods };
}

export function mkRow(p, meta, bizNo, hsMap) {
  const w = WH[p.wh] || { t: '', a: '' };
  return [
    p.seq, p.sku, p.barcode, p.name, p.ptype, p.wh,
    p.oQty, p.sQty, p.rQty,
    p.uPrice, p.uSupply, p.uVat,
    p.tPrice, p.tSupply, p.tVat,
    p.pYear, p.expMgmt, p.expDate,
    p.uPrice,
    meta.poNumber, null, null,
    (typeof hsMap[p.sku] === 'object' ? hsMap[p.sku]?.hs : hsMap[p.sku]) || null,
    'B2B쿠팡', `쿠팡(${meta.poNumber})`,
    p.wh, w.t || null, w.a || null,
    '밀크런', meta.deliveryDate || null, '외상',
    bizNo,
    meta.companyName
  ];
}

export const NUM_COLS = new Set([6,7,8,9,10,11,12,13,14,18]);
export const COL_W = { 0:13.59, 11:7.09, 13:14.39, 19:10.49, 29:9.49 };
export const DEFAULT_W = 8.96;
