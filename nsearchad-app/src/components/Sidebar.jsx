import { useState } from 'react';

function isActive(href) {
  const path = window.location.pathname;
  if (href === '/nsearchad/' || href === '/nsearchad') return path.startsWith('/nsearchad');
  return path === href;
}

const NAV = [
  { section: '메인', items: [{ label: '대시보드', icon: '⊞', href: '/' }] },
  {
    section: '가격비교',
    items: [
      { label: '모니터',           icon: '🖥',  href: '/monitor.html' },
      { label: '키보드',           icon: '⌨',  href: '/keyboard/' },
      { label: '네이버 검색 랭킹', icon: '🔍', href: '/nrank/' },
      { label: '네이버 검색광고',  icon: '💰', href: '/nsearchad/' },
    ],
  },
];

export default function Sidebar({ isOpen, onClose }) {
  return (
    <>
      {isOpen && <div className="sidebar-overlay" onClick={onClose} />}
      <aside className={`sidebar${isOpen ? ' sidebar-open' : ''}`}>
        <div className="sidebar-logo">
          <div className="logo-main">PROJECT_01</div>
        </div>
        <nav className="sidebar-nav">
          {NAV.map(sec => (
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
                </a>
              ))}
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}
