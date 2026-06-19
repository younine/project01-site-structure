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

const BASE_NAV = [
  {
    section: '메인',
    items: [{ label: '대시보드', icon: '⊞', href: '/' }],
  },
  {
    section: '가격비교',
    items: [
      { label: '모니터',           icon: '🖥', href: '/monitor.html' },
      { label: '키보드',           icon: '⌨', href: '/keyboard/' },
      { label: '네이버 검색 랭킹', icon: '🔍', href: '/nrank/' },
    ],
  },
];

const PERM_NAV = [
  {
    section: '쿠팡',
    permissions: ['coupang_viewer', 'order_viewer'],
    items: [
      { label: '가격 수집',   icon: '🛒', href: '/coupang/',          permission: 'coupang_viewer' },
      { label: '재매칭요청',  icon: '↺',  href: '/coupang/#rematch', permission: 'coupang_viewer' },
      { label: '발주서 변환', icon: '📋', href: '/coupang/order/',   permission: 'order_viewer' },
      { label: '신제품 등록', icon: '📝', href: '/coupang/register/', permission: 'coupang_viewer' },
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
    items: [{ label: '캘린더', icon: '📅', href: '/events/' }],
  },
];

const PRODUCT_NAV = [
  {
    section: '제품 관리',
    items: [{ label: '제품 정보', icon: '📦', href: '/products/' }],
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

  const allSections = [...BASE_NAV, ...permSections, ...(user ? EVENT_NAV : []), ...(user ? PRODUCT_NAV : [])];

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
                  className={`nav-item${isActive(item.href) ? ' active' : ''}`}
                >
                  <span className="nav-icon">{item.icon}</span>
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
