const NAV = [
  { label: '메인',     href: '/' },
  { label: '모니터',   href: '/monitor.html' },
  { label: '키보드',   href: '/keyboard/', active: true },
  { label: '쿠팡 수집', href: '/coupang/' },
];

export default function TopBar({ stats, lastUpdated }) {
  const d = lastUpdated;
  const dateStr = d
    ? `최종 갱신: ${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}.`
    : null;

  return (
    <nav style={s.nav}>
      <div style={s.logo}>
        한성컴퓨터 <span style={s.blue}>키보드 모니터링</span>
      </div>
      {stats && (
        <div style={s.statsWrap}>
          <span style={s.stat}>자사 <strong>{stats.ownCount}개</strong></span>
          <span style={s.stat}>경쟁사 <strong>{stats.compCount}개</strong></span>
          <span style={s.stat}>저가 경쟁사 <strong>{stats.lowerCount}건</strong></span>
        </div>
      )}
      <div style={s.right}>
        {dateStr && <span style={s.meta}>{dateStr}</span>}
        <div style={s.links}>
          {NAV.map(({ label, href, active }) => (
            <a key={label} href={href} style={{ ...s.link, ...(active ? s.linkActive : {}) }}>
              {label}
            </a>
          ))}
        </div>
      </div>
    </nav>
  );
}

const s = {
  nav: {
    background: '#fff',
    borderBottom: '1px solid rgba(0,0,0,0.08)',
    padding: '0 24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 56,
    position: 'sticky',
    top: 0,
    zIndex: 100,
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
    gap: 16,
  },
  logo: { fontSize: 15, fontWeight: 700, color: '#1a1d23', letterSpacing: '-0.3px', flexShrink: 0 },
  blue: { color: '#2563eb' },
  statsWrap: { display: 'flex', gap: 20, fontSize: 12 },
  stat: { color: '#5a6072' },
  right: { display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 },
  meta: { fontSize: 11, color: '#9399a8' },
  links: { display: 'flex', gap: 4 },
  link: {
    padding: '6px 14px',
    fontSize: 13,
    fontWeight: 500,
    color: '#5a6072',
    textDecoration: 'none',
    borderRadius: 6,
    transition: 'background 0.15s, color 0.15s',
  },
  linkActive: {
    color: '#2563eb',
    background: 'rgba(37,99,235,0.08)',
    fontWeight: 600,
  },
};
