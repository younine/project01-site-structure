const NAV = [
  { label: '메인',     href: '/' },
  { label: '모니터',   href: '/monitor.html' },
  { label: '키보드',   href: '/keyboard.html' },
  { label: '쿠팡 수집', href: '#', active: true },
];

export default function TopBar() {
  return (
    <nav style={s.nav}>
      <div style={s.logo}>
        한성컴퓨터 <span style={s.blue}>가격 수집기</span>
      </div>
      <div style={s.links}>
        {NAV.map(({ label, href, active }) => (
          <a key={label} href={href} style={{ ...s.link, ...(active ? s.linkActive : {}) }}>
            {label}
          </a>
        ))}
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
  },
  logo: {
    fontSize: 16,
    fontWeight: 700,
    color: '#1a1d23',
    letterSpacing: '-0.3px',
  },
  blue: { color: '#2563eb' },
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
