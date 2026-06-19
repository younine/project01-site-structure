import { useState } from 'react';

const CONTACTS = ['전체', '기계식', '무접점', '멤브레인', '펜타그래프'];

function fmt(n) {
  if (!n && n !== 0) return '-';
  return Number(n).toLocaleString('ko-KR') + '원';
}

export default function NewProducts({ products }) {
  const [contactFilter, setContactFilter] = useState('전체');

  const compOnly = products.filter(p => p.type === '경쟁사');
  const filtered = contactFilter === '전체'
    ? compOnly
    : compOnly.filter(p => p.contact === contactFilter);

  const now = new Date();
  const monthLabel = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  return (
    <div style={s.section}>
      <div style={s.header}>
        <span style={s.headerTitle}>이번달 타사 신제품 ({monthLabel})</span>
        <span style={s.headerBadge}>총 {filtered.length}개</span>
      </div>
      <div style={s.filterBar}>
        {CONTACTS.map(c => (
          <button
            key={c}
            onClick={() => setContactFilter(c)}
            style={{ ...s.filterBtn, ...(contactFilter === c ? s.filterBtnActive : {}) }}
          >
            {c}
          </button>
        ))}
      </div>
      <div style={s.tableWrap}>
        <table style={s.table}>
          <thead>
            <tr>
              <th style={{ ...s.th, textAlign: 'left' }}>브랜드</th>
              <th style={{ ...s.th, textAlign: 'left' }}>모델명</th>
              <th style={{ ...s.th, textAlign: 'left' }}>접점방식</th>
              <th style={{ ...s.th, textAlign: 'left' }}>축</th>
              <th style={{ ...s.th, textAlign: 'left' }}>배열/사이즈</th>
              <th style={{ ...s.th, textAlign: 'left' }}>연결방식</th>
              <th style={s.th}>판매가</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} style={s.empty}>이번 달 신규 등록된 경쟁사 제품이 없습니다.</td>
              </tr>
            ) : filtered.map((p, i) => (
              <tr key={p.code || i} style={i % 2 === 1 ? s.trOdd : {}}>
                <td style={s.tdBrand}>{p.brand || '-'}</td>
                <td style={s.tdName}>
                  {p.code ? (
                    <a
                      href={`https://prod.danawa.com/info/?pcode=${p.code}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={s.nameLink}
                    >
                      {p.display_name || p.name}
                    </a>
                  ) : (p.display_name || p.name)}
                </td>
                <td style={s.td}>{p.contact || '-'}</td>
                <td style={s.td}>{p.switch || '-'}</td>
                <td style={s.td}>{p.sl || '-'}</td>
                <td style={s.td}>{p.conn || '-'}</td>
                <td style={s.tdRight}>{p.today ? fmt(p.today) : fmt(p.price)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const s = {
  section: { background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 12, overflow: 'hidden' },
  header: { padding: '14px 18px', borderBottom: '1px solid rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { fontSize: 13, fontWeight: 600, color: '#1a1d23' },
  headerBadge: { fontSize: 11, padding: '2px 8px', borderRadius: 99, background: 'rgba(37,99,235,0.08)', color: '#2563eb', fontWeight: 500 },
  filterBar: { padding: '8px 12px', borderBottom: '1px solid rgba(0,0,0,0.08)', display: 'flex', gap: 4, flexWrap: 'wrap' },
  filterBtn: { padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 500, border: '1px solid rgba(0,0,0,0.14)', background: '#f8f9fa', color: '#5a6072', cursor: 'pointer', whiteSpace: 'nowrap' },
  filterBtnActive: { background: '#2563eb', borderColor: '#2563eb', color: '#fff' },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: { padding: '9px 14px', textAlign: 'right', fontSize: 11, fontWeight: 500, color: '#9399a8', background: '#f8f9fa', borderBottom: '1px solid rgba(0,0,0,0.08)', whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '0.4px' },
  trOdd: { background: '#fafbfc' },
  empty: { padding: 20, textAlign: 'center', color: '#9399a8' },
  tdBrand: { padding: '10px 14px', fontWeight: 500, whiteSpace: 'nowrap', borderBottom: '1px solid rgba(0,0,0,0.04)', verticalAlign: 'middle' },
  tdName: { padding: '10px 14px', borderBottom: '1px solid rgba(0,0,0,0.04)', verticalAlign: 'middle' },
  td: { padding: '10px 14px', color: '#5a6072', fontSize: 12, borderBottom: '1px solid rgba(0,0,0,0.04)', whiteSpace: 'nowrap', verticalAlign: 'middle' },
  tdRight: { padding: '10px 14px', textAlign: 'right', fontWeight: 600, whiteSpace: 'nowrap', borderBottom: '1px solid rgba(0,0,0,0.04)', verticalAlign: 'middle' },
  nameLink: { color: '#1a1d23', textDecoration: 'none', fontWeight: 500 },
};
