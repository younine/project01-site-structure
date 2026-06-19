import { useState } from 'react';

const CONTACTS = ['전체', '기계식', '무접점', '멤브레인', '펜타그래프'];

function fmt(n) {
  if (!n && n !== 0) return '-';
  return Number(n).toLocaleString('ko-KR') + '원';
}
function fmtSign(n) {
  if (n === 0 || !n) return null;
  return (n > 0 ? '+' : '') + Number(n).toLocaleString('ko-KR') + '원';
}
function DanawaLink({ name, code, style }) {
  if (code) {
    return (
      <a
        href={`https://prod.danawa.com/info/?pcode=${code}`}
        target="_blank"
        rel="noopener noreferrer"
        style={style || { color: '#2563eb', textDecoration: 'none' }}
      >
        {name}
      </a>
    );
  }
  return <span>{name}</span>;
}

function Detail({ model: m }) {
  const specTags = [m.contact, m.switch, m.sl, m.conn].filter(Boolean);
  const comps = m.comps || [];

  return (
    <>
      <div style={s.detailHeader}>
        <div style={s.detailCode}>
          <DanawaLink name={m.m} code={m.code} style={{ color: '#2563eb', textDecoration: 'none', fontSize: 14, fontWeight: 700 }} />
        </div>
        <div style={s.detailSpecRow}>
          {specTags.map(tag => (
            <span key={tag} style={s.detailSpecTag}>{tag}</span>
          ))}
        </div>
        <div style={s.detailPriceRow}>
          <span style={s.detailPrice}>{Number(m.price).toLocaleString('ko-KR')}원</span>
          {!!m.diff && (
            <span style={m.diff > 0 ? s.priceUp : s.priceDown}>
              {fmtSign(m.diff)}
            </span>
          )}
        </div>
      </div>
      <div style={s.detailSubHeader}>
        동스펙 경쟁사 비교 · {comps.length}개
      </div>
      <div style={s.tableWrap}>
        <table style={s.table}>
          <thead>
            <tr>
              <th style={{ ...s.th, textAlign: 'left' }}>경쟁사 모델명</th>
              <th style={s.th}>최저가</th>
              <th style={s.th}>차이(율%)</th>
              <th style={s.th}>어제대비</th>
            </tr>
          </thead>
          <tbody>
            {comps.length === 0 ? (
              <tr>
                <td colSpan={4} style={s.noComp}>동스펙 경쟁사 없음</td>
              </tr>
            ) : comps.map((c, i) => {
              const isLower = c.diffOwn < 0;
              const ratio = m.price > 0 ? Math.round(c.diffOwn / m.price * 1000) / 10 : 0;
              const diffColor = isLower ? '#16a34a' : c.diffOwn > 0 ? '#dc2626' : '#9399a8';
              const bgColor = isLower ? 'rgba(22,163,74,0.07)' : c.diffOwn > 0 ? 'rgba(220,38,38,0.07)' : 'transparent';
              const specParts = [c.contact, c.switch, c.sl, c.conn, c.polling].filter(Boolean);
              return (
                <tr key={c.code || i}>
                  <td style={s.tdName}>
                    <div><DanawaLink name={c.name} code={c.code} /></div>
                    <div style={s.tdSpecRow}>
                      {specParts.map(sp => (
                        <span key={sp} style={s.specTag}>{sp}</span>
                      ))}
                    </div>
                  </td>
                  <td style={s.tdRight}>{fmt(c.price)}</td>
                  <td style={{ ...s.tdRight, background: bgColor, color: diffColor, fontWeight: 600 }}>
                    {fmtSign(c.diffOwn)} ({ratio >= 0 ? '+' : ''}{ratio}%)
                  </td>
                  <td style={s.tdRight}>
                    {c.change !== 0 ? (
                      <span style={{ color: c.change < 0 ? '#16a34a' : '#dc2626' }}>
                        {c.change > 0 ? '▲' : '▼'}{Math.abs(c.change).toLocaleString()}
                      </span>
                    ) : '-'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

export default function ResultTable({ models }) {
  const [contactFilter, setContactFilter] = useState('전체');
  const [search, setSearch] = useState('');
  const [selectedCode, setSelectedCode] = useState(models[0]?.code ?? null);

  if (!models.length) {
    return <div style={s.empty}>데이터가 없습니다.</div>;
  }

  const filtered = models.filter(m => {
    if (contactFilter !== '전체' && m.contact !== contactFilter) return false;
    if (search && !m.m.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const selectedModel = models.find(m => m.code === selectedCode) || models[0];

  return (
    <div style={s.layout}>
      <div style={s.listPanel}>
        <div style={s.listHeader}>
          <span style={s.listTitle}>자사 모델 목록</span>
          <span style={s.listCount}>{filtered.length}개</span>
        </div>
        <div style={s.searchWrap}>
          <input
            type="text"
            placeholder="모델명 검색..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={s.searchInput}
          />
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
        <div style={s.listItems}>
          {filtered.map(m => {
            const isSelected = selectedModel && m.code === selectedModel.code;
            const spec = [m.contact, m.switch, m.sl, m.conn].filter(Boolean).join(' · ');
            return (
              <div
                key={m.code || m.m}
                onClick={() => setSelectedCode(m.code)}
                style={{ ...s.listItem, ...(isSelected ? s.listItemSelected : {}) }}
              >
                <div style={s.listItemCode}>
                  {m.m}
                  {m.is8k && <span style={s.badge8k}>8K</span>}
                </div>
                <div style={s.listItemSpec}>{spec}</div>
                <div style={s.listItemPrice}>{fmt(m.price)}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={s.detailPanel}>
        {!selectedModel
          ? <div style={s.detailEmpty}>모델을 선택하세요</div>
          : <Detail model={selectedModel} />
        }
      </div>
    </div>
  );
}

const s = {
  empty: { padding: 40, textAlign: 'center', color: '#9399a8' },
  layout: { display: 'grid', gridTemplateColumns: '300px 1fr', gap: 16 },
  listPanel: { background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 12, overflow: 'hidden' },
  listHeader: { padding: '12px 16px', borderBottom: '1px solid rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  listTitle: { fontSize: 12, fontWeight: 600, color: '#1a1d23' },
  listCount: { fontSize: 11, color: '#9399a8', background: '#f8f9fa', padding: '2px 8px', borderRadius: 99 },
  searchWrap: { padding: '10px 12px', borderBottom: '1px solid rgba(0,0,0,0.08)' },
  searchInput: { width: '100%', padding: '7px 10px', border: '1px solid rgba(0,0,0,0.14)', borderRadius: 7, fontSize: 12, background: '#f8f9fa', color: '#1a1d23', outline: 'none', boxSizing: 'border-box' },
  filterBar: { padding: '8px 12px', borderBottom: '1px solid rgba(0,0,0,0.08)', display: 'flex', gap: 4, flexWrap: 'wrap' },
  filterBtn: { padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 500, border: '1px solid rgba(0,0,0,0.14)', background: '#f8f9fa', color: '#5a6072', cursor: 'pointer', whiteSpace: 'nowrap' },
  filterBtnActive: { background: '#2563eb', borderColor: '#2563eb', color: '#fff' },
  listItems: { overflowY: 'auto', maxHeight: 'calc(100vh - 300px)' },
  listItem: { padding: '12px 16px', borderBottom: '1px solid rgba(0,0,0,0.06)', cursor: 'pointer' },
  listItemSelected: { background: 'rgba(37,99,235,0.08)', borderLeft: '3px solid #2563eb' },
  listItemCode: { fontSize: 12, fontWeight: 600, color: '#2563eb', marginBottom: 3, display: 'flex', alignItems: 'center', gap: 5 },
  badge8k: { fontSize: 10, background: '#7c3aed', color: '#fff', padding: '1px 5px', borderRadius: 3 },
  listItemSpec: { fontSize: 11, color: '#9399a8', marginBottom: 4 },
  listItemPrice: { fontSize: 13, fontWeight: 600, color: '#1a1d23' },
  detailPanel: { background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 12, overflow: 'hidden' },
  detailEmpty: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, color: '#9399a8' },
  detailHeader: { padding: '16px 20px', borderBottom: '1px solid rgba(0,0,0,0.08)' },
  detailCode: { fontSize: 14, fontWeight: 700, color: '#2563eb', marginBottom: 4 },
  detailSpecRow: { display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 6 },
  detailSpecTag: { display: 'inline-block', padding: '2px 8px', borderRadius: 4, background: '#f8f9fa', border: '1px solid rgba(0,0,0,0.08)', fontSize: 11 },
  detailPriceRow: { display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 },
  detailPrice: { fontSize: 24, fontWeight: 700, letterSpacing: '-0.5px' },
  priceUp: { fontSize: 13, color: '#dc2626', fontWeight: 500 },
  priceDown: { fontSize: 13, color: '#16a34a', fontWeight: 500 },
  detailSubHeader: { padding: '12px 16px', fontSize: 12, fontWeight: 600, color: '#5a6072' },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: { padding: '8px 14px', textAlign: 'right', fontSize: 11, fontWeight: 500, color: '#9399a8', background: '#f8f9fa', borderBottom: '1px solid rgba(0,0,0,0.06)', whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '0.4px' },
  tdName: { padding: '10px 14px', borderBottom: '1px solid rgba(0,0,0,0.04)', verticalAlign: 'middle' },
  tdRight: { padding: '10px 14px', textAlign: 'right', borderBottom: '1px solid rgba(0,0,0,0.04)', whiteSpace: 'nowrap', verticalAlign: 'middle' },
  tdSpecRow: { display: 'flex', gap: 3, flexWrap: 'wrap', marginTop: 4 },
  specTag: { display: 'inline-block', padding: '1px 6px', borderRadius: 3, background: '#f8f9fa', border: '1px solid rgba(0,0,0,0.08)', fontSize: 10, color: '#5a6072', whiteSpace: 'nowrap' },
  noComp: { padding: 20, textAlign: 'center', color: '#9399a8' },
};
