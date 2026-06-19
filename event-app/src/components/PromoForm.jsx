import { useState, useEffect, useCallback, useRef } from 'react';
import './PromoForm.css';

const PLATFORMS  = ['쿠팡', '네이버', '지마켓', '전체'];
const PLAT_COLOR = { 쿠팡: '#E5413A', 네이버: '#03C75A', 지마켓: '#FF6600', 전체: '#2563eb' };

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function authHeader() {
  const token = localStorage.getItem('auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/* 컬럼: 모델코드 / 할인율 / 행사가 / 메모 */
function parsePaste(text) {
  return text.trim().split('\n')
    .map(l => l.trim()).filter(Boolean)
    .map(line => {
      const cols = line.split('\t');
      return {
        modelCode:    (cols[0] || '').trim(),
        discountRate: (cols[1] || '').trim().replace(/%/g, ''),
        salePrice:    (cols[2] || '').trim().replace(/,/g, ''),
        memo:         (cols[3] || '').trim(),
      };
    })
    .filter(r => r.modelCode);
}

/* 모델코드 → 제품 매핑 + 행사가 계산 (할인율 우선, 없으면 행사가 직접 입력) */
function resolveModels(rawRows, products) {
  const result = [];
  for (const row of rawRows) {
    const input = row.modelCode.trim();
    if (!input) continue;

    const normalized = input.replace(/\s+(일반|무결점)$/, '_$1');
    const direct = products.find(p => p.modelName === normalized || p.modelName === input);
    if (direct) { result.push(makeRow(direct, row)); continue; }

    const hasSuffix = /[_ ](일반|무결점)$/.test(input);
    if (!hasSuffix) {
      const variants = products.filter(p => p.modelName.startsWith(input + '_'));
      if (variants.length > 0) {
        variants.forEach(v => result.push(makeRow(v, row)));
        continue;
      }
    }

    result.push({
      modelCode:    input,
      discountRate: row.discountRate || '',
      salePrice:    row.salePrice    || '',
      memo:         row.memo         || '',
      _autoPrice:   false,
    });
  }
  return result;
}

function makeRow(product, rawRow) {
  const rate = parseFloat(rawRow.discountRate) || 0;
  let salePrice  = '';
  let _autoPrice = false;

  if (rate > 0 && product.salePrice) {
    /* 할인율 입력 → 자동 계산 */
    salePrice  = String(Math.round(Number(product.salePrice) * (1 - rate / 100)));
    _autoPrice = true;
  } else {
    /* 행사가 직접 입력 */
    salePrice = rawRow.salePrice || '';
  }

  return {
    modelCode:    product.modelName,
    discountRate: rawRow.discountRate || '',
    salePrice,
    memo:         rawRow.memo || '',
    _autoPrice,
  };
}

export default function PromoForm({ onSubmit }) {
  const [promoName,  setPromoName]  = useState('');
  const [platform,   setPlatform]   = useState('쿠팡');
  const [startDate,  setStartDate]  = useState(todayStr());
  const [endDate,    setEndDate]    = useState(todayStr());
  const [pasteText,  setPasteText]  = useState('');
  const [preview,    setPreview]    = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [msg,        setMsg]        = useState(null);
  const [products,   setProducts]   = useState([]);
  const productsRef = useRef([]);

  useEffect(() => {
    fetch('/api/products', { headers: authHeader() })
      .then(r => r.ok ? r.json() : { products: [] })
      .then(d => { setProducts(d.products || []); productsRef.current = d.products || []; })
      .catch(() => {});
  }, []);

  const rebuildPreview = useCallback((text, prods) => {
    setPreview(resolveModels(parsePaste(text), prods));
  }, []);

  function handlePasteChange(e) {
    const text = e.target.value;
    setPasteText(text);
    rebuildPreview(text, productsRef.current);
    setMsg(null);
  }

  useEffect(() => {
    if (products.length > 0 && pasteText) rebuildPreview(pasteText, products);
  }, [products]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSubmit() {
    if (!promoName.trim())      { setMsg({ type: 'error', text: '프로모션명을 입력해주세요' }); return; }
    if (!preview.length)        { setMsg({ type: 'error', text: '모델 목록을 붙여넣어 주세요' }); return; }
    if (!startDate || !endDate) { setMsg({ type: 'error', text: '날짜를 입력해주세요' }); return; }
    if (startDate > endDate)    { setMsg({ type: 'error', text: '종료일이 시작일보다 빠릅니다' }); return; }

    setSubmitting(true); setMsg(null);
    try {
      const name = promoName.trim();
      await onSubmit({
        promotionName: name,
        platform,
        startDate,
        endDate,
        models: preview.map(r => ({ modelCode: r.modelCode, salePrice: r.salePrice, memo: r.memo })),
      });
      setPromoName(''); setPasteText(''); setPreview([]);
      setMsg({ type: 'success', text: `✓ "${name}" 등록 완료 (${preview.length}개 모델)` });
    } catch (e) {
      setMsg({ type: 'error', text: e.message });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="pform card">
      <div className="card-header">
        <span className="card-title">행사 일괄 등록</span>
      </div>
      <div className="pform-body">

        {/* 프로모션명 */}
        <div className="pform-row pform-col">
          <label className="pform-label">프로모션명</label>
          <input
            className="pform-input"
            placeholder="예: 6월 쿠팡 단독 특가"
            value={promoName}
            onChange={e => setPromoName(e.target.value)}
          />
        </div>

        {/* 플랫폼 */}
        <div className="pform-row">
          <label className="pform-label">플랫폼</label>
          <div className="plat-btns">
            {PLATFORMS.map(p => (
              <button
                key={p}
                className={`plat-btn${platform === p ? ' active' : ''}`}
                style={platform === p ? { background: PLAT_COLOR[p], color: '#fff', borderColor: PLAT_COLOR[p] } : {}}
                onClick={() => setPlatform(p)}
              >{p}</button>
            ))}
          </div>
        </div>

        {/* 기간 */}
        <div className="pform-row">
          <label className="pform-label">기간</label>
          <div className="date-row">
            <input type="date" className="date-input" value={startDate} onChange={e => setStartDate(e.target.value)} />
            <span className="date-sep">~</span>
            <input type="date" className="date-input" value={endDate}   onChange={e => setEndDate(e.target.value)} />
          </div>
        </div>

        {/* 모델 목록 붙여넣기 */}
        <div className="pform-row pform-col">
          <label className="pform-label">
            모델 목록
            <span className="pform-hint"> 모델코드 · 할인율 · 행사가 · 메모 Ctrl+V</span>
          </label>
          <textarea
            className="paste-area"
            placeholder={"모델코드\t할인율\t행사가\t메모\n(할인율 입력 시 행사가 자동 계산)"}
            value={pasteText}
            onChange={handlePasteChange}
            rows={4}
          />
        </div>

        {/* 미리보기 */}
        {preview.length > 0 && (
          <div className="preview-wrap">
            <div className="preview-count">{preview.length}건 인식됨</div>
            <div className="preview-table-wrap">
              <table className="preview-tbl">
                <thead>
                  <tr><th>#</th><th>모델코드</th><th>할인율</th><th>행사가</th><th>메모</th></tr>
                </thead>
                <tbody>
                  {preview.map((r, i) => (
                    <tr key={i}>
                      <td className="mono">{i + 1}</td>
                      <td className="mono">{r.modelCode}</td>
                      <td className="num disc">
                        {r.discountRate ? `${r.discountRate}%` : ''}
                      </td>
                      <td className={`num${r._autoPrice ? ' auto-calc' : ''}`}>
                        {r.salePrice ? Number(r.salePrice).toLocaleString() : ''}
                        {r._autoPrice && <span className="auto-tag">자동</span>}
                      </td>
                      <td>{r.memo}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {msg && <div className={`pform-msg ${msg.type}`}>{msg.text}</div>}

        <button
          className="btn btn-primary pform-submit"
          onClick={handleSubmit}
          disabled={submitting || preview.length === 0 || !promoName.trim()}
        >
          {submitting ? '등록 중...' : `▶ ${preview.length}건 일괄 등록`}
        </button>
      </div>
    </div>
  );
}
