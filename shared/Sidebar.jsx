/**
 * 공통 사이드바 React 컴포넌트
 * CSS는 각 앱의 index.html에서 /shared/sidebar.css 로드
 */
import { useState, useEffect } from 'react';

function useLocation() {
  const [loc, setLoc] = useState({ path: window.location.pathname, hash: window.location.hash });
  useEffect(() => {
    const update = () => setLoc({ path: window.location.pathname, hash: window.location.hash });
    window.addEventListener('hashchange', update);
    window.addEventListener('popstate', update);
    return () => {
      window.removeEventListener('hashchange', update);
      window.removeEventListener('popstate', update);
    };
  }, []);
  return loc;
}

function makeIsActive(path, hash) {
  return function isActive(href) {
    if (href === '/') return path === '/' || path === '';
    const [hPath, hHash] = href.split('#');
    if (hHash) return path === hPath && hash === '#' + hHash;
    if (hash) return false;
    return path === hPath;
  };
}

const I = (d) => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{d}</svg>
);

const ICONS = {
  dashboard: I(<><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></>),
  monitor:   I(<><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></>),
  keyboard:  I(<><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M6 14h12"/></>),
  search:    I(<><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></>),
  download:  I(<><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></>),
  refresh:   I(<><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/></>),
  document:  I(<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></>),
  plus:      I(<><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></>),
  calendar:  I(<><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></>),
  box:       I(<><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></>),
  news:      I(<><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 0-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/><path d="M18 14h-8"/><path d="M15 18h-5"/><path d="M10 6h8v4h-8V6Z"/></>),
};

const BASE_NAV = [
  {
    section: '메인',
    items: [{ label: '대시보드', icon: 'dashboard', href: '/' }],
  },
  {
    section: '가격비교',
    items: [
      { label: '모니터',           icon: 'monitor',   href: '/monitor.html' },
      { label: '네이버 검색 랭킹', icon: 'search',    href: '/nrank/' },
    ],
  },
];

const PERM_NAV = [
  {
    section: '쿠팡',
    permissions: ['coupang_viewer', 'order_viewer'],
    items: [
      { label: '가격 수집',   icon: 'download',  href: '/coupang/',          permission: 'coupang_viewer' },
      { label: '재매칭요청',  icon: 'refresh',   href: '/coupang/#rematch',  permission: 'coupang_viewer' },
      { label: '발주서 변환', icon: 'document',  href: '/coupang/order/',    permission: 'order_viewer' },
      { label: '신제품 등록', icon: 'plus',      href: '/coupang/register/', permission: 'coupang_viewer' },
    ],
  },
  {
    section: 'B2B 발주',
    permissions: ['b2b_viewer'],
    items: [
      { label: '컴퓨존', icon: '', href: '/b2b-order/#compuzone', permission: 'b2b_viewer' },
      { label: '아토즈',  icon: '', href: '/b2b-order/#atoz',     permission: 'b2b_viewer' },
      { label: '아싸컴',  icon: '', href: '/b2b-order/#assacom',  permission: 'b2b_viewer' },
      { label: '미라클',  icon: '', href: '/b2b-order/#miracle',  permission: 'b2b_viewer' },
    ],
  },
];

const EVENT_NAV = [
  {
    section: '행사 스케줄',
    items: [{ label: '캘린더', icon: 'calendar', href: '/events/' }],
  },
];

const PRODUCT_NAV = [
  {
    section: '제품 관리',
    items: [{ label: '제품 정보', icon: 'box', href: '/products/' }],
  },
];

const COMMUNITY_NAV = [
  {
    section: '커뮤니티',
    items: [{ label: '게시글 수집', icon: 'news', href: '/community/' }],
  },
];

export default function Sidebar({
  user,
  hasPermission = () => false,
  onLogout,
  isOpen,
  onClose,
  coupangCount = 0,
  activeHash,
}) {
  const { path, hash } = useLocation();
  const isActive = makeIsActive(path, activeHash !== undefined ? activeHash : hash);

  const permSections = PERM_NAV
    .filter(s => user && s.permissions.some(p => hasPermission(p)))
    .map(s => ({ ...s, items: s.items.filter(item => hasPermission(item.permission)) }));

  const allSections = [...BASE_NAV, ...COMMUNITY_NAV, ...permSections, ...(user ? EVENT_NAV : []), ...(user ? PRODUCT_NAV : [])];

  function handleLogout() {
    if (onLogout) {
      onLogout();
    } else {
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
    }
  }

  return (
    <>
      {isOpen && <div className="sidebar-overlay" onClick={onClose} />}
      <aside className={`sidebar${isOpen ? ' sidebar-open' : ''}`}>
        <div className="sidebar-logo">
          <div className="logo-main">PROJECT_01</div>
        </div>
        <nav className="sidebar-nav">
          {allSections.map(sec => (
            <div key={sec.section}>
              <div className="nav-section">{sec.section}</div>
              {sec.items.map(item => (
                <a
                  key={item.label}
                  href={item.href}
                  className={`nav-item${isActive(item.href) ? ' active' : ''}${!item.icon ? ' nav-item-sub' : ''}`}
                >
                  {item.icon && <span className="nav-icon">{ICONS[item.icon]}</span>}
                  <span>{item.label}</span>
                  {item.href === '/coupang/' && coupangCount > 0 && (
                    <span className="nav-badge">{coupangCount}</span>
                  )}
                </a>
              ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-footer">
          {user ? (
            <div className="sidebar-user">
              <div className="sidebar-username">
                <span className="user-role-badge">
                  {user.role === 'admin' ? '관리자' : '일반'}
                </span>
                {user.username}
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                {user.role === 'admin' && (
                  <a href="/admin-settings/" className="admin-settings-btn" title="관리자 설정">
                    ⚙
                  </a>
                )}
                <button className="logout-btn" onClick={handleLogout}>
                  로그아웃
                </button>
              </div>
            </div>
          ) : (
            <a
              href={`/login?redirect=${encodeURIComponent(window.location.pathname)}`}
              className="login-btn"
            >
              로그인
            </a>
          )}
        </div>
      </aside>
    </>
  );
}
