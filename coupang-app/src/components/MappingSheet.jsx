import { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import './MappingSheet.css';
import { useProducts } from '../hooks/useProducts';

const COLS = [
  { label: '수집코드(productId)', key: 'collectCode',       w: 120 },
  { label: 'SKUID',               key: 'skuid',             w:  90 },
  { label: 'SKUNAME',             key: 'skuname',           w: 180 },
  { label: '공급가',              key: 'supplyPrice',       w:  90 },
  { label: '정상판매가',          key: 'originalSalePrice', w:  90 },
  { label: '네이버URL',           key: 'naverUrl',          w: 200 },
];

const HEADER_NAMES = ['수집코드', 'skuid', 'skuname', '공급가', '정상판매가', '네이버url', 'naverurl', 'collectcode'];

let _uid = 0;
const nextId  = () => ++_uid;
const emptyRow = () => ({ _id: nextId(), collectCode: '', skuid: '', skuname: '', supplyPrice: '', originalSalePrice: '', naverUrl: '' });

function initRows(settings) {
  if (!settings || settings.length === 0) return [emptyRow()];
  return settings.map(s => ({
    _id: nextId(),
    collectCode:       s.collectCode       || '',
    skuid:             s.skuid             || '',
    skuname:           s.skuname           || '',
    supplyPrice:       String(s.supplyPrice       ?? ''),
    originalSalePrice: String(s.originalSalePrice ?? ''),
    naverUrl:          s.naverUrl          || '',
  }));
}

function downloadCSV(rows) {
  const headers = ['수집코드', 'SKUID', 'SKUNAME', '공급가', '정상판매가', '네이버URL'];
  const csv = [headers, ...rows.map(r => [r.collectCode, r.skuid, r.skuname, r.supplyPrice, r.originalSalePrice, r.naverUrl])]
    .map(row => row.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a'); a.href = url; a.download = 'settings.csv'; a.click();
  URL.revokeObjectURL(url);
}

function parseExcel(file, onDone) {
  const reader = new FileReader();
  reader.onload = (evt) => {
    try {
      const wb  = XLSX.read(new Uint8Array(evt.target.result), { type: 'array' });
      const raw = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: '' });
      if (!raw.length) return onDone([]);
      const isHeader = raw[0]?.some(c => HEADER_NAMES.includes(String(c).toLowerCase().trim()));
      const data = (isHeader ? raw.slice(1) : raw).filter(r => r.some(v => String(v).trim()));
      onDone(data.map(r => ({
        collectCode:       String(r[0] ?? '').trim(),
        skuid:             String(r[1] ?? '').trim(),
        skuname:           String(r[2] ?? '').trim(),
        supplyPrice:       String(r[3] ?? '').trim(),
        originalSalePrice: String(r[4] ?? '').trim(),
        naverUrl:          String(r[5] ?? '').trim(),
      })));
    } catch { onDone(null); }
  };
  reader.readAsArrayBuffer(file);
}

