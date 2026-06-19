const TABS = [
  { key: 'all',  label: '전체' },
  { key: '식품',  label: '식품' },
  { key: '생활',  label: '생활' },
  { key: '뷰티',  label: '뷰티' },
  { key: '전자',  label: '전자' },
];

export default function FilterTabs({ active, onChange }) {
  return (
    <div style={s.tabs}>
      {TABS.map((tab) => (
        <button
          key={tab.key}
          style={{ ...s.btn, ...(active === tab.key ? s.btnActive : {}) }}
          onClick={() => onChange(tab.key)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

const s = {
  tabs: {
    display: 'flex',
    gap: 4,
    borderBottom: '1px solid var(--border)',
    marginBottom: 0,
  },
  btn: {
    padding: '8px 18px',
    fontSize: 13,
    fontWeight: 500,
    color: 'var(--text3)',
    cursor: 'pointer',
    border: 'none',
    background: 'none',
    borderBottom: '2px solid transparent',
    marginBottom: -1,
    transition: 'color 0.15s',
  },
  btnActive: {
    color: 'var(--accent)',
    borderBottomColor: 'var(--accent)',
  },
};
