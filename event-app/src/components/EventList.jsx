import './EventList.css';

const PLAT_COLOR = { 쿠팡: '#E5413A', 네이버: '#03C75A', 지마켓: '#FF6600', 전체: '#2563eb' };

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function dday(endDate) {
  const today = new Date();
  today.setHours(0,0,0,0);
  const end = new Date(endDate + 'T00:00:00');
  const diff = Math.round((end - today) / 86400000);
  if (diff < 0) return null;
  if (diff === 0) return 'D-day';
  return `D-${diff}`;
}

function getStatus(ev, today) {
  if (ev.endDate < today) return 'done';
  if (ev.startDate > today) return 'upcoming';
  const end = new Date(ev.endDate + 'T00:00:00');
  const todayD = new Date(today + 'T00:00:00');
  const diff = Math.round((end - todayD) / 86400000);
  if (diff <= 3) return 'ending';
  return 'active';
}

const STATUS_LABEL = { active: '진행 중', upcoming: '예정', ending: '곧 종료', done: '종료' };
const STATUS_CLASS = { active: 'st-active', upcoming: 'st-upcoming', ending: 'st-ending', done: 'st-done' };

export default function EventList({ events, onDelete }) {
  const today = todayStr();
  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`;
  const monthEnd = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(new Date(now.getFullYear(), now.getMonth()+1, 0).getDate()).padStart(2,'0')}`;

  const monthEvents = events
    .filter(ev => ev.startDate <= monthEnd && ev.endDate >= monthStart)
    .map(ev => ({ ...ev, status: getStatus(ev, today) }))
    .sort((a, b) => {
      const order = { ending: 0, active: 1, upcoming: 2, done: 3 };
      return (order[a.status] - order[b.status]) || a.startDate.localeCompare(b.startDate);
    });

  const counts = { active: 0, upcoming: 0, ending: 0, done: 0 };
  monthEvents.forEach(ev => counts[ev.status]++);

  return (
    <div className="elist card">
      <div className="card-header">
        <span className="card-title">이번달 행사</span>
        <span className="card-sub">{now.getMonth()+1}월 · 총 {monthEvents.length}건</span>
      </div>

      <div className="elist-summary">
        <div className="sum-item">
          <span className="sum-dot dot-active" />
          <span className="sum-label">진행 중</span>
          <span className="sum-val">{counts.active}</span>
        </div>
        <div className="sum-item">
          <span className="sum-dot dot-ending" />
          <span className="sum-label">곧 종료</span>
          <span className="sum-val warn">{counts.ending}</span>
        </div>
        <div className="sum-item">
          <span className="sum-dot dot-upcoming" />
          <span className="sum-label">예정</span>
          <span className="sum-val">{counts.upcoming}</span>
        </div>
        <div className="sum-item">
          <span className="sum-dot dot-done" />
          <span className="sum-label">종료</span>
          <span className="sum-val muted">{counts.done}</span>
        </div>
      </div>

      <div className="elist-body">
        {monthEvents.length === 0 && (
          <div className="elist-empty">이번달 등록된 행사가 없습니다</div>
        )}
        {monthEvents.map(ev => {
          const dd = ev.status !== 'done' ? dday(ev.endDate) : null;
          return (
            <div key={ev.id} className={`elist-row ${STATUS_CLASS[ev.status]}`}>
              <div className="elist-row-left">
                <span
                  className="elist-plat"
                  style={{ background: PLAT_COLOR[ev.platform] || PLAT_COLOR['전체'] }}
                >{ev.platform}</span>
                <div className="elist-info">
                  <span className="elist-model">{ev.modelCode}</span>
                  {ev.salePrice && (
                    <span className="elist-price">{Number(ev.salePrice).toLocaleString()}원</span>
                  )}
                  {ev.memo && <span className="elist-memo">{ev.memo}</span>}
                </div>
              </div>
              <div className="elist-row-right">
                <span className={`elist-status ${STATUS_CLASS[ev.status]}`}>{STATUS_LABEL[ev.status]}</span>
                {dd && <span className="elist-dday">{dd}</span>}
                <span className="elist-dates">{ev.startDate.slice(5)} ~ {ev.endDate.slice(5)}</span>
                <button
                  className="elist-del"
                  onClick={() => {
                    if (window.confirm(`"${ev.platform} · ${ev.modelCode}" 삭제?`)) onDelete(ev.id);
                  }}
                  title="삭제"
                >×</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
