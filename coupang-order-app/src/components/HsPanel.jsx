import { useState, useEffect, useRef } from 'react';
import './HsPanel.css';

const COLS = [
  { label: 'SKU코드', key: 'sku',   w: 120 },
  { label: '상품명',  key: 'name',  w: 160 },
  { label: 'HS코드',  key: 'hs',    w: 110 },
  { label: '단가',    key: 'price', w:  80 },
];

let _uid = 0;
const nextId  = () => ++_uid;
const emptyRow = () => ({ _id: nextId(), sku: '', name: '', hs: '', price: '' });

function mapToRows(map) {
  const rows = Object.entries(map).map(([sku, v]) => ({
    _id: nextId(),
    sku,
    name:  typeof v === 'object' ? (v.name  ?? '') : '',
    hs:    typeof v === 'object' ? (v.hs    ?? '') : (typeof v === 'string' ? v : ''),
    price: typeof v === 'object' ? (v.price ?? '') : '',
  }));
  return rows.length > 0 ? rows : [emptyRow()];
}

function rowsToMap(rows) {
  const m = {};
  for (const r of rows) {
    const sku = String(r.sku ?? '').trim();
    if (!sku) continue;
    m[sku] = {
      name:  String(r.name  ?? '').trim(),
      hs:    String(r.hs    ?? '').trim(),
      price: String(r.price ?? '').trim(),
    };
  }
  return m;
}

