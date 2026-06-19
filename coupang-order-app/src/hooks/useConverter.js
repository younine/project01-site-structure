import { useState, useCallback, useEffect } from 'react';
import JSZip from 'jszip';
import * as XLSX from 'xlsx';
import { parseHS, parsePO, mkRow, HEADERS, NUM_COLS, COL_W, DEFAULT_W } from '../utils/parser';
import { WH } from '../utils/warehouseDB';

export default function useConverter() {
  const [zipFile, setZipFile] = useState(null);
  const [hsMap, setHsMap] = useState({});
  const [allRows, setAllRows] = useState([]);
  const [logs, setLogs] = useState([]);
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState('');
  const [stats, setStats] = useState(null);
  const [warnings, setWarnings] = useState([]);
  const [converting, setConverting] = useState(false);
  const [fmt, setFmt] = useState('xls');
  const [bizNo, setBizNo] = useState('120-88-80076');
  const [hsSource, setHsSource] = useState('none');

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) return;
    fetch('/api/order/hs-codes', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.codes && Object.keys(data.codes).length > 0) {
          setHsMap(data.codes);
          setHsSource('server');
        }
      })
      .catch(() => {});
  }, []);

  const addLog = useCallback((msg, type = 'normal') => {
    const now = new Date();
    const t = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;
    setLogs(prev => [...prev, { t, msg, type }]);
  }, []);

  const loadHS = useCallback(async (file) => {
    const buf = await file.arrayBuffer();
    const map = parseHS(buf);
    setHsMap(map);
    setHsSource('manual');
    return Object.keys(map).length;
  }, []);

  const saveHsToServer = useCallback(async (map) => {
    const token = localStorage.getItem('auth_token');
    const res = await fetch('/api/order/hs-codes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ codes: map }),
    });
    if (!res.ok) throw new Error(await res.text());
    const { count } = await res.json();
    setHsMap(map);
    setHsSource('server');
    return count;
  }, []);

  const runConvert = useCallback(async () => {
    if (!zipFile) return;
    setConverting(true);
    setAllRows([]);
    setLogs([]);
    setProgress(0);
    setStats(null);
    setWarnings([]);

    addLog(`변환 시작 · 세금계산서: ${bizNo}`, 'info');
    const hsCount = Object.keys(hsMap).length;
    addLog(hsCount > 0 ? `HS코드 ${hsCount}개 로드됨` : 'HS코드 없음 — W열 빈칸 처리');

    let zip;
    try {
      const b = await zipFile.arrayBuffer();
      zip = await JSZip.loadAsync(b);
    } catch (e) {
      addLog(`ZIP 오류: ${e.message}`, 'err');
      setConverting(false);
      return;
    }

    const entries = [];
    zip.forEach((p, e) => { if (!e.dir && p.toLowerCase().endsWith('.xlsx')) entries.push(e); });
    if (!entries.length) { addLog('ZIP에 XLSX 없음', 'err'); setConverting(false); return; }
    addLog(`발주서 ${entries.length}개 발견`, 'info');

    const warns = [];
    let skipped = 0;
    const rows = [];

    for (let i = 0; i < entries.length; i++) {
      setProgress(Math.round(i / entries.length * 100));
      setProgressText(`발주서 처리 중... ${i+1}/${entries.length}`);
      let buf;
      try { buf = await entries[i].async('arraybuffer'); }
      catch (e) { addLog(`추출 오류(${i+1}): ${e.message}`, 'err'); continue; }
      let parsed;
      try { parsed = parsePO(buf); }
      catch (e) { addLog(`파싱 오류(${i+1}): ${e.message}`, 'err'); continue; }

      const { meta, prods } = parsed;
      if (!meta.poNumber) { addLog(`⚠ 발주번호 없음 파일${i+1}`, 'err'); warns.push(`파일${i+1}: 발주번호 없음`); continue; }

      const valid = prods.filter(p => Number(p.sQty) !== 0);
      const rem = prods.length - valid.length;
      if (rem > 0) { skipped += rem; addLog(`발주서 ${meta.poNumber}: 납품가능=0 제외 ${rem}행`); }
      if (!valid.length) { addLog(`⚠ 발주서 ${meta.poNumber}: 유효 상품 없음`, 'err'); continue; }

      valid.forEach(p => { if (p.wh && !WH[p.wh] && !warns.find(w => w.includes(p.wh))) warns.push(`물류센터 '${p.wh}' 주소 없음`); });
      rows.push(...valid.map(p => mkRow(p, meta, bizNo, hsMap)));
      addLog(`✓ ${meta.poNumber} → ${valid.length}행 (${meta.companyName})`, 'ok');
    }

    setProgress(100);
    setProgressText('변환 완료');

    if (!rows.length) { addLog('변환 결과 없음', 'err'); setConverting(false); return; }
    if (skipped > 0) addLog(`납품가능수량 0인 행 총 ${skipped}개 제외`, 'info');
    if (warns.length) setWarnings(warns);

    const tQty = rows.reduce((s, r) => s + (Number(r[6]) || 0), 0);
    const tAmt = rows.reduce((s, r) => s + (Number(r[12]) || 0), 0);
    const nPO = new Set(rows.map(r => r[19])).size;
    setStats({ nPO, nProd: rows.length, tQty, tAmt });
    setAllRows(rows);
    addLog(`완료! ${rows.length}행 변환됨`, 'info');
    setConverting(false);
  }, [zipFile, hsMap, bizNo, addLog]);

  const doDownload = useCallback(async () => {
    if (!allRows.length) return;
    const ts = new Date();
    const d = `${ts.getFullYear()}${String(ts.getMonth()+1).padStart(2,'0')}${String(ts.getDate()).padStart(2,'0')}`;
    const token = localStorage.getItem('auth_token');
    const filename = `쿠팡B2B발주리스트_${d}.xls`;
    try {
      const res = await fetch('/api/order/xls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ headers: HEADERS, rows: allRows, numCols: Array.from(NUM_COLS), filename }),
      });
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = filename; a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert(`다운로드 실패: ${e.message}`);
    }
  }, [allRows]);

  const reset = useCallback(() => {
    setZipFile(null);
    setHsMap({});
    setAllRows([]);
    setLogs([]);
    setProgress(0);
    setProgressText('');
    setStats(null);
    setWarnings([]);
  }, []);

  return {
    zipFile, setZipFile, hsMap, loadHS, allRows,
    logs, progress, progressText, stats, warnings,
    converting, runConvert, fmt, setFmt, doDownload,
    bizNo, setBizNo, reset,
    hsSource, saveHsToServer
  };
}
