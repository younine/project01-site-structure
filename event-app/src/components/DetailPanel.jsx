import './DetailPanel.css';

const PLAT_COLOR = {
  쿠팡:  '#E5413A',
  네이버: '#03C75A',
  지마켓: '#FF6600',
  전체:  '#2563eb',
};

export default function DetailPanel({ promotion, onClose, onDelete }) {
  const open = !!promotion;

  async function handleDelete() {
    if (!window.confirm(
      `"${promotion.promotionName}" 프로모션을 삭제할까요?\n참여 모델 ${promotion.models?.length || 0}건도 함께 삭제됩니다.`
    )) return;
    await onDelete(promotion.id);
  }

  return (
    <div className={`detail-panel${open ? ' open' : ''}`}>
      {open && (
        <>
          <div className="dp-header">
            <div className="dp-title-area">
              <span className="dp-plat-badge" style={{ background: PLAT_COLOR[promotion.platform] || PLAT_COLOR['전체'] }}>
                {promotion.platform}
              </span>
              <h3 className="dp-title">{promotion.promotionName}</h3>
            </div>
            <button className="dp-close" onClick={onClose} title="닫기">✕</button>
          </div>

          <div className="dp-meta">
            <span className="dp-date">{promotion.startDate} ~ {promotion.endDate}</span>
            <span className="dp-model-count">{promotion.models?.length || 0}개 모델</span>
          </div>

          <div className="dp-models">
            {(promotion.models?.length || 0) === 0 ? (
              <div className="dp-empty">모델이 없습니다</div>
            ) : (
              <table className="dp-tbl">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>모델코드</th>
                    <th>행사가</th>
                    <th>메모</th>
                  </tr>
                </thead>
                <tbody>
                  {(promotion.models || []).map((m, i) => (
                    <tr key={i}>
                      <td className="dp-num">{i + 1}</td>
                      <td className="dp-code">{m.modelCode}</td>
                      <td className="dp-price">
                        {m.salePrice ? Number(m.salePrice).toLocaleString() + '원' : '-'}
                      </td>
                      <td className="dp-memo">{m.memo || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="dp-footer">
            <button className="btn btn-danger dp-del-btn" onClick={handleDelete}>
              이 프로모션 삭제
            </button>
          </div>
        </>
      )}
    </div>
  );
}
