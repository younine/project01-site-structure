import { useState, useRef, useEffect } from 'react';

const TOKEN_KEY = 'auth_token';

function authHeader() {
  const t = localStorage.getItem(TOKEN_KEY);
  return t ? { Authorization: `Bearer ${t}` } : {};
}

const FIELD_LABELS = [
  { key: '상품명',                    label: '상품명' },
  { key: '화면크기(cm)',              label: '화면크기 (cm)' },
  { key: '화면크기(in)',              label: '화면크기 (in)' },
  { key: '해상도',                    label: '해상도' },
  { key: '화면 재생빈도(Hz)',         label: '재생빈도 (Hz)' },
  { key: '모니터 패널',               label: '패널' },
  { key: '모니터 화면비율',           label: '화면비율' },
  { key: '모니터 형태',               label: '형태' },
  { key: '밝기',                      label: '밝기 (nit)' },
  { key: '출시년월',                  label: '출시년월' },
  { key: '출시 연도',                 label: '출시 연도' },
  { key: '응답속도',                  label: '응답속도' },
  { key: 'HDMI 포트 개수',            label: 'HDMI 포트 수' },
  { key: 'Display Port 단자개수',     label: 'DisplayPort 수' },
  { key: 'USB Type-C 단자 개수',      label: 'USB Type-C 수' },
  { key: '모니터 자체스피커 장착여부', label: '스피커 내장' },
  { key: '터치 기능여부',             label: '터치 기능' },
  { key: '휴대용 여부',               label: '휴대용' },
  { key: '무게',                      label: '무게' },
];

export default function RegisterPanel({ isAdmin }) {
  const [productCode, setProductCode] = useState('');
  const [fields, setFields]           = useState(null);
  const [loading, setLoading]         = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError]             = useState('');

  const [templates, setTemplates]       = useState([]);
  const [selectedTpl, setSelectedTpl]   = useState('estimate.xlsx');
  const [templateFile, setTemplateFile] = useState(null);
  const [uploading, setUploading]       = useState(false);
  const [uploadError, setUploadError]   = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetch('/api/coupang/register/templates', { headers: authHeader() })
      .then(r => r.ok ? r.json() : [])
      .then(list => {
        setTemplates(list);
        if (list.length > 0) setSelectedTpl(list[0].name);
      })
      .catch(() => {});
  }, []);

  async function handlePreview() {
    if (!productCode.trim()) return;
    setLoading(true);
    setError('');
    setFields(null);
    try {
      const r = await fetch('/api/coupang/register/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify({ product_code: productCode.trim() }),
      });
      const data = await r.json();
      if (!r.ok || data.error) { setError(data.error || '조회 실패'); return; }
      setFields(data);
    } catch (e) {
      setError('서버 연결 오류: ' + e.message);
    } finally {
      setLoading(false);
    }
  }

  function handleFieldChange(key, value) {
    setFields(prev => ({ ...prev, [key]: value }));
  }

  async function handleDownload() {
    if (!fields) return;
    setDownloading(true);
    setError('');
    try {
      const r = await fetch('/api/coupang/register/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify({ ...fields, _template: selectedTpl }),
      });
      if (!r.ok) {
        const data = await r.json().catch(() => ({}));
        setError(data.error || '다운로드 실패');
        return;
      }
      const blob = await r.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `쿠팡_신제품등록_${productCode}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError('다운로드 오류: ' + e.message);
    } finally {
      setDownloading(false);
    }
  }

  async function handleTemplateUpload() {
    if (!templateFile) return;
    setUploading(true);
    setUploadError('');
    try {
      const fd = new FormData();
      fd.append('file', templateFile);
      const r = await fetch('/api/coupang/register/template', {
        method: 'POST',
        headers: authHeader(),
        body: fd,
      });
      const data = await r.json();
      if (!r.ok || data.error) { setUploadError(data.error || '업로드 실패'); return; }
      setTemplates(data.templates || []);
      setSelectedTpl('estimate.xlsx');
      setTemplateFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (e) {
      setUploadError('업로드 오류: ' + e.message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <>
      {/* 조회 섹션 */}
      <div className="card">
        <div className="card-title">다나와 상품코드 조회</div>
        <div className="search-row">
          <input
            className="search-input"
            placeholder="상품코드 입력 (예: 41263007)"
            value={productCode}
            onChange={e => setProductCode(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handlePreview()}
          />
          <button className="btn btn-primary" onClick={handlePreview} disabled={loading || !productCode.trim()}>
            {loading ? <><span className="spinner" />조회 중...</> : '조회'}
          </button>
        </div>
        {error && <div className="msg-error">{error}</div>}
      </div>

      {/* 스펙 테이블 */}
      {fields && (
        <div className="card">
          <div className="card-title">스펙 확인 및 수정</div>
          <table className="spec-table">
            <tbody>
              {FIELD_LABELS.map(({ key, label }) => (
                <tr key={key}>
                  <th>{label}</th>
                  <td>
                    <input
                      className="spec-input"
                      value={fields[key] ?? ''}
                      onChange={e => handleFieldChange(key, e.target.value)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* 양식 선택 + 다운로드 */}
          <div style={{ marginTop: 16, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            {templates.length > 1 && (
              <div className="tpl-select-wrap">
                {templates.map(t => (
                  <button
                    key={t.name}
                    className={`btn btn-tpl${selectedTpl === t.name ? ' active' : ''}`}
                    onClick={() => setSelectedTpl(t.name)}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            )}
            <button className="btn btn-success" onClick={handleDownload} disabled={downloading}>
              {downloading ? <><span className="spinner" />생성 중...</> : '📥 엑셀 다운로드'}
            </button>
          </div>
        </div>
      )}

      {/* 관리자 전용 템플릿 업로드 */}
      {isAdmin && (
        <div className="card">
          <div className="admin-title">관리자 — 양식 파일 교체</div>

          {/* 저장된 양식 목록 */}
          {templates.length > 0 && (
            <div className="tpl-list">
              {templates.map(t => (
                <span
                  key={t.name}
                  className={`tpl-chip${selectedTpl === t.name ? ' active' : ''}`}
                  onClick={() => setSelectedTpl(t.name)}
                  title={t.name}
                >
                  {t.label}
                </span>
              ))}
            </div>
          )}

          <div className="upload-row" style={{ marginTop: 10 }}>
            <label className="file-label">
              📎 xlsx 파일 선택
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx"
                style={{ display: 'none' }}
                onChange={e => setTemplateFile(e.target.files[0] || null)}
              />
            </label>
            {templateFile && <span className="file-name">{templateFile.name}</span>}
            <button
              className="btn btn-primary"
              onClick={handleTemplateUpload}
              disabled={uploading || !templateFile}
            >
              {uploading ? <><span className="spinner" />업로드 중...</> : '업로드'}
            </button>
          </div>
          {uploadError && <div className="msg-error" style={{ marginTop: 8 }}>{uploadError}</div>}
        </div>
      )}
    </>
  );
}