export default function HsPanel({ hsMap, hsSource, onSave, onClose }) {
  const [rows,    setRows]    = useState(() => mapToRows(hsMap));
  const [anchor,  setAnchor]  = useState(null); // { r, c }
  const [rngEnd,  setRngEnd]  = useState(null); // { r, c }
  const [editing, setEditing] = useState(null); // { r, c }
  const [editVal, setEditVal] = useState('');
  const [saving,  setSaving]  = useState(false);
  const [msg,     setMsg]     = useState(null);
  const wrapRef  = useRef();
  const inputRef = useRef();

  useEffect(() => {
    setRows(mapToRows(hsMap));
    setAnchor(null); setRngEnd(null); setEditing(null);
  }, [hsMap]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  /* ── 범위 헬퍼 ── */
  const getRange = () => {
    if (!anchor) return null;
    const e = rngEnd ?? anchor;
    return {
      r1: Math.min(anchor.r, e.r), r2: Math.max(anchor.r, e.r),
      c1: Math.min(anchor.c, e.c), c2: Math.max(anchor.c, e.c),
    };
  };
  const inRange  = (r, c) => { const g = getRange(); return g ? r>=g.r1&&r<=g.r2&&c>=g.c1&&c<=g.c2 : false; };
  const isAnchor = (r, c) => anchor?.r === r && anchor?.c === c;

  /* ── 편집 커밋 ── */
  const commit = (r, c, v) => {
    // r/c/v: 명시적으로 넘기면 그 값, 없으면 현재 editing state 사용
    const er = r ?? editing?.r;
    const ec = c ?? editing?.c;
    const ev = v ?? editVal;
    if (er == null || ec == null) return;
    setRows(prev => prev.map((x, i) => i === er ? { ...x, [COLS[ec].key]: ev } : x));
    setEditing(null);
  };

  /* ── 셀 선택 ── */
  const select = (r, c, extend = false) => {
    if (editing) commit();
    if (extend && anchor) { setRngEnd({ r, c }); }
    else { setAnchor({ r, c }); setRngEnd({ r, c }); }
    wrapRef.current?.focus();
  };

  /* ── 편집 시작 ── */
  const startEdit = (r, c, init = null) => {
    if (editing) commit();
    setEditing({ r, c });
    setEditVal(init ?? String(rows[r]?.[COLS[c].key] ?? ''));
    setAnchor({ r, c }); setRngEnd({ r, c });
  };

  /* ── 이동 ── */
  const move = (dr, dc, extend = false) => {
    const cur = rngEnd ?? anchor;
    if (!cur) return;
    const nr = Math.max(0, Math.min(rows.length - 1, cur.r + dr));
    const nc = Math.max(0, Math.min(COLS.length  - 1, cur.c + dc));
    if (extend) { setRngEnd({ r: nr, c: nc }); }
    else        { setAnchor({ r: nr, c: nc }); setRngEnd({ r: nr, c: nc }); }
  };

  /* ── 복사 ── */
  const doCopy = () => {
    const g = getRange();
    if (!g) return;
    const text = rows.slice(g.r1, g.r2 + 1)
      .map(row => COLS.slice(g.c1, g.c2 + 1).map(col => row[col.key] ?? '').join('\t'))
      .join('\n');
    navigator.clipboard.writeText(text).catch(() => {});
  };

  /* ── 래퍼 키보드 (편집 외) ── */
  const handleWrapKeyDown = (e) => {
    if (editing) return;
    if (!anchor)  return;
    const ctrl = e.ctrlKey || e.metaKey;
    if (ctrl && e.key === 'c') { e.preventDefault(); doCopy(); return; }
    if (ctrl) return;

    const cur = rngEnd ?? anchor;
    switch (e.key) {
      case 'ArrowUp':    e.preventDefault(); move(-1,  0, e.shiftKey); break;
      case 'ArrowDown':  e.preventDefault(); move( 1,  0, e.shiftKey); break;
      case 'ArrowLeft':  e.preventDefault(); move( 0, -1, e.shiftKey); break;
      case 'ArrowRight': e.preventDefault(); move( 0,  1, e.shiftKey); break;
      case 'Enter':      e.preventDefault(); startEdit(cur.r, cur.c); break;
      case 'Tab':
        e.preventDefault();
        e.shiftKey ? move(0, -1) : move(0, 1);
        break;
      case 'Delete':
      case 'Backspace': {
        e.preventDefault();
        const g = getRange();
        if (!g) break;
        setRows(prev => prev.map((row, ri) => {
          if (ri < g.r1 || ri > g.r2) return row;
          const next = { ...row };
          for (let ci = g.c1; ci <= g.c2; ci++) next[COLS[ci].key] = '';
          return next;
        }));
        break;
      }
      default:
        if (e.key.length === 1) { e.preventDefault(); startEdit(cur.r, cur.c, e.key); }
    }
  };

  /* ── 인풋 키보드 ── */
  const handleInputKeyDown = (e) => {
    e.stopPropagation();
    if (!editing) return;
    const { r, c } = editing;

    if (e.key === 'Escape') {
      e.preventDefault();
      setEditing(null);
      wrapRef.current?.focus();
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
      if (nc >= 0 && nc < COLS.length) {
        setAnchor({ r, c: nc }); setRngEnd({ r, c: nc });
      } else if (!e.shiftKey && r < rows.length - 1) {
        setAnchor({ r: r + 1, c: 0 }); setRngEnd({ r: r + 1, c: 0 });
      }
      wrapRef.current?.focus();
    }
  };

  /* ── 붙여넣기 ── */
  const handlePaste = (e) => {
    e.preventDefault();
    if (!anchor) return;
    const grid = e.clipboardData.getData('text')
      .replace(/\r\n/g, '\n').replace(/\r/g, '\n')
      .trimEnd()
      .split('\n')
      .map(line => line.split('\t'));

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

  const deleteSelected = () => {
    const g = getRange();
    if (!g) return;
    setRows(prev => {
      const next = prev.filter((_, i) => i < g.r1 || i > g.r2);
      return next.length > 0 ? next : [emptyRow()];
    });
    setAnchor(null); setRngEnd(null);
    wrapRef.current?.focus();
  };

  /* ── 저장 ── */
  const handleSave = async () => {
    // 편집 중이면 현재 값 반영
    let finalRows = rows;
    if (editing) {
      finalRows = rows.map((x, i) =>
        i === editing.r ? { ...x, [COLS[editing.c].key]: editVal } : x
      );
      setRows(finalRows);
      setEditing(null);
    }
    setSaving(true); setMsg(null);
    try {
      const map   = rowsToMap(finalRows);
      const saved = await onSave(map);
      setMsg({ type: 'ok', text: `✓ ${saved}개 SKU 서버에 저장됐습니다` });
    } catch (err) {
      setMsg({ type: 'err', text: `오류: ${err.message}` });
    } finally {
      setSaving(false);
    }
  };

  const skuCount = rows.filter(r => String(r.sku).trim()).length;

  return (
    <>
      <div className="hs-backdrop" onClick={onClose} />
      <div className="hs-panel">

        <div className="hs-panel-header">
          <span style={{ fontSize: 18 }}>📋</span>
          <div className="hs-panel-title">HS코드 관리</div>
          <span className={`hs-stat-badge ${hsSource === 'server' ? 'server' : 'none'}`}>
            {hsSource === 'server' ? '서버 등록' : '미저장'}
          </span>
          <button className="hs-panel-close" onClick={onClose}>✕</button>
        </div>

        <div className="hs-toolbar">
          <button className="hs-btn" onClick={addRow}>+ 행 추가</button>
          <button className="hs-btn danger" onClick={deleteSelected} disabled={!anchor}>선택 삭제</button>
          <div className="hs-toolbar-gap" />
          <span className="hs-count">{skuCount}개</span>
          <button className="hs-save-btn" onClick={handleSave} disabled={saving}>
            {saving ? '저장 중...' : '서버에 저장'}
          </button>
        </div>

        {msg && <div className={`hs-msg ${msg.type}`}>{msg.text}</div>}

        <div
          className="hs-sheet-wrap"
          ref={wrapRef}
          tabIndex={0}
          onKeyDown={handleWrapKeyDown}
          onPaste={handlePaste}
        >
          <table className="hs-sheet">
            <colgroup>
              <col style={{ width: 34 }} />
              {COLS.map((col, ci) => <col key={ci} style={{ width: col.w }} />)}
            </colgroup>
            <thead>
              <tr>
                <th className="hs-th-num" />
                {COLS.map((col, ci) => <th key={ci}>{col.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => (
                <tr key={row._id}>
                  <td
                    className="hs-td-num"
                    onClick={() => {
                      if (editing) commit();
                      setAnchor({ r: ri, c: 0 });
                      setRngEnd({ r: ri, c: COLS.length - 1 });
                      wrapRef.current?.focus();
                    }}
                  >{ri + 1}</td>
                  {COLS.map((col, ci) => {
                    const isEdit = editing?.r === ri && editing?.c === ci;
                    return (
                      <td
                        key={ci}
                        className={[
                          'hs-cell',
                          inRange(ri, ci)      ? 'sel' : '',
                          isAnchor(ri, ci) && !editing ? 'anc' : '',
                        ].filter(Boolean).join(' ')}
                        onClick={e => select(ri, ci, e.shiftKey)}
                        onDoubleClick={() => startEdit(ri, ci)}
                      >
                        {isEdit ? (
                          <input
                            ref={inputRef}
                            className="hs-cell-input"
                            value={editVal}
                            onChange={e => setEditVal(e.target.value)}
                            onKeyDown={handleInputKeyDown}
                            onBlur={() => commit()}
                          />
                        ) : (
                          <span className="hs-cell-val">{row[col.key]}</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="hs-sheet-hint">
          클릭 선택 · 더블클릭 편집 · Ctrl+C 복사 · Ctrl+V 붙여넣기 · Delete 셀 지우기
        </div>
      </div>
    </>
  );
}
