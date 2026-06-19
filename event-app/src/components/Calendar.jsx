import { useState } from 'react';
import './Calendar.css';

const PLATFORM_COLOR = {
  쿠팡:  { bg: 'var(--plat-coupang)', text: '#fff' },
  네이버: { bg: 'var(--plat-naver)',   text: '#fff' },
  지마켓: { bg: 'var(--plat-gmarket)', text: '#fff' },
  전체:  { bg: 'var(--plat-all)',     text: '#fff' },
};

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

function fmt(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function buildWeeks(year, month) {
  const first = new Date(year, month, 1);
  const last  = new Date(year, month + 1, 0);
  const weeks = [];
  let cur = new Date(first);
  cur.setDate(cur.getDate() - cur.getDay());
  while (cur <= last || weeks.length === 0) {
    const week = [];
    for (let i = 0; i < 7; i++) { week.push(new Date(cur)); cur.setDate(cur.getDate() + 1); }
    weeks.push(week);
    if (cur > last && cur.getDay() === 0) break;
  }
  return weeks;
}

function layoutBarsForWeek(promotions, weekDays) {
  const weekStart = fmt(weekDays[0]);
  const weekEnd   = fmt(weekDays[6]);
  const active    = promotions.filter(p => p.startDate <= weekEnd && p.endDate >= weekStart);
  const rows      = [];
  for (const p of active) {
    const cs     = p.startDate < weekStart ? weekStart : p.startDate;
    const ce     = p.endDate   > weekEnd   ? weekEnd   : p.endDate;
    const col    = weekDays.findIndex(d => fmt(d) === cs);
    const endCol = weekDays.findIndex(d => fmt(d) === ce);
    const span   = endCol - col + 1;
    const isStart = p.startDate >= weekStart;
    const isEnd   = p.endDate   <= weekEnd;
    let placed = false;
    for (let r = 0; r < rows.length; r++) {
      if (!rows[r].some(b => b.col < col + span && b.col + b.span > col)) {
        rows[r].push({ p, col, span, isStart, isEnd });
        placed = true; break;
      }
    }
    if (!placed) rows.push([{ p, col, span, isStart, isEnd }]);
  }
  return rows;
}

export default function Calendar({ promotions = [], onSelect, selectedId }) {
  const now = new Date();
  const [year,    setYear]    = useState(now.getFullYear());
  const [month,   setMonth]   = useState(now.getMonth());
  const [tooltip, setTooltip] = useState(null);
  const today = fmt(now);
  const weeks = buildWeeks(year, month);

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11); } else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0); } else setMonth(m => m + 1);
  }

  return (
    <div className="cal-card card">
      <div className="card-header">
        <div className="cal-nav">
          <button className="cal-nav-btn" onClick={prevMonth}>‹</button>
          <span className="card-title">{year}년 {month + 1}월</span>
          <button className="cal-nav-btn" onClick={nextMonth}>›</button>
        </div>
        <div className="plat-legend">
          {Object.entries(PLATFORM_COLOR).map(([p, c]) => (
            <span key={p} className="legend-dot" style={{ background: c.bg }}>{p}</span>
          ))}
        </div>
      </div>

      <div className="cal-body" onClick={() => setTooltip(null)}>
        <div className="cal-dow-row">
          {DAY_LABELS.map(d => <div key={d} className="cal-dow">{d}</div>)}
        </div>

        {weeks.map((week, wi) => {
          const rows     = layoutBarsForWeek(promotions, week);
          const BAR_H    = 20;
          const BAR_GAP  = 3;
          const barAreaH = Math.max(rows.length, 5) * (BAR_H + BAR_GAP) + 4;
          return (
            <div key={wi} className="cal-week" style={{ minHeight: 52 + barAreaH }}>
              <div className="cal-day-nums">
                {week.map((d, di) => {
                  const ds = fmt(d);
                  return (
                    <div key={di} className={[
                      'cal-day-num',
                      d.getMonth() !== month ? 'other-month' : '',
                      ds === today ? 'today' : '',
                    ].filter(Boolean).join(' ')}>
                      {ds === today ? <span className="today-badge">{d.getDate()}</span> : d.getDate()}
                    </div>
                  );
                })}
              </div>

              <div className="cal-bars" style={{ height: barAreaH }}>
                {rows.map((rowBars, ri) =>
                  rowBars.map(({ p, col, span, isStart, isEnd }) => {
                    const color = PLATFORM_COLOR[p.platform] || PLATFORM_COLOR['전체'];
                    const isSelected = p.id === selectedId;
                    return (
                      <div
                        key={p.id + '-' + ri + '-' + col}
                        className={`cal-bar${isSelected ? ' selected' : ''}`}
                        style={{
                          left:       `calc(${col} * (100% / 7) + 2px)`,
                          width:      `calc(${span} * (100% / 7) - 4px)`,
                          top:        ri * (BAR_H + BAR_GAP),
                          height:     BAR_H,
                          background: color.bg,
                          color:      color.text,
                          borderRadius: `${isStart ? '4px' : '0'} ${isEnd ? '4px' : '0'} ${isEnd ? '4px' : '0'} ${isStart ? '4px' : '0'}`,
                        }}
                        onClick={e => { e.stopPropagation(); onSelect(p); }}
                        onMouseEnter={e => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          setTooltip({ p, x: rect.left, y: rect.bottom + 6 });
                        }}
                        onMouseLeave={() => setTooltip(null)}
                      >
                        {isStart && <span className="bar-label">{p.promotionName}</span>}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {tooltip && (
        <div className="cal-tooltip" style={{ position: 'fixed', left: tooltip.x, top: tooltip.y, zIndex: 200 }}>
          <div className="tt-platform" style={{ color: PLATFORM_COLOR[tooltip.p.platform]?.bg }}>
            {tooltip.p.platform}
          </div>
          <div className="tt-model">{tooltip.p.promotionName}</div>
          <div className="tt-date">{tooltip.p.startDate} ~ {tooltip.p.endDate}</div>
          <div className="tt-memo">{(tooltip.p.models?.length || 0)}개 모델 참여</div>
          <div className="tt-hint">클릭하면 상세 보기</div>
        </div>
      )}
    </div>
  );
}
