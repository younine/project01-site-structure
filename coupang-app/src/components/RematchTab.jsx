function profitColor(rate) {
  if (rate >= 15) return '#16a34a';
  if (rate >= 5)  return '#d97706';
  return '#dc2626';
}

function profitBg(rate) {
  if (rate >= 15) return '#dcfce7';
  if (rate >= 5)  return '#fef3c7';
  return '#fee2e2';
}

function calcProfit(currentPrice, supplyPrice, originalSalePrice) {
  if (!originalSalePrice) return null;
  return ((currentPrice - supplyPrice) / originalSalePrice) * 100;
}

function downloadCSV(rows) {
  const headers = ['SKUID', 'SKUNAME', '현재가', '공급가', '이익률(%)', '정상판매가', '네이버URL'];
  const data = rows.map(r => {
    const rate = calcProfit(r.currentPrice, r.supplyPrice, r.originalSalePrice);
    return [
      r.skuid, r.skuname,
      r.currentPrice, r.supplyPrice,
      rate != null ? rate.toFixed(1) : '',
      r.originalSalePrice, r.naverUrl,
    ];
  });
  const csv = [headers, ...data].map(row =>
    row.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')
  ).join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'rematch.csv'; a.click();
  URL.revokeObjectURL(url);
}

export default function RematchTab({ items }) {
  if (!items.length) {
    return <div style={s.empty}>현재가가 정상판매가보다 낮은 상품이 없습니다.</div>;
  }

  return (
    <div>
      <div style={s.topBar}>
        <span style={s.filterInfo}>현재가 &lt; 정상판매가 &nbsp;·&nbsp; {items.length}건</span>
        <button style={s.csvBtn} onClick={() => downloadCSV(items)}>
          ↓ CSV 저장
        </button>
      </div>
      <div style={s.tableWrap}>
        <table style={s.table}>
          <thead>
            <tr>
              {['SKUID', 'SKUNAME', '현재가', '공급가', '이익률', '정상판매가', '네이버 가격비교'].map(h => (
                <th key={h} style={s.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map(row => {
              const rate = calcProfit(row.currentPrice, row.supplyPrice, row.originalSalePrice);
              return (
                <tr key={row.id} style={s.tr}>
                  <td style={{ ...s.td, fontFamily: 'monospace', fontSize: 12, color: '#5a6072' }}>{row.skuid}</td>
                  <td style={{ ...s.td, fontWeight: 600 }}>{row.skuname}</td>
                  <td style={{ ...s.td, textAlign: 'right' }}>{row.currentPrice ? row.currentPrice.toLocaleString() + '원' : '—'}</td>
                  <td style={{ ...s.td, textAlign: 'right' }}>{row.supplyPrice ? row.supplyPrice.toLocaleString() + '원' : '—'}</td>
                  <td style={{ ...s.td, textAlign: 'center' }}>
                    {rate != null
                      ? <span style={{ ...s.rateBadge, color: profitColor(rate), background: profitBg(rate) }}>
                          {rate.toFixed(1)}%
                        </span>
                      : <span style={{ color: '#ccc' }}>—</span>
                    }
                  </td>
                  <td style={{ ...s.td, textAlign: 'right' }}>{row.originalSalePrice ? row.originalSalePrice.toLocaleString() + '원' : '—'}</td>
                  <td style={{ ...s.td, textAlign: 'center' }}>
                    {row.naverUrl
                      ? <a href={row.naverUrl} target="_blank" rel="noreferrer" style={s.link}>가격비교 ↗</a>
                      : <span style={{ color: '#ccc' }}>—</span>
                    }
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const s = {
  empty:      { textAlign: 'center', padding: '48px 0', color: '#9399a8', fontSize: 14 },
  topBar:     { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 2px 12px' },
  filterInfo: { fontSize: 12, color: '#9399a8', fontWeight: 500 },
  tableWrap:  { overflowX: 'auto' },
  table:      { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: {
    padding: '10px 14px',
    background: '#f8f9fa',
    borderBottom: '1px solid rgba(0,0,0,0.08)',
    textAlign: 'left',
    fontSize: 11, fontWeight: 600, color: '#9399a8',
    textTransform: 'uppercase', letterSpacing: '0.4px',
    whiteSpace: 'nowrap',
  },
  tr:        { borderBottom: '1px solid rgba(0,0,0,0.06)', transition: 'background 0.1s' },
  td:        { padding: '11px 14px', color: '#1a1d23', verticalAlign: 'middle' },
  rateBadge: { display: 'inline-block', padding: '3px 9px', borderRadius: 5, fontSize: 12, fontWeight: 700 },
  link:      { color: '#2563eb', fontWeight: 600, fontSize: 12, textDecoration: 'none' },
  csvBtn: {
    padding: '7px 16px',
    borderRadius: 8,
    border: '1px solid rgba(0,0,0,0.12)',
    background: '#fff',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 600,
    color: '#1a1d23',
  },
};