export default function MappingSheet({ initialRows, onSave }) {
  const initialized = useRef(false);
  const [rows,    setRows]    = useState(() => {
    if (initialRows && initialRows.length > 0) initialized.current = true;
    return initRows(initialRows);
  });
  const [anchor,      setAnchor]      = useState(null);
  const [rngEnd,      setRngEnd]      = useState(null);
  const [editing,     setEditing]     = useState(null);
  const [editVal,     setEditVal]     = useState('');
  const [saving,      setSaving]      = useState(false);
  const [msg,         setMsg]         = useState(null);
  const [rowSelected, setRowSelected] = useState(new Set());
  const wrapRef = useRef();
  const inputRef = useRef();
  const fileRef  = useRef();

  const { productMap } = useProducts();
  const productMapRef  = useRef({});

  /* SKUID 컬럼 인덱스 (0-based) */
  const SKUID_CI         = COLS.findIndex(c => c.key === 'skuid');
  const ORIG_PRICE_CI    = COLS.findIndex(c => c.key === 'originalSalePrice');

  const applyProductMap = (r, pm) => {
    const price = pm[(r.skuid || '').trim()];
    return price !== undefined ? { ...r, originalSalePrice: price } : r;
  };

  const cellIsAuto = (ri, ci) => {
    if (ci !== ORIG_PRICE_CI) return false;
    const row = rows[ri];
    return row ? productMapRef.current[(row.skuid || '').trim()] !== undefined : false;
  };

  /* 서버 데이터 첫 로드 시 동기화 — 현재 productMap도 함께 적용 */
  useEffect(() => {
    if (!initialized.current && initialRows && initialRows.length > 0) {
      const base = initRows(initialRows);
      const pm = productMapRef.current;
      setRows(Object.keys(pm).length > 0 ? base.map(r => applyProductMap(r, pm)) : base);
      initialized.current = true;
    }
  }, [initialRows]); // eslint-disable-line react-hooks/exhaustive-deps

  /* productMap 갱신 시 매칭 행 자동 반영 */
  useEffect(() => {
    productMapRef.current = productMap;
    if (Object.keys(productMap).length === 0) return;
    setRows(prev => prev.map(r => applyProductMap(r, productMap)));
  }, [productMap]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (editing && inputRef.current) { inputRef.current.focus(); inputRef.current.select(); }
  }, [editing]);

  /* ── 범위 ── */
  const getRange = () => {
    if (!anchor) return null;
    const e = rngEnd ?? anchor;
    return { r1: Math.min(anchor.r, e.r), r2: Math.max(anchor.r, e.r), c1: Math.min(anchor.c, e.c), c2: Math.max(anchor.c, e.c) };
  };
  const inRange  = (r, c) => { const g = getRange(); return g ? r >= g.r1 && r <= g.r2 && c >= g.c1 && c <= g.c2 : false; };
  const isAnchor = (r, c) => anchor?.r === r && anchor?.c === c;

  /* ── 편집 커밋 ── */
  const commit = (r, c, v) => {
    const er = r ?? editing?.r; const ec = c ?? editing?.c; const ev = v ?? editVal;
    if (er == null || ec == null) return;
    setRows(prev => prev.map((x, i) => {
      if (i !== er) return x;
      const updated = { ...x, [COLS[ec].key]: ev };
      /* SKUID 변경 시 제품 관리 데이터로 정상판매가 자동 연동 */
      if (ec === SKUID_CI) {
        const price = productMapRef.current[(ev || '').trim()];
        if (price !== undefined) updated.originalSalePrice = price;
      }
      return updated;
    }));
    setEditing(null);
  };

  const select = (r, c, extend = false) => {
    if (editing) commit();
    if (extend && anchor) { setRngEnd({ r, c }); }
    else { setAnchor({ r, c }); setRngEnd({ r, c }); }
    wrapRef.current?.focus();
  };

  const startEdit = (r, c, init = null) => {
    if (cellIsAuto(r, c)) return; /* 자동 연동 셀은 편집 불가 */
    if (editing) commit();
    setEditing({ r, c });
    setEditVal(init ?? String(rows[r]?.[COLS[c].key] ?? ''));
    setAnchor({ r, c }); setRngEnd({ r, c });
  };

  const move = (dr, dc, extend = false) => {
    const cur = rngEnd ?? anchor; if (!cur) return;
    const nr = Math.max(0, Math.min(rows.length - 1, cur.r + dr));
    const nc = Math.max(0, Math.min(COLS.length  - 1, cur.c + dc));
    if (extend) { setRngEnd({ r: nr, c: nc }); }
    else        { setAnchor({ r: nr, c: nc }); setRngEnd({ r: nr, c: nc }); }
  };

  const doCopy = () => {
    const g = getRange(); if (!g) return;
    const text = rows.slice(g.r1, g.r2 + 1)
      .map(row => COLS.slice(g.c1, g.c2 + 1).map(col => row[col.key] ?? '').join('\t')).join('\n');
    navigator.clipboard?.writeText(text).catch(() => {});
  };

  /* ── 키보드 (래퍼) ── */
  const handleWrapKeyDown = (e) => {
    if (editing) return;
    if (!anchor)  return;
    const ctrl = e.ctrlKey || e.metaKey;
    if (ctrl && e.key === 'c') { e.preventDefault(); doCopy(); return; }
    if (ctrl) return;
    const cur = rngEnd ?? anchor;
    switch (e.key) {
      case 'ArrowUp':    e.preventDefault(); move(-1, 0, e.shiftKey); break;
      case 'ArrowDown':  e.preventDefault(); move( 1, 0, e.shiftKey); break;
      case 'ArrowLeft':  e.preventDefault(); move(0, -1, e.shiftKey); break;
      case 'ArrowRight': e.preventDefault(); move(0,  1, e.shiftKey); break;
      case 'Enter':      e.preventDefault(); startEdit(cur.r, cur.c); break;
      case 'Tab':        e.preventDefault(); e.shiftKey ? move(0, -1) : move(0, 1); break;
      case 'Delete':
      case 'Backspace': {
        e.preventDefault();
        const g = getRange(); if (!g) break;
        setRows(prev => prev.map((row, ri) => {
          if (ri < g.r1 || ri > g.r2) return row;
          const next = { ...row };
          for (let ci = g.c1; ci <= g.c2; ci++) {
            if (!cellIsAuto(ri, ci)) next[COLS[ci].key] = '';
          }
          return next;
        }));
        break;
      }
      default:
        if (e.key.length === 1) { e.preventDefault(); startEdit(cur.r, cur.c, e.key); }
    }
  };

  /* ── 키보드 (인풋) ── */
  const handleInputKeyDown = (e) => {
    e.stopPropagation();
    if (!editing) return;
    const { r, c } = editing;
    if (e.key === 'Escape') {
      e.preventDefault(); setEditing(null); wrapRef.current?.focus();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      commit(r, c, editVal);
      const nr = Math.min(rows.length - 1, r + 1);
      setAnchor({ r: nr, c }); setRngEnd({ r: nr, c });
      wrapRef.current?.focus();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      commit(r, c, editVal);
      const nc = c + (e.shiftKey ? -1 : 1);
      if (nc >= 0 && nc < COLS.length) { setAnchor({ r, c: nc }); setRngEnd({ r, c: nc }); }
      else if (!e.shiftKey && r < rows.length - 1) { setAnchor({ r: r + 1, c: 0 }); setRngEnd({ r: r + 1, c: 0 }); }
      wrapRef.current?.focus();
    }
  };

  /* ── 붙여넣기 ── */
  const handlePaste = (e) => {
    e.preventDefault();
    if (!anchor) return;
    const grid = e.clipboardData.getData('text')
      .replace(/\r\n/g, '\n').replace(/\r/g, '\n').trimEnd()
      .split('\n').map(line => line.split('\t'));
    const { r: sr, c: sc } = anchor;
    setRows(prev => {
      const next = [...prev];
      for (let ri = 0; ri < grid.length; ri++) {
        const pr = sr + ri;
        while (next.length <= pr) next.push(emptyRow());
        const row = { ...next[pr] };
        for (let ci = 0; ci < grid[ri].length; ci++) {
          const pc = sc + ci;
          if (pc < COLS.length) row[COLS[pc].key] = grid[ri][ci].trim();
        }
        next[pr] = row;
      }
      return next;
    });
  };

  /* ── 행 추가 / 삭제 ── */
  const addRow = () => {
    if (editing) commit();
    const newIndex = rows.length;
    setRows(prev => [...prev, emptyRow()]);
    setTimeout(() => {
      setAnchor({ r: newIndex, c: 0 });
      setRngEnd({ r: newIndex, c: 0 });
      if (wrapRef.current) {
        wrapRef.current.scrollTop = wrapRef.current.scrollHeight;
        wrapRef.current.focus();
      }
    }, 0);
  };

  const insertRowAfter = (ri) => {
    if (editing) commit();
    setRows(prev => {
      const next = [...prev];
      next.splice(ri + 1, 0, emptyRow());
      return next;
    });
    setTimeout(() => {
      setAnchor({ r: ri + 1, c: 0 });
      setRngEnd({ r: ri + 1, c: 0 });
      wrapRef.current?.focus();
    }, 0);
  };

  const toggleRowSelect = (id) => {
    setRowSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAllRows = () => {
    if (rowSelected.size === rows.length && rows.length > 0) setRowSelected(new Set());
    else setRowSelected(new Set(rows.map(r => r._id)));
  };

  const deleteSelected = () => {
    if (rowSelected.size > 0) {
      setRows(prev => {
        const next = prev.filter(r => !rowSelected.has(r._id));
        return next.length > 0 ? next : [emptyRow()];
      });
      setRowSelected(new Set());
      setAnchor(null); setRngEnd(null);
      wrapRef.current?.focus();
      return;
    }
    const g = getRange(); if (!g) return;
    setRows(prev => {
      const next = prev.filter((_, i) => i < g.r1 || i > g.r2);
      return next.length > 0 ? next : [emptyRow()];
    });
    setAnchor(null); setRngEnd(null);
    wrapRef.current?.focus();
  };

  /* ── 파일 업로드 ── */
  const handleFileChange = (e) => {
    const file = e.target.files[0]; if (!file) return;
    e.target.value = '';
    parseExcel(file, (items) => {
      if (!items) { setMsg({ type: 'err', text: '파일을 읽을 수 없습니다.' }); return; }
      if (items.length === 0) { setMsg({ type: 'err', text: '추가할 항목이 없습니다.' }); return; }
      setRows(prev => [...prev, ...items.map(item => ({ _id: nextId(), ...item }))]);
      setMsg({ type: 'ok', text: `${items.length}개 항목이 추가됐습니다.` });
      setTimeout(() => setMsg(null), 3000);
    });
  };

  /* ── 저장 ── */
  const handleSave = async () => {
    let finalRows = rows;
    if (editing) {
      finalRows = rows.map((x, i) => i === editing.r ? { ...x, [COLS[editing.c].key]: editVal } : x);
      setRows(finalRows); setEditing(null);
    }
    setSaving(true); setMsg(null);
    try {
      const items = finalRows.map(r => ({
        collectCode:       r.collectCode,
        skuid:             r.skuid,
        skuname:           r.skuname,
        supplyPrice:       r.supplyPrice,
        originalSalePrice: r.originalSalePrice,
        naverUrl:          r.naverUrl,
      }));
      await onSave(items);
      setMsg({ type: 'ok', text: `✓ ${items.length}개 항목 저장됐습니다` });
    } catch (err) {
      setMsg({ type: 'err', text: `오류: ${err.message}` });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="ms-root">
      <div className="ms-toolbar">
        <button className="ms-btn" onClick={addRow}>+ 행 추가</button>
        <button className="ms-btn danger" onClick={deleteSelected} disabled={rowSelected.size === 0 && !anchor}>
          선택 삭제{rowSelected.size > 0 ? ` (${rowSelected.size})` : ''}
        </button>
        <input ref={fileRef} type="file" accept=".xlsx,.csv" style={{ display: 'none' }} onChange={handleFileChange} />
        <button className="ms-btn" onClick={() => fileRef.current?.click()}>↑ 엑셀 업로드</button>
        <button className="ms-btn" onClick={() => downloadCSV(rows)} disabled={!rows.length}>↓ CSV</button>
        <div className="ms-toolbar-gap" />
        {msg && <span className={`ms-msg ${msg.type}`}>{msg.text}</span>}
        <button className="ms-save-btn" onClick={handleSave} disabled={saving}>
          {saving ? '저장 중...' : '서버에 저장'}
        </button>
      </div>

      <div
        className="ms-wrap"
        ref={wrapRef}
        tabIndex={0}
        onKeyDown={handleWrapKeyDown}
        onPaste={handlePaste}
      >
        <table className="ms-table">
          <colgroup>
            <col style={{ width: 34 }} />
            <col style={{ width: 28 }} />
            {COLS.map((col, ci) => <col key={ci} style={{ width: col.w }} />)}
          </colgroup>
          <thead>
            <tr>
              <th className="ms-th-chk">
                <input
                  type="checkbox"
                  checked={rows.length > 0 && rowSelected.size === rows.length}
                  onChange={toggleAllRows}
                  style={{ cursor: 'pointer' }}
                />
              </th>
              <th className="ms-th-num" />
              {COLS.map((col, ci) => <th key={ci}>{col.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={row._id} className={rowSelected.has(row._id) ? 'ms-row-selected' : ''}>
                <td className="ms-td-chk">
                  <input
                    type="checkbox"
                    checked={rowSelected.has(row._id)}
                    onChange={() => toggleRowSelect(row._id)}
                    style={{ cursor: 'pointer' }}
                  />
                </td>
                <td
                  className="ms-td-num"
                  onClick={() => {
                    if (editing) commit();
                    setAnchor({ r: ri, c: 0 }); setRngEnd({ r: ri, c: COLS.length - 1 });
                    wrapRef.current?.focus();
                  }}
                >
                  <span className="ms-row-num">{ri + 1}</span>
                  <button
                    className="ms-insert-btn"
                    onClick={e => { e.stopPropagation(); insertRowAfter(ri); }}
                    title="아래에 행 삽입"
                  >+</button>
                </td>
                {COLS.map((col, ci) => {
                  const isEdit   = editing?.r === ri && editing?.c === ci;
                  const autoLinked = cellIsAuto(ri, ci);
                  return (
                    <td
                      key={ci}
                      className={['ms-cell', inRange(ri, ci) ? 'sel' : '', isAnchor(ri, ci) && !editing ? 'anc' : '', autoLinked ? 'auto-price' : ''].filter(Boolean).join(' ')}
                      onClick={e => select(ri, ci, e.shiftKey)}
                      onDoubleClick={() => startEdit(ri, ci)}
                    >
                      {isEdit ? (
                        <input
                          ref={inputRef}
                          className="ms-cell-input"
                          value={editVal}
                          onChange={e => setEditVal(e.target.value)}
                          onKeyDown={handleInputKeyDown}
                          onBlur={() => commit()}
                        />
                      ) : (
                        <span className="ms-cell-val">
                          {row[col.key]}
                          {autoLinked && <span className="ms-auto-tag">자동</span>}
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="ms-hint">
        클릭 선택 · 더블클릭 편집 · Shift+클릭/방향키 범위 선택 · Ctrl+C 복사 · Ctrl+V 붙여넣기 · Delete 셀 지우기
      </div>
    </div>
  );
}
