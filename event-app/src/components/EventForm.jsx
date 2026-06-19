import { useState } from 'react';
import './EventForm.css';

const PLATFORMS = ['쿠팡', '네이버', '지마켓', '전체'];
const PLAT_COLOR = { 쿠팡: '#E5413A', 네이버: '#03C75A', 지마켓: '#FF6600', 전체: '#2563eb' };

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function parsePaste(text) {
  return text.trim().split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      const cols = line.split('\t');
      return {
        modelCode: (cols[0] || '').trim(),
        salePrice: (cols[1] || '').trim().replace(/,/g, ''),
        memo: (cols[2] || '').trim(),
      };
    })
    .filter(r => r.modelCode);
}

export default function EventForm({ onSubmit }) {
  const [platform, setPlatform] = useState('쿠팡');
  const [startDate, setStartDate] = useState(todayStr());
  const [endDate, setEndDate] = useState(todayStr());
  const [pasteText, setPasteText] = useState('');
  const [preview, setPreview] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState(null);

  function handlePaste(e) {
    const text = e.target.value;
    setPasteText(text);
    setPreview(parsePaste(text));
    setMsg(null);
  }

  async function handleSubmit() {
    if (!preview.length) return;
    if (!startDate || !endDate) { setMsg({ type: 'error', text: '날짜를 입력해주세요' }); return; }
    if (startDate > endDate) { setMsg({ type: 'error', text: '종료일이 시작일보다 빠릅니다' }); return; }

    setSubmitting(true);
    setMsg(null);
    try {
      const items = preview.map(r => ({
        platform,
        startDate,
        endDate,
        modelCode: r.modelCode,
        salePrice: r.salePrice,
        memo: r.memo,
      }));
      await onSubmit(items);
      setPasteText('');
      setPreview([]);
      setMsg({ type: 'success', text: `${items.length}건 등록 완료` });
    } catch (e) {
      setMsg({ type: 'error', text: e.message });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="eform card">
      <div className="card-header">
        <span className="card-title">행사 일괄 등록</span>
      </div>
      <div className="eform-body">
        <div className="eform-row">
          <label className="eform-label">플랫폼</label>
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

        <div className="eform-row">
          <label className="eform-label">기간</label>
          <div className="date-row">
            <input type="date" className="date-input" value={startDate} onChange={e => setStartDate(e.target.value)} />
            <span className="date-sep">~</span>
            <input type="date" className="date-input" value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>
        </div>

        <div className="eform-row eform-col">
          <label className="eform-label">
            붙여넣기 <span className="eform-hint">엑셀에서 모델코드 · 행사가 · 메모 컬럼 선택 후 Ctrl+V</span>
          </label>
          <textarea
            className="paste-area"
            placeholder={"모델코드\t행사가\t메모\n모델코드\t행사가\t메모\n..."}
            value={pasteText}
            onChange={handlePaste}
            rows={5}
          />
        </div>

        {preview.length > 0 && (
          <div className="preview-wrap">
            <div className="preview-count">{preview.length}건 인식됨</div>
            <div className="preview-table-wrap">
              <table className="preview-tbl">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>모델코드</th>
                    <th>행사가</th>
                    <th>메모</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((r, i) => (
                    <tr key={i}>
                      <td className="mono">{i + 1}</td>
                      <td className="mono">{r.modelCode}</td>
                      <td className="num">{r.salePrice ? Number(r.salePrice).toLocaleString() : ''}</td>
                      <td>{r.memo}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {msg && (
          <div className={`eform-msg ${msg.type}`}>{msg.text}</div>
        )}

        <button
          className="btn btn-primary eform-submit"
          onClick={handleSubmit}
          disabled={submitting || preview.length === 0}
        >
          {submitting ? '등록 중...' : `▶ ${preview.length}건 일괄 등록`}
        </button>
      </div>
    </div>
  );
}
