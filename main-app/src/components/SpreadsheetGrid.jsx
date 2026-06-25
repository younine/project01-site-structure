import { useRef, useCallback, useState } from 'react';

const COL_ALIASES = {
  '상품명':      ['상품명', '제품명', '품명', '상품 명'],
  '주문번호':    ['주문번호', '주문 번호', 'order'],
  '고객명':      ['고객명', '받는분', '수령인', '이름', '수취인'],
  '연락처':      ['연락처', '전화번호', '핸드폰', '휴대폰', '전화'],
  '주소':        ['주소', '배송지', '배송주소', '배송 주소'],
  '수량':        ['수량', 'qty', '수 량'],
  '우편번호':    ['우편번호', '우편 번호', 'zip', 'zipcode'],
  '모델코드':    ['모델코드', '모델 코드', 'model', 'sku', '모델번호'],
  '아싸컴단가':  ['아싸컴단가', '아싸컴 단가'],
  '미라클단가':  ['미라클단가', '미라클 단가'],
  '아토즈단가':  ['아토즈단가', '아토즈 단가', '공급가'],
  '판매가':      ['판매가', '판매 가', '소비자가', '정가'],
  'HS코드':      ['hs코드', 'hs code', 'hscode', 'hs_code'],
  '제품명':      ['제품명', '상품명', '품명', '제품 명'],
  '수취인명':    ['수취인명', '수령인', '받는분', '이름', '고객명'],
  '수취인연락처':['수취인연락처', '연락처', '전화번호', '핸드폰', '휴대폰'],
  '통합배송지':  ['통합배송지', '주소', '배송지', '배송주소', '배송 주소'],
  '업체명':      ['업체명', '업체 명', '회사명', '거래처'],
  '창고주소':    ['창고주소', '창고 주소', '주소', '배송지'],
};

function detectMapping(headerRow, expectedCols) {
  const mapping = new Array(expectedCols.length).fill(-1);
  headerRow.forEach((cell, colIdx) => {
    const clean = cell.trim().toLowerCase();
    expectedCols.forEach((expected, expectedIdx) => {
      if (mapping[expectedIdx] !== -1) return;
      const aliases = COL_ALIASES[expected] || [expected.toLowerCase()];
      if (aliases.some(a => clean.includes(a.toLowerCase()))) {
        mapping[expectedIdx] = colIdx;
      }
    });
  });
  return mapping;
}

function looksLikeHeader(row) {
  return row.some(cell => {
    const c = cell.trim().toLowerCase();
    return Object.values(COL_ALIASES).flat().some(alias => c.includes(alias.toLowerCase()));
  });
}

export default function SpreadsheetGrid({ columns, rows, onChange }) {
  const containerRef = useRef(null);
  const [focusedCell, setFocusedCell] = useState(null); // { ri, ci }

  const handlePaste = useCallback((e) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    const rawLines = text.split(/\r?\n/).filter(l => l.trim());
    if (!rawLines.length) return;

    const parsed = rawLines.map(l => l.split('\t').map(c => c.trim()));
    const firstRow = parsed[0];
    const isHeader = looksLikeHeader(firstRow);
    const mapping = isHeader ? detectMapping(firstRow, columns) : null;
    const dataLines = isHeader ? parsed.slice(1) : parsed;
    if (!dataLines.length) return;

    // 포커스된 셀 기준으로 붙여넣기 시작 위치 결정
    const startRow = focusedCell ? focusedCell.ri : 0;
    const startCol = focusedCell ? focusedCell.ci : 0;

    // 기존 행 복사 후 병합
    const merged = rows.map(r => [...r]);

    // 붙여넣을 범위만큼 행이 부족하면 확장
    const endRow = startRow + dataLines.length;
    while (merged.length < endRow) {
      merged.push(columns.map(() => ''));
    }

    dataLines.forEach((rawRow, di) => {
      const ri = startRow + di;
      const updatedRow = [...(merged[ri] || columns.map(() => ''))];

      if (mapping) {
        // 헤더 감지 시: 컬럼 매핑 적용 (startCol 무시, 전체 컬럼 기준)
        columns.forEach((_, ci) => {
          const srcIdx = mapping[ci];
          if (srcIdx >= 0) updatedRow[ci] = rawRow[srcIdx] || '';
        });
      } else {
        // 헤더 없음: 포커스 컬럼부터 순서대로 덮어쓰기
        rawRow.forEach((cell, ci) => {
          const targetCol = startCol + ci;
          if (targetCol < columns.length) updatedRow[targetCol] = cell;
        });
      }

      merged[ri] = updatedRow;
    });

    onChange(merged.length ? merged : [columns.map(() => '')]);
  }, [columns, rows, onChange, focusedCell]);

  const handleCellChange = (ri, ci, value) => {
    const next = rows.map((r, i) =>
      i === ri ? r.map((c, j) => (j === ci ? value : c)) : r
    );
    onChange(next);
  };

  const addRow = () => onChange([...rows, columns.map(() => '')]);

  const removeRow = (ri) => {
    const next = rows.filter((_, i) => i !== ri);
    onChange(next.length ? next : [columns.map(() => '')]);
  };

  return (
    <div className="grid-container" ref={containerRef} onPaste={handlePaste} tabIndex={0}>
      <div className="grid-hint">엑셀에서 복사 후 셀 클릭 → Ctrl+V — 해당 위치부터 붙여넣기 (첫 행이 헤더면 컬럼 자동 매핑)</div>
      <div className="grid-scroll">
        <table className="grid-table">
          <thead>
            <tr>
              <th className="grid-num">#</th>
              {columns.map((col, i) => <th key={i}>{col}</th>)}
              <th className="grid-del" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri}>
                <td className="grid-num">{ri + 1}</td>
                {columns.map((_, ci) => (
                  <td key={ci}>
                    <input
                      value={row[ci] || ''}
                      onChange={e => handleCellChange(ri, ci, e.target.value)}
                      onFocus={() => setFocusedCell({ ri, ci })}
                    />
                  </td>
                ))}
                <td className="grid-del">
                  <button className="btn-del" onClick={() => removeRow(ri)}>×</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button className="btn-add-row" onClick={addRow}>+ 행 추가</button>
    </div>
  );
}
