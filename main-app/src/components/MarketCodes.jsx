import { useState, useCallback } from 'react';
import { EMPTY_ROW } from './ProductSpreadsheet';

const MARKET_COLUMNS = [
  { key: 'modelName',     label: '모델명',     width: 200 },
  { key: 'salePrice',     label: '판매가',     width: 90 },
  { key: 'skuId',         label: 'SKUID',      width: 160 },
  { key: 'naverCode',     label: '네이버',     width: 130 },
  { key: 'catalogCode',   label: '카탈로그',   width: 130 },
  { key: 'gmarketCode',   label: '지마켓',     width: 130 },
  { key: 'auctionCode',   label: '옥션',       width: 130 },
  { key: 'gmarketAnyCode',label: '지마켓any',  width: 130 },
  { key: 'auctionAnyCode',label: '옥션any',    width: 130 },
  { key: 'elevenCode',    label: '11번가',     width: 130 },
  { key: 'himartCode',    label: '하이마트',   width: 130 },
  { key: 'lotteCode',     label: '롯데온',     width: 130 },
  { key: 'ssgCode',       label: 'SSG',        width: 130 },
  { key: 'aliCode',       label: '알리',       width: 130 },
  { key: 'odCode',        label: '오늘의집',   width: 130 },
  { key: 'kakaoCode',     label: '카카오',     width: 130 },
  { key: 'compuzoneCode', label: '컴퓨존',     width: 130 },
  { key: 'coupangItemId', label: '쿠팡아이템id', width: 160 },
];

const SHARED_KEYS = new Set(['modelName', 'salePrice']);

function fmtPrice(val) {
  const n = Number(String(val).replace(/,/g, ''));
  if (!val || isNaN(n) || n === 0) return val;
  return n.toLocaleString('ko-KR');
}

export default function MarketCodes({ rows, setRows, loading, saving, msg, onSave, hasPermission }) {
  const [selected, setSelected] = useState(new Set());
  const isEditor = hasPermission('product_editor');

  const updateCell = useCallback((rowId, key, value) => {
    setRows(prev => prev.map(r => r.id === rowId ? { ...r, [key]: value } : r));
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
          if (tCol < MARKET_COLUMNS.length) next[tRow][MARKET_COLUMNS[tCol].key] = val;
        });
      });
      return next;
    });
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
    const headers = MARKET_COLUMNS.map(c => c.label);
    const csvRows = rows.map(r =>
      MARKET_COLUMNS.map(c => {
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
    a.download = `market-codes_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importExcel = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target.result;
      const lines = text.split('\n').map(l => l.replace(/\r$/, '')).filter(l => l.trim());
      if (lines.length < 2) return;
      const headers = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim());
      const keyMap = {};
      MARKET_COLUMNS.forEach(c => {
        const idx = headers.indexOf(c.label);
        if (idx >= 0) keyMap[c.key] = idx;
      });
      const newCodes = {};
      lines.slice(1).forEach(line => {
        const cols = line.split(',').map(v => v.replace(/^"|"$/g, ''));
        const modelName = cols[keyMap['modelName'] ?? 0]?.trim();
        if (!modelName) return;
        newCodes[modelName] = {};
        Object.entries(keyMap).forEach(([key, idx]) => {
          if (key !== 'modelName' && key !== 'salePrice') {
            newCodes[modelName][key] = cols[idx] ?? '';
          }
        });
      });
      setRows(prev => prev.map(r => {
        const updates = newCodes[r.modelName];
        return updates ? { ...r, ...updates } : r;
      }));
    };
    reader.readAsText(file, 'utf-8');
    e.target.value = '';
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
          <span className="sheet-title">마켓 코드</span>
          <span className="sheet-count">{rows.length}행</span>
          {msg && (
            <span className={`sheet-msg${msg.startsWith('오류') ? ' sheet-msg-err' : ''}`}>
              {msg}
            </span>
          )}
        </div>
        <div className="sheet-toolbar-right">
          <button className="btn-sheet btn-export" onClick={exportExcel}>
            엑셀 내보내기
          </button>
          {isEditor && (
            <label className="btn-sheet btn-import" style={{ cursor: 'pointer' }}>
              엑셀 가져오기
              <input type="file" accept=".csv" onChange={importExcel} style={{ display: 'none' }} />
            </label>
          )}
          {isEditor && (
            <button className="btn-sheet btn-save" onClick={() => onSave(rows)} disabled={saving}>
              {saving ? '저장 중...' : '저장'}
            </button>
          )}
        </div>
      </div>

      {isEditor && (
        <div className="paste-hint">
          모델명·판매가는 제품 정보 탭에서 관리됩니다. 마켓 코드는 셀 직접 입력 또는 CSV 가져오기로 일괄 업로드 가능합니다.
        </div>
      )}

      <div className="sheet-wrap">
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
              {MARKET_COLUMNS.map(c => (
                <th key={c.key} style={{ minWidth: c.width }}>{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={MARKET_COLUMNS.length + (isEditor ? 1 : 0)} className="empty">
                  제품 정보 탭에서 모델을 추가하면 여기에 표시됩니다.
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
                {MARKET_COLUMNS.map((c, colIdx) => {
                  const isShared = SHARED_KEYS.has(c.key);
                  return (
                    <td key={c.key} style={isShared ? { background: 'var(--surface2)' } : undefined}>
                      <input
                        type="text"
                        value={c.key === 'salePrice' ? fmtPrice(row[c.key]) : (row[c.key] ?? '')}
                        onChange={e => !isShared && updateCell(row.id, c.key, e.target.value)}
                        onPaste={(isEditor && !isShared) ? (e) => handleCellPaste(e, rowIdx, colIdx) : undefined}
                        className="cell-input"
                        readOnly={!isEditor || isShared}
                        style={isShared ? { color: 'var(--text3)' } : undefined}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
