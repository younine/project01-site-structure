import { useState, useEffect, useCallback } from 'react';

const COLUMNS = [
  { key: 'modelName',    label: '모델명',     width: 120 },
  { key: 'salePrice',    label: '판매가',     width: 100 },
  { key: 'hsCode',       label: 'HS코드',     width: 100 },
  { key: 'atozPrice',    label: '아토즈단가', width: 100 },
  { key: 'assacomPrice', label: '아싸컴단가', width: 100 },
  { key: 'miraclePrice', label: '미라클단가', width: 100 },
  { key: 'skuId',        label: 'SKUID',      width: 160 },
  { key: 'skuName',      label: 'SKUNAME',    width: 220 },
  { key: 'naverUrl',     label: '네이버URL',  width: 240 },
];

const EMPTY_ROW = () => ({
  id: Math.random().toString(36).slice(2),
  modelName: '', salePrice: '', hsCode: '',
  atozPrice: '', assacomPrice: '', miraclePrice: '',
  skuId: '', skuName: '', naverUrl: '',
});

// 엑셀 MROUND: 지정 배수로 반올림
function mround(value, multiple) {
  return Math.round(value / multiple) * multiple;
}

// 판매가로부터 3개 업체 공급가 계산
// isMugyeoljeom=true 이면 일반 행의 salePrice/miraclePrice 를 넘겨받아 무결점 미라클 단가 계산
function calcSupplyPrices(salePrice, ilbanSalePrice = null, ilbanMiraclePrice = null) {
  const p = Number(salePrice);
  if (!p || isNaN(p) || p <= 0) return null;

  const atozPrice     = mround(p * 0.92 - 2500, 500);
  const assacomPrice  = mround(p * 0.92, 500);
  const miraclePrice  = ilbanSalePrice !== null
    ? ilbanMiraclePrice + (p - Number(ilbanSalePrice))   // 무결점: 일반공급가 + (무결점판매가 - 일반판매가)
    : Math.round(p * 0.9 - 100);                          // 일반

  return {
    atozPrice:    String(atozPrice),
    assacomPrice: String(assacomPrice),
    miraclePrice: String(miraclePrice),
  };
}

// 전체 rows 를 순회하며 판매가 기준으로 공급가 일괄 재계산
function recalcPrices(rows) {
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
    id: Math.random().toString(36).slice(2),
    modelName:    vals[0] ?? '',
    salePrice:    vals[1] ?? '',
    hsCode:       vals[2] ?? '',
    atozPrice:    vals[3] ?? '',
    assacomPrice: vals[4] ?? '',
    miraclePrice: vals[5] ?? '',
    skuId:        vals[6] ?? '',
    skuName:      vals[7] ?? '',
    naverUrl:     vals[8] ?? '',
  };
}

function getToken() { return localStorage.getItem('auth_token'); }

export default function ProductSpreadsheet({ hasPermission }) {
  const [rows, setRows] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const isEditor = hasPermission('product_editor');

  useEffect(() => {
    fetch('/api/products', { headers: { Authorization: `Bearer ${getToken()}` } })
      .then(r => r.ok ? r.json() : { products: [] })
      .then(data => {
        setRows((data.products || []).map(p => ({
          id: Math.random().toString(36).slice(2), ...p,
        })));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMsg('');
    try {
      const products = rows.map(({ id, ...rest }) => rest);
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ products }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || '저장 실패');
      }
      setMsg('저장되었습니다.');
      setTimeout(() => setMsg(''), 3000);
    } catch (e) {
      setMsg(`오류: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

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

      const modelName      = row.modelName || '';
      const isIlban        = modelName.endsWith('_일반');
      const isMugyeoljeom  = modelName.endsWith('_무결점');

      return base.map(r => {
        if (r.id === rowId) {
          if (isMugyeoljeom) {
            const baseName  = modelName.slice(0, -4);
            const ilbanRow  = base.find(x => x.modelName === baseName + '_일반');
            const ilbanSaleP    = ilbanRow ? Number(ilbanRow.salePrice) || 0 : null;
            const ilbanMiracleP = ilbanRow ? Math.round((Number(ilbanRow.salePrice) || 0) * 0.9 - 100) : null;
            const derived = calcSupplyPrices(value, ilbanSaleP, ilbanMiracleP);
            return derived ? { ...r, ...derived } : r;
          }
          const derived = calcSupplyPrices(value);
          return derived ? { ...r, ...derived } : r;
        }

        // _일반 판매가 변경 시 → 짝이 되는 _무결점 행의 미라클단가만 갱신
        if (isIlban) {
          const baseName = modelName.slice(0, -3);
          if (r.modelName === baseName + '_무결점') {
            const ilbanSaleP    = Number(value) || 0;
            const ilbanMiracleP = Math.round(ilbanSaleP * 0.9 - 100);
            const mugyeoljeomSaleP = Number(r.salePrice) || 0;
            return { ...r, miraclePrice: String(ilbanMiracleP + (mugyeoljeomSaleP - ilbanSaleP)) };
          }
        }

        return r;
      });
    });
  }, []);

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

  // 셀 input에 직접 붙인 paste 핸들러 (document bubble보다 먼저 실행)
  const handleCellPaste = useCallback((e, rowIdx, colIdx) => {
    const text = e.clipboardData?.getData('text');
    if (!text) return;
    // 탭이나 줄바꿈이 없으면 단순 텍스트 → 기본 동작(단일 셀 입력) 허용
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
  }, []);

  // 표 바깥에서 Ctrl+V: 새 행으로 추가
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
  }, []);

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
      {/* 상단 고정 툴바 */}
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
            <button className="btn-sheet btn-save" onClick={handleSave} disabled={saving}>
              {saving ? '저장 중...' : '저장'}
            </button>
          )}
        </div>
      </div>

      {isEditor && (
        <div className="paste-hint">
          셀을 클릭해 선택 후 Ctrl+V: 해당 위치부터 탭·줄바꿈으로 파싱해 붙여넣기 | 표 바깥에서 Ctrl+V: 새 행으로 추가 —
          열 순서: 모델명 / 판매가 / HS코드 / 아토즈단가 / 아싸컴단가 / 미라클단가 / SKUID / SKUNAME / 네이버URL
        </div>
      )}

      {/* 스프레드시트 테이블 */}
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
              {isEditor && <th style={{ width: 34, background: 'var(--surface2)' }} />}
              {COLUMNS.map(c => (
                <th key={c.key} style={{ minWidth: c.width }}>{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={COLUMNS.length + (isEditor ? 1 : 0)} className="empty">
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
                  <td key={c.key}>
                    <input
                      type="text"
                      value={row[c.key]}
                      onChange={e => updateCell(row.id, c.key, e.target.value)}
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
