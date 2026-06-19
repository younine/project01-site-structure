export default function FilterTabs({ tab, setTab, compareCount, newCount }) {
  const tabs = [
    { key: 'compare', label: '가격비교', count: compareCount },
    { key: 'new',     label: '타사 신제품', count: newCount },
  ];

  return (
    <div style={s.wrap}>
      {tabs.map(({ key, label, count }) => (
        <button key={key} onClick={() => setTab(key)} style={{ ...s.btn, ...(tab === key ? s.active : {}) }}>
          {label}
          {count > 0 && (
            <span style={{ ...s.badge, ...(tab === key ? s.badgeActive : {}) }}>{count}</span>
          )}
        </button>
      ))}
    </div>
  );
}

const s = {
  wrap: {
    display: 'flex',
    gap: 0,
    borderBottom: '1px solid rgba(0,0,0,0.08)',
    marginBottom: 20,
  },
  btn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '10px 18px',
    fontSize: 13,
    fontWeight: 500,
    color: '#9399a8',
    background: 'none',
    border: 'none',
    borderBottom: '2px solid transparent',
    marginBottom: -1,
    transition: 'color 0.15s',
  },
  active: {
    color: '#2563eb',
    borderBottomColor: '#2563eb',
    fontWeight: 600,
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 18,
    height: 18,
    padding: '0 5px',
    borderRadius: 9,
    fontSize: 11,
    fontWeight: 600,
    background: 'rgba(0,0,0,0.07)',
    color: '#5a6072',
  },
  badgeActive: {
    background: 'rgba(37,99,235,0.12)',
    color: '#2563eb',
  },
};
