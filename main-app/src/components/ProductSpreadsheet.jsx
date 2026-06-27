import { useState, useEffect, useCallback } from 'react';

const PRICE_KEYS = new Set(['salePrice', 'atozPrice', 'assacomPrice', 'miraclePrice']);

function fmtPrice(val) {
  const n = Number(String(val).replace(/,/g, ''));
  if (!val || isNaN(n) || n === 0) return val;
  return n.toLocaleString('ko-KR');
}

function stripComma(val) {
  return String(val).replace(/,/g, '');
}

const COLUMNS = [
  { key: 'modelName',    label: '모델명',     width: 200 },
  { key: 'salePrice',    label: '판매가',     width: 100 },
  { key: 'hsCode',       label: 'HS코드',     width: 100 },
  { key: 'atozPrice',    label: '아토즈단가', width: 100 },
  { key: 'assacomPrice', label: '아싸컴단가', width: 100 },
  { key: 'miraclePrice', label: '미라클단가', width: 100 },
];

export const EMPTY_ROW = () => ({
  id: Math.random().toString(36).slice(2),
  modelName: '', salePrice: '', hsCode: '',
  atozPrice: '', assacomPrice: '', miraclePrice: '',
  skuId: '',
  naverCode: '', gmarketCode: '', auctionCode: '', elevenCode: '',
  himartCode: '', lotteCode: '', ssgCode: '', odCode: '',
  kakaoCode: '', compuzoneCode: '',
});

function mround(value, multiple) {
  return Math.round(value / multiple) * multiple;
}

function calcSupplyPrices(salePrice, ilbanSalePrice = null, ilbanMiraclePrice = null) {
  const p = Number(salePrice);
  if (!p || isNaN(p) || p <= 0) return null;

  const atozPrice    = mround(p * 0.92 - 2500, 500);
  const assacomPrice = mround(p * 0.92, 500);
  const miraclePrice = ilbanSalePrice !== null
    ? ilbanMiraclePrice + (p - Number(ilbanSalePrice))
    : Math.round(p * 0.9 - 100);

  return {
    atozPrice:    String(atozPrice),
    assacomPrice: String(assacomPrice),
    miraclePrice: String(miraclePrice),
  };
}

export function recalcPrices(rows) {
  return rows.map(row => {
    const p = Number(row.salePrice);
    if (!p || isNaN(p) || p <= 0) return row;
    const modelName     = row.modelName || '';
    const isMugyeoljeom = modelName.endsWith('_무결점');
    let derived;
    if (isMugyeoljeom) {
      const baseName      = modelName.slice(0, -4);
      const ilbanRow      = rows.find(r => r.modelName === baseName + '_일반');
      const ilbanSaleP    = ilbanRow ? Number(ilbanRow.salePrice) || 0 : null;
      const ilbanMiracleP = ilbanSaleP !== null ? Math.round(ilbanSaleP * 0.9 - 100) : null;
      derived = calcSupplyPrices(p, ilbanSaleP, ilbanMiracleP);
    } else {
      derived = calcSupplyPrices(p);
    }
    return derived ? { ...row, ...derived } : row;
  });
}

function makeRowFromValues(vals = []) {
  return {
    ...EMPTY_ROW(),
    modelName:    vals[0] ?? '',
    salePrice:    vals[1] ?? '',
    hsCode:       vals[2] ?? '',
    atozPrice:    vals[3] ?? '',
    assacomPrice: vals[4] ?? '',
    miraclePrice: vals[5] ?? '',
  };
}

function fallbackCopy(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.cssText = 'position:fixed;opacity:0;pointer-events:none;';
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand('copy'); } catch {}
  document.body.removeChild(ta);
}

