import './PromoList.css';

const PLAT_COLOR = { 쿠팡: '#E5413A', 네이버: '#03C75A', 지마켓: '#FF6600', 전체: '#2563eb' };

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function dday(endDate) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const diff = Math.round((new Date(endDate + 'T00:00:00') - today) / 86400000);
  if (diff < 0) return null;
  if (diff === 0) return 'D-day';
  return `D-${diff}`;
}

function getStatus(p, today) {
  if (p.endDate < today) return 'done';
  if (p.startDate > today) return 'upcoming';
  const diff = Math.round((new Date(p.endDate + 'T00:00:00') - new Date(today + 'T00:00:00')) / 86400000);
  return diff <= 3 ? 'ending' : 'active';
}

const STATUS_LABEL = { active: '진행 중', upcoming: '예정', ending: '곧 종료', done: '종료' };
const STATUS_CLASS = { active: 'st-active', upcoming: 'st-upcoming', ending: 'st-ending', done: 'st-done' };

export default function PromoList({ promotions = [], onSelect, selectedId }) {
  const today = todayStr();
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const monthStart = `${y}-${m}-01`;
  const monthEnd   = `${y}-${m}-${String(new Date(y, now.getMonth()+1, 0).getDate()).padStart(2,'0')}`;

  const list = promotions
    .filter(p => p.startDate <= monthEnd && p.endDate >= monthStart)
    .map(p => ({ ...p, status: getStatus(p, today) }))
    .sort((a, b) => {
      const order = { ending: 0, active: 1, upcoming: 2, done: 3 };
      return (order[a.status] - order[b.status]) || a.startDate.localeCompare(b.startDate);
    });

  const counts = { active: 0, upcoming: 0, ending: 0, done: 0 };
  list.forEach(p => counts[p.status]++);

  return (
    <div className="plist card">
      <div className="card-header">
        <span className="card-title">이번달 행사</span>
        <span className="card-sub">{now.getMonth()+1}월 · 총 {list.length}건</span>
      </div>

      <div className="plist-summary">
        {[['active','진행 중'], ['ending','곧 종료'], ['upcoming','예정'], ['done','종료']].map(([k, label]) => (
          <div key={k} className="psum-item">
            <span className={`psum-dot dot-${k}`} />
            <span className="psum-label">{label}</span>
            <span className={`psum-val${k === 'ending' ? ' warn' : k === 'done' ? ' muted' : ''}`}>{counts[k]}</span>
          </div>
        ))}
      </div>

      <div className="plist-body">
        {list.length === 0 && <div className="plist-empty">이번달 등록된 행사가 없습니다</div>}
        {list.map(p => {
          const dd = p.status !== 'done' ? dday(p.endDate) : null;
          return (
            <div
              key={p.id}
              className={`prow ${STATUS_CLASS[p.status]}${p.id === selectedId ? ' selected' : ''}`}
              onClick={() => onSelect(p)}
            >
              <div className="prow-left">
                <span className="prow-plat" style={{ background: PLAT_COLOR[p.platform] || PLAT_COLOR['전체'] }}>
                  {p.platform}
                </span>
                <div className="prow-info">
                  <span className="prow-name">{p.promotionName}</span>
                  <span className="prow-detail">
                    {p.models?.length || 0}개 모델 · {p.startDate.slice(5)} ~ {p.endDate.slice(5)}
                  </span>
                </div>
              </div>
              <div className="prow-right">
                <span className={`prow-status ${STATUS_CLASS[p.status]}`}>{STATUS_LABEL[p.status]}</span>
                {dd && <span className="prow-dday">{dd}</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
