const DELIVERY_STYLE = {
  '로켓배송':   { background: '#ff6000', color: '#fff' },
  '로켓프레시': { background: '#16a34a', color: '#fff' },
  '일반배송':   { background: '#f0f0f0', color: '#5a6072' },
};

const STATUS_STYLE = {
  '판매중': { background: '#dcfce7', color: '#16a34a' },
  '품절':   { background: '#fee2e2', color: '#dc2626' },
};

function Stars({ rating }) {
  const full = Math.floor(rating);
  const empty = 5 - full;
  return (
    <span style={{ color: '#f59e0b', fontSize: 12 }}>
      {'★'.repeat(full)}{'☆'.repeat(empty)}
      <span style={{ color: '#9399a8', marginLeft: 4, fontSize: 11 }}>{rating}</span>
    </span>
  );
}

export default function ResultTable({ rows }) {
  if (!rows.length) {
    return <div style={s.empty}>수집된 데이터가 없습니다.</div>;
  }

  return (
    <div style={s.wrap}>
      <table style={s.table}>
        <thead>
          <tr>
            {['#', 'ITEMID', '모델코드', '상품명', '정상가', '판매가', '할인율', '쿠폰가', '평점', '상태', '배송'].map(h => (
              <th key={h} style={s.th}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={row.id} style={s.tr}>
              <td style={{ ...s.td, ...s.center, color: '#9399a8', fontSize: 12 }}>{idx + 1}</td>
              <td style={{ ...s.td, ...s.mono }}>{row.itemId}</td>
              <td style={{ ...s.td, ...s.mono }}>{row.modelCode}</td>
              <td style={s.td}>
                <a
                  href={`https://www.coupang.com/vp/products/${row.productCode}${row.itemId ? `?itemId=${row.itemId}` : ''}`}
                  target="_blank"
                  rel="noreferrer"
                  style={s.nameLink}
                >
                  {row.name}
                </a>
                {row.subName && <div style={s.nameSub}>{row.subName}</div>}
              </td>
              <td style={{ ...s.td, ...s.right }}>
                <span style={s.strike}>{row.originalPrice.toLocaleString()}원</span>
              </td>
              <td style={{ ...s.td, ...s.right, fontWeight: 600 }}>
                {row.salePrice.toLocaleString()}원
              </td>
              <td style={{ ...s.td, ...s.center, color: '#2563eb', fontWeight: 600 }}>
                {row.discountRate}%
              </td>
              <td style={{ ...s.td, ...s.right }}>
                {row.couponPrice
                  ? <span style={s.coupon}>{row.couponPrice.toLocaleString()}원</span>
                  : <span style={s.noCoupon}>—</span>
                }
              </td>
              <td style={s.td}>
                <div><Stars rating={row.rating} /></div>
                <div style={s.review}>리뷰 {row.reviewCount.toLocaleString()}개</div>
              </td>
              <td style={{ ...s.td, ...s.center }}>
                <span style={{ ...s.badge, ...(STATUS_STYLE[row.status] ?? {}) }}>
                  {row.status}
                </span>
              </td>
              <td style={{ ...s.td, ...s.center }}>
                <span style={{ ...s.badge, ...(DELIVERY_STYLE[row.delivery] ?? {}) }}>
                  {row.delivery}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const s = {
  wrap:     { overflowX: 'auto' },
  table:    { width: '100%', minWidth: 960, borderCollapse: 'collapse', fontSize: 13 },
  th: {
    padding: '10px 14px',
    background: '#f8f9fa',
    borderBottom: '1px solid rgba(0,0,0,0.08)',
    textAlign: 'left',
    fontWeight: 600,
    color: '#9399a8',
    fontSize: 11,
    whiteSpace: 'nowrap',
    textTransform: 'uppercase',
    letterSpacing: '0.4px',
  },
  tr:       { borderBottom: '1px solid rgba(0,0,0,0.06)', transition: 'background 0.1s' },
  td:       { padding: '11px 14px', color: '#1a1d23', verticalAlign: 'middle' },
  mono:     { fontFamily: 'monospace', fontSize: 12, color: '#5a6072' },
  right:    { textAlign: 'right' },
  center:   { textAlign: 'center' },
  nameLink: { fontWeight: 600, fontSize: 13, color: '#1a1d23', textDecoration: 'none', display: 'block' },
  nameSub:  { fontSize: 11, color: '#9399a8', marginTop: 2 },
  strike:   { textDecoration: 'line-through', color: '#9399a8', fontSize: 12 },
  coupon:   { color: '#dc2626', fontWeight: 700 },
  noCoupon: { color: '#ccc' },
  review:   { fontSize: 11, color: '#9399a8', marginTop: 2 },
  badge: {
    display: 'inline-block',
    padding: '3px 8px',
    borderRadius: 5,
    fontSize: 11,
    fontWeight: 600,
    whiteSpace: 'nowrap',
  },
  empty: {
    textAlign: 'center',
    padding: '48px 0',
    color: '#9399a8',
    fontSize: 14,
  },
};