export default function ProductSpreadsheet({ rows, setRows, loading, saving, msg, onSave, hasPermission }) {
  const [selected, setSelected] = useState(new Set());
  const [cellSel, setCellSel] = useState(null); // { startRow, startCol, endRow, endCol }
  const [isDragging, setIsDragging] = useState(false);
  const isEditor = hasPermission('product_editor');

  // 정규화된 선택 범위 (단일 셀이거나 선택 없으면 null)
  const selRange = (() => {
    if (!cellSel) return null;
    const { startRow, startCol, endRow, endCol } = cellSel;
    const minRow = Math.min(startRow, endRow), maxRow = Math.max(startRow, endRow);
    const minCol = Math.min(startCol, endCol), maxCol = Math.max(startCol, endCol);
    if (minRow === maxRow && minCol === maxCol) return null;
    return { minRow, maxRow, minCol, maxCol };
  })();

  const isCellInSel = (rowIdx, colIdx) => {
    if (!selRange) return false;
    return rowIdx >= selRange.minRow && rowIdx <= selRange.maxRow &&
           colIdx >= selRange.minCol && colIdx <= selRange.maxCol;
  };

  const handleCellMouseDown = (rowIdx, colIdx) => {
    setIsDragging(true);
    setCellSel({ startRow: rowIdx, startCol: colIdx, endRow: rowIdx, endCol: colIdx });
  };

  // mouseenter는 버튼을 누른 채 드래그 시 발생하지 않으므로
  // document mousemove + elementFromPoint 방식으로 현재 셀 추적
  useEffect(() => {
    if (!isDragging) return;
    const handleMouseMove = (e) => {
      const el = document.elementFromPoint(e.clientX, e.clientY);
      if (!el) return;
      const td = el.closest('td[data-row]');
      if (!td) return;
      const row = parseInt(td.dataset.row, 10);
      const col = parseInt(td.dataset.col, 10);
      if (isNaN(row) || isNaN(col)) return;
      setCellSel(prev => {
        if (!prev || (prev.endRow === row && prev.endCol === col)) return prev;
        return { ...prev, endRow: row, endCol: col };
      });
    };
    document.addEventListener('mousemove', handleMouseMove);
    return () => document.removeEventListener('mousemove', handleMouseMove);
  }, [isDragging]);

  // 드래그 종료: 단일 셀 클릭이면 선택 해제
  useEffect(() => {
    const handleMouseUp = () => {
      if (!isDragging) return;
      setIsDragging(false);
      setCellSel(prev => {
        if (!prev) return null;
        if (prev.startRow === prev.endRow && prev.startCol === prev.endCol) return null;
        return prev;
      });
    };
    document.addEventListener('mouseup', handleMouseUp);
    return () => document.removeEventListener('mouseup', handleMouseUp);
  }, [isDragging]);

  // Ctrl+C: 선택된 셀 범위를 탭/줄바꿈 형식으로 클립보드에 복사
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!(e.ctrlKey || e.metaKey) || e.key !== 'c') return;
      if (!cellSel) return;
      const { startRow, startCol, endRow, endCol } = cellSel;
      if (startRow === endRow && startCol === endCol) return;
      // 입력창에서 텍스트를 직접 선택한 경우엔 기본 복사 허용
      const ae = document.activeElement;
      if (ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA') &&
          ae.selectionStart !== ae.selectionEnd) return;
      e.preventDefault();
      const minRow = Math.min(startRow, endRow), maxRow = Math.max(startRow, endRow);
      const minCol = Math.min(startCol, endCol), maxCol = Math.max(startCol, endCol);
      const lines = [];
      for (let r = minRow; r <= maxRow; r++) {
        const cols = [];
        for (let c = minCol; c <= maxCol; c++) {
          const key = COLUMNS[c].key;
          const val = PRICE_KEYS.has(key) ? fmtPrice(rows[r]?.[key]) : (rows[r]?.[key] ?? '');
          cols.push(String(val));
        }
        lines.push(cols.join('\t'));
      }
      const text = lines.join('\n');
      if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
      } else {
        fallbackCopy(text);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [cellSel, rows]);

  const addRow = () => setRows(prev => [...prev, EMPTY_ROW()]);

  const insertRowAfter = (idx) => {
    setRows(prev => {
      const next = [...prev];
      next.splice(idx + 1, 0, EMPTY_ROW());
      return next;
    });
  };

  const deleteSelected = () => {
    setRows(prev => prev.filter(r => !selected.has(r.id)));
    setSelected(new Set());
  };

  const updateCell = useCallback((rowId, key, value) => {
    setRows(prev => {
      const base = prev.map(r => r.id === rowId ? { ...r, [key]: value } : r);
      if (key !== 'salePrice') return base;

      const row = base.find(r => r.id === rowId);
      if (!row) return base;

      const modelName     = row.modelName || '';
      const isIlban       = modelName.endsWith('_일반');
      const isMugyeoljeom = modelName.endsWith('_무결점');

      return base.map(r => {
        if (r.id === rowId) {
          if (isMugyeoljeom) {
            const baseName      = modelName.slice(0, -4);
            const ilbanRow      = base.find(x => x.modelName === baseName + '_일반');
            const ilbanSaleP    = ilbanRow ? Number(ilbanRow.salePrice) || 0 : null;
            const ilbanMiracleP = ilbanRow ? Math.round((Number(ilbanRow.salePrice) || 0) * 0.9 - 100) : null;
            const derived = calcSupplyPrices(value, ilbanSaleP, ilbanMiracleP);
            return derived ? { ...r, ...derived } : r;
          }
          const derived = calcSupplyPrices(value);
          return derived ? { ...r, ...derived } : r;
        }
        if (isIlban) {
          const baseName = modelName.slice(0, -3);
          if (r.modelName === baseName + '_무결점') {
            const ilbanSaleP       = Number(value) || 0;
            const ilbanMiracleP    = Math.round(ilbanSaleP * 0.9 - 100);
            const mugyeoljeomSaleP = Number(r.salePrice) || 0;
            return { ...r, miraclePrice: String(ilbanMiracleP + (mugyeoljeomSaleP - ilbanSaleP)) };
          }
        }
        return r;
      });
    });
  }, [setRows]);

  const handleCellPaste = useCallback((e, rowIdx, colIdx) => {
    const text = e.clipboardData?.getData('text');
    if (!text) return;
    if (!text.includes('\t') && !text.includes('\n')) return;
    e.preventDefault();
    const lines = text.split('\n').map(l => l.replace(/\r$/, ''));
    while (lines.length > 0 && lines[lines.length - 1] === '') lines.pop();
    const pastedGrid = lines.map(l => l.split('\t'));
    setRows(prev => {
      const next = prev.map(r => ({ ...r }));
      pastedGrid.forEach((cols, ri) => {
        const tRow = rowIdx + ri;
        while (next.length <= tRow) next.push(EMPTY_ROW());
        cols.forEach((val, ci) => {
          const tCol = colIdx + ci;
          if (tCol < COLUMNS.length) next[tRow][COLUMNS[tCol].key] = val;
        });
      });
      return recalcPrices(next);
    });
  }, [setRows]);

  useEffect(() => {
    const handlePaste = (e) => {
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      const text = e.clipboardData?.getData('text');
      if (!text) return;
      e.preventDefault();
      const newRows = text
        .split('\n')
        .map(l => l.replace(/\r$/, ''))
        .filter(l => l.trim())
        .map(l => makeRowFromValues(l.split('\t')));
      if (newRows.length > 0) setRows(prev => recalcPrices([...prev, ...newRows]));
    };
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [setRows]);

  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === rows.length && rows.length > 0) setSelected(new Set());
    else setSelected(new Set(rows.map(r => r.id)));
  };

  const exportExcel = () => {
    const headers = COLUMNS.map(c => c.label);
    const csvRows = rows.map(r =>
      COLUMNS.map(c => {
        const v = String(r[c.key] ?? '');
        return `"${v.replace(/"/g, '""')}"`;
      }).join(',')
    );
    const bom = '﻿';
    const blob = new Blob([bom + [headers.join(','), ...csvRows].join('\n')], {
      type: 'text/csv;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `products_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="product-sheet">
        <div className="empty">불러오는 중...</div>
      </div>
    );
  }

  return (
    <div className="product-sheet">
      <div className="sheet-toolbar">
        <div className="sheet-toolbar-left">
          <span className="sheet-title">제품 정보</span>
          <span className="sheet-count">{rows.length}행</span>
          {msg && (
            <span className={`sheet-msg${msg.startsWith('오류') ? ' sheet-msg-err' : ''}`}>
              {msg}
            </span>
          )}
        </div>
        <div className="sheet-toolbar-right">
          {isEditor && (
            <button className="btn-sheet btn-add" onClick={addRow}>+ 행 추가</button>
          )}
          {isEditor && (
            <button
              className="btn-sheet btn-del"
              onClick={deleteSelected}
              disabled={selected.size === 0}
            >
              선택 삭제{selected.size > 0 ? ` (${selected.size})` : ''}
            </button>
          )}
          <button className="btn-sheet btn-export" onClick={exportExcel}>
            엑셀 내보내기
          </button>
          {isEditor && (
            <button className="btn-sheet btn-save" onClick={() => onSave(rows)} disabled={saving}>
              {saving ? '저장 중...' : '저장'}
            </button>
          )}
        </div>
      </div>

      {isEditor && (
        <div className="paste-hint">
          셀 드래그로 범위 선택 후 Ctrl+C: 탭·줄바꿈 형식으로 클립보드 복사 (엑셀 붙여넣기 가능) |
          셀 클릭 후 Ctrl+V: 해당 위치부터 붙여넣기 | 표 바깥 Ctrl+V: 새 행 추가 —
          열 순서: 모델명 / 판매가 / HS코드 / 아토즈단가 / 아싸컴단가 / 미라클단가
        </div>
      )}

      <div className={`sheet-wrap${isDragging ? ' is-dragging' : ''}`}>
        <table className="sheet-table">
          <thead>
            <tr>
              {isEditor && (
                <th style={{ width: 36, textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    checked={rows.length > 0 && selected.size === rows.length}
                    onChange={toggleAll}
                    style={{ cursor: 'pointer' }}
                  />
                </th>
              )}
              {isEditor && <th style={{ width: 34, background: 'var(--surface2)' }} />}
              {COLUMNS.map(c => (
                <th key={c.key} style={{ minWidth: c.width }}>{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={COLUMNS.length + (isEditor ? 2 : 0)} className="empty">
                  데이터가 없습니다.{isEditor && ' 행 추가 버튼을 누르거나 Ctrl+V로 엑셀 데이터를 붙여넣으세요.'}
                </td>
              </tr>
            ) : rows.map((row, rowIdx) => (
              <tr key={row.id} className={selected.has(row.id) ? 'row-selected' : ''}>
                {isEditor && (
                  <td style={{ textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={selected.has(row.id)}
                      onChange={() => toggleSelect(row.id)}
                      style={{ cursor: 'pointer' }}
                    />
                  </td>
                )}
                {isEditor && (
                  <td className="sheet-td-num">
                    <span className="sheet-row-num">{rowIdx + 1}</span>
                    <button
                      className="sheet-insert-btn"
                      onClick={() => insertRowAfter(rowIdx)}
                      title="아래에 행 삽입"
                    >+</button>
                  </td>
                )}
                {COLUMNS.map((c, colIdx) => (
                  <td
                    key={c.key}
                    data-row={rowIdx}
                    data-col={colIdx}
                    onMouseDown={() => handleCellMouseDown(rowIdx, colIdx)}
                    className={isCellInSel(rowIdx, colIdx) ? 'cell-in-sel' : undefined}
                  >
                    <input
                      type="text"
                      value={PRICE_KEYS.has(c.key) ? fmtPrice(row[c.key]) : (row[c.key] ?? '')}
                      onChange={e => updateCell(row.id, c.key, PRICE_KEYS.has(c.key) ? stripComma(e.target.value) : e.target.value)}
                      onPaste={isEditor ? (e) => handleCellPaste(e, rowIdx, colIdx) : undefined}
                      className="cell-input"
                      readOnly={!isEditor}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
