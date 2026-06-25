import './DetailPanel.css';

const PLAT_COLOR = {
  쿠팡:  '#E5413A',
  네이버: '#03C75A',
  지마켓: '#FF6600',
  전체:  '#2563eb',
};

function toNum(val) {
  const n = Number(String(val || '').replace(/,/g, ''));
  return isNaN(n) ? 0 : n;
}

function fmtPrice(val) {
  const n = toNum(val);
  return n ? n.toLocaleString('ko-KR') + '원' : '-';
}

function extractRate(text) {
  const m = String(text || '').match(/(\d+(?:\.\d+)?)\s*%/);
  return m ? parseFloat(m[1]) : null;
}

// 할인액 패턴: "2만원할인", "5,000원 할인", "10000원 할인" 등
function extractAmount(text) {
  const s = String(text || '');
  if (!s.includes('할인') && !s.includes('원')) return null;
  // "2만원", "2.5만원" 형태 먼저 처리
  const manM = s.match(/(\d+(?:\.\d+)?)\s*만\s*원?/);
  if (manM) return Math.round(parseFloat(manM[1]) * 10000);
  const m = s.match(/([\d,]+)\s*원?/);
  if (!m) return null;
  const n = toNum(m[1]);
  return n > 0 ? n : null;
}

// salePrice 파싱: rate / amount / price / none
function parseSalePrice(salePrice) {
  const s = String(salePrice || '').trim();
  if (!s) return { type: 'none' };
  if (s.includes('%')) return { type: 'rate', value: extractRate(s) };
  if (s.includes('할인') || (s.includes('원') && toNum(s) > 0))
    return { type: 'amount', value: extractAmount(s) };
  const n = toNum(s);
  if (n > 0) return { type: 'price', value: n };
  return { type: 'none' };
}

// { type: 'rate'|'amount'|'none', display, benefitPrice }
function calcDiscount(base, eventPrice, memo) {
  const b = toNum(base);

  const sp = parseSalePrice(eventPrice);

  if (sp.type === 'rate' && sp.value) {
    const benefit = b ? Math.round(b * (1 - sp.value / 100)) : null;
    return { type: 'rate', display: `${sp.value}%`, benefitPrice: benefit };
  }
  if (sp.type === 'amount' && sp.value) {
    const benefit = b ? b - sp.value : null;
    return { type: 'amount', display: sp.value.toLocaleString('ko-KR') + '원', benefitPrice: benefit };
  }
  if (sp.type === 'price' && sp.value) {
    const rate = b && sp.value < b ? Math.round((b - sp.value) / b * 100) : null;
    return { type: 'rate', display: rate ? `${rate}%` : null, benefitPrice: sp.value };
  }

  // memo에서 추출
  const rate = extractRate(memo);
  if (rate && b) {
    return { type: 'rate', display: `${rate}%`, benefitPrice: Math.round(b * (1 - rate / 100)) };
  }
  const amt = extractAmount(memo);
  if (amt && b) {
    return { type: 'amount', display: amt.toLocaleString('ko-KR') + '원', benefitPrice: b - amt };
  }

  return { type: 'none', display: null, benefitPrice: null };
}

export default function DetailPanel({ promotion, onClose, onDelete }) {
  const open = !!promotion;

  async function handleDelete() {
    if (!window.confirm(
      `"${promotion.promotionName}" 프로모션을 삭제할까요?\n참여 모델 ${promotion.models?.length || 0}건도 함께 삭제됩니다.`
    )) return;
    await onDelete(promotion.id);
  }

  const hasChannelCode = (promotion?.models || []).some(m => m.channelCode);
  const hasPrice = (promotion?.models || []).some(m => m.baseSalePrice);

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
                    {hasChannelCode && <th>상품코드</th>}
                    <th>모델명</th>
                    {hasPrice && <th>판매가</th>}
                    {hasPrice && <th>할인</th>}
                    {hasPrice && <th>최종 혜택가</th>}
                    <th>메모</th>
                  </tr>
                </thead>
                <tbody>
                  {(promotion.models || []).map((m, i) => {
                    const disc = calcDiscount(m.baseSalePrice, m.salePrice, m.memo);
                    return (
                      <tr key={i}>
                        <td className="dp-num">{i + 1}</td>
                        {hasChannelCode && (
                          <td className="dp-code">{m.channelCode || '-'}</td>
                        )}
                        <td className="dp-model">{m.shortModelName || m.modelCode}</td>
                        {hasPrice && (
                          <td className="dp-price">{fmtPrice(m.baseSalePrice)}</td>
                        )}
                        {hasPrice && (
                          <td className="dp-rate">
                            {disc.display ? (
                              <span className={`dp-discount dp-discount-${disc.type}`}>{disc.display}</span>
                            ) : '-'}
                          </td>
                        )}
                        {hasPrice && (
                          <td className="dp-benefit">
                            {disc.benefitPrice ? (
                              <strong>{disc.benefitPrice.toLocaleString('ko-KR')}원</strong>
                            ) : '-'}
                          </td>
                        )}
                        <td className="dp-memo">{m.memo || '-'}</td>
                      </tr>
                    );
                  })}
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
