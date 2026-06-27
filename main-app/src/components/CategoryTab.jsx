import { useState, useRef, useEffect } from 'react';
import { authFetch } from './authFetch';
import CandidateList from './CandidateList';

const MONITOR_FIELDS = [
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

const FIELD_MAP = {
  monitor: MONITOR_FIELDS,
};

// 입력값에서 상품코드 배열 파싱 (콤마 또는 개행 구분)
function parseCodes(input) {
  return input.split(/[\n,]+/).map(c => c.trim()).filter(Boolean);
}

export default function CategoryTab({ category, isAdmin }) {
  const { id: catId, label: catLabel, hasCSV } = category;
  const fieldDefs = FIELD_MAP[catId] || null;

  const [productCode, setProductCode]   = useState('');
  const [batchResults, setBatchResults] = useState(null);
  const [loading, setLoading]           = useState(false);
  const [downloading, setDownloading]   = useState(false);
  const [error, setError]               = useState('');

  const [templates, setTemplates]       = useState([]);
  const [selectedTpl, setSelectedTpl]   = useState('estimate.xlsx');
  const [templateFile, setTemplateFile] = useState(null);
  const [uploading, setUploading]       = useState(false);
  const [uploadError, setUploadError]   = useState('');
  const [deleting, setDeleting]         = useState(false);
  const fileInputRef = useRef(null);

  const [asContact, setAsContact]       = useState('');
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsMsg, setSettingsMsg]   = useState('');

  useEffect(() => {
    authFetch(`/api/coupang/register/templates?category=${catId}`)
      .then(r => r.ok ? r.json() : [])
      .then(list => {
        setTemplates(list);
        if (list.length > 0) setSelectedTpl(list[0].name);
      })
      .catch(() => {});
    authFetch(`/api/coupang/register/settings?category=${catId}`)
      .then(r => r.ok ? r.json() : {})
      .then(s => { if (s.as_contact) setAsContact(s.as_contact); })
      .catch(() => {});
  }, [catId]);

  async function handleSaveSettings() {
    setSavingSettings(true);
    setSettingsMsg('');
    try {
      const r = await authFetch('/api/coupang/register/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: catId, as_contact: asContact }),
      });
      if (!r.ok) { const d = await r.json().catch(() => ({})); setSettingsMsg(d.error || '저장 실패'); return; }
      setSettingsMsg('저장됐습니다');
      setTimeout(() => setSettingsMsg(''), 2000);
    } catch (e) {
      setSettingsMsg('오류: ' + e.message);
    } finally {
      setSavingSettings(false);
    }
  }

  async function handleSearch(overrideCode) {
    const input = overrideCode !== undefined ? overrideCode : productCode;
    const codes = parseCodes(input);
    if (!codes.length) return;
    setLoading(true);
    setError('');
    setBatchResults(null);

    {
      // 단일/다중 모두 동일한 배치 플로우
      try {
        const results = await Promise.all(codes.map(async code => {
          try {
            const r = await authFetch('/api/coupang/register/preview', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ product_code: code, category: catId }),
            });
            const data = await r.json();
            if (!r.ok || data.error) return { code, fields: null, error: data.error || '조회 실패' };
            return { code, fields: data, error: null };
          } catch (e) {
            return { code, fields: null, error: e.message };
          }
        }));
        setBatchResults(results);
      } finally {
        setLoading(false);
      }
    }
  }

  async function triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a   = document.createElement('a');
    a.href     = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleBatchDownload() {
    if (!batchResults) return;
    const validRows = batchResults.filter(r => r.fields).map(r => r.fields);
    if (!validRows.length) return;
    setDownloading(true);
    setError('');
    try {
      const r = await authFetch('/api/coupang/register/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: validRows, _template: selectedTpl, _category: catId }),
      });
      if (!r.ok) { const d = await r.json().catch(() => ({})); setError(d.error || '다운로드 실패'); return; }
      await triggerDownload(await r.blob(), `쿠팡_신제품등록_${catLabel}_${validRows.length}개.xlsx`);
    } catch (e) {
      setError('다운로드 오류: ' + e.message);
    } finally {
      setDownloading(false);
    }
  }

  async function handleDelete() {
    if (!selectedTpl) return;
    if (!window.confirm(`"${selectedTpl}" 파일을 삭제하시겠습니까?`)) return;
    setDeleting(true);
    setUploadError('');
    try {
      const r = await authFetch('/api/coupang/register/template', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: catId, name: selectedTpl }),
      });
      const data = await r.json();
      if (!r.ok || data.error) { setUploadError(data.error || '삭제 실패'); return; }
      const list = data.templates || [];
      setTemplates(list);
      setSelectedTpl(list.length > 0 ? list[0].name : '');
    } catch (e) {
      setUploadError('삭제 오류: ' + e.message);
    } finally {
      setDeleting(false);
    }
  }

  async function handleTemplateUpload() {
    if (!templateFile) return;
    setUploading(true);
    setUploadError('');
    try {
      const fd = new FormData();
      fd.append('file', templateFile);
      fd.append('category', catId);
      const r = await authFetch('/api/coupang/register/template', {
        method: 'POST',
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

  const hasTemplate    = templates.length > 0;
  const validCount     = batchResults ? batchResults.filter(r => r.fields).length : 0;

  // 양식 선택 드롭다운 (공통)
  const TplSelect = () => templates.length > 0 ? (
    <>
      <span style={{ fontSize: 12, color: 'var(--text2)', whiteSpace: 'nowrap' }}>발주서 양식</span>
      <select className="tpl-select" value={selectedTpl} onChange={e => setSelectedTpl(e.target.value)}>
        {templates.map(t => <option key={t.name} value={t.name}>{t.label}</option>)}
      </select>
    </>
  ) : (
    <span style={{ fontSize: 12, color: 'var(--warn)' }}>⚠ 양식 파일이 없습니다</span>
  );

  function handleCandidateSelect(code) {
    setProductCode(code);
    handleSearch(code);
  }

  return (
    <>
      {/* 조회 섹션 */}
      <div className="card">
        <div className="card-title">{catLabel} — 다나와 상품코드 조회</div>

        {hasCSV ? (
          <div className="search-row" style={{ alignItems: 'flex-start' }}>
            <textarea
              className="search-textarea"
              placeholder={'상품코드 입력\n여러 개: 콤마(,) 또는 줄바꿈으로 구분'}
              value={productCode}
              onChange={e => setProductCode(e.target.value)}
              rows={2}
            />
            <button className="btn btn-primary" onClick={() => handleSearch()} disabled={loading || !productCode.trim()}>
              {loading ? <><span className="spinner" />조회 중...</> : '조회'}
            </button>
          </div>
        ) : (
          <div style={{ fontSize: 12, color: 'var(--text3)', padding: '0 16px 12px' }}>자동 조회 미지원 카테고리입니다</div>
        )}
        {error && <div className="msg-error">{error}</div>}
      </div>

      {/* 조회 결과 테이블 */}
      {batchResults && (
        <div className="card">
          <div className="card-title">
            조회 결과
            <span style={{ marginLeft: 8, fontWeight: 400, color: validCount > 0 ? 'var(--down)' : 'var(--text3)' }}>
              {validCount}/{batchResults.length}개 조회됨
            </span>
          </div>
          <table className="spec-table batch-table" style={{ tableLayout: 'fixed', width: '100%' }}>
            <thead>
              <tr>
                <th style={{ width: 110 }}>상품코드</th>
                <th style={{ width: '30%' }}>상품명</th>
                <th>Full Spec</th>
                <th style={{ width: 56 }}>상태</th>
              </tr>
            </thead>
            <tbody>
              {batchResults.map(({ code, fields: f, error: e }) => (
                <tr key={code}>
                  <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{code}</td>
                  <td style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {f ? f['상품명'] : <span style={{ color: 'var(--text3)' }}>—</span>}
                  </td>
                  <td style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text2)', fontSize: 12 }}>
                    {f ? (f['주요 사양'] || '—') : '—'}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {e
                      ? <span className="batch-status err" title={e}>✗</span>
                      : <span className="batch-status ok">✓</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ marginTop: 16, padding: '0 16px 16px', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <TplSelect />
            <button
              className="btn btn-success"
              onClick={handleBatchDownload}
              disabled={downloading || !hasTemplate || validCount === 0}
            >
              {downloading
                ? <><span className="spinner" />생성 중...</>
                : `📥 엑셀 다운로드 (${validCount}개)`}
            </button>
          </div>
        </div>
      )}

      {/* 등록 대상 추천 (모니터 카테고리만) */}
      {catId === 'monitor' && <CandidateList onSelect={handleCandidateSelect} />}

      {/* 관리자 전용 */}
      {isAdmin && (
        <div className="card">
          <div className="admin-title">관리자 — {catLabel}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '0 16px 16px' }}>

            {/* 양식 파일 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, color: 'var(--text2)', whiteSpace: 'nowrap', minWidth: 140 }}>발주서 양식</span>
              {templates.length > 0 && (
                <>
                  <select className="tpl-select" value={selectedTpl} onChange={e => setSelectedTpl(e.target.value)}>
                    {templates.map(t => <option key={t.name} value={t.name}>{t.label}</option>)}
                  </select>
                  <button className="btn btn-danger" onClick={handleDelete} disabled={deleting || !selectedTpl}>
                    {deleting ? <><span className="spinner spinner-dark" />삭제 중...</> : '🗑 삭제'}
                  </button>
                </>
              )}
              <label className="file-label">
                📎 파일 선택
                <input ref={fileInputRef} type="file" accept=".xlsx" style={{ display: 'none' }} onChange={e => setTemplateFile(e.target.files[0] || null)} />
              </label>
              {templateFile && <span className="file-name">{templateFile.name}</span>}
              <button className="btn btn-primary" onClick={handleTemplateUpload} disabled={uploading || !templateFile}>
                {uploading ? <><span className="spinner" />업로드 중...</> : '업로드'}
              </button>
            </div>
            {uploadError && <div className="msg-error">{uploadError}</div>}

            {/* A/S 설정 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, color: 'var(--text2)', whiteSpace: 'nowrap', minWidth: 140 }}>A/S 책임자와 전화번호</span>
              <input
                className="spec-input"
                placeholder="예: 한성컴퓨터 02-3272-1003"
                value={asContact}
                onChange={e => setAsContact(e.target.value)}
                style={{ flex: 1 }}
              />
              <button className="btn btn-primary" onClick={handleSaveSettings} disabled={savingSettings} style={{ whiteSpace: 'nowrap' }}>
                {savingSettings ? <><span className="spinner" />저장 중...</> : '저장'}
              </button>
              {settingsMsg && (
                <span style={{ fontSize: 12, color: settingsMsg.startsWith('오류') || settingsMsg === '저장 실패' ? 'var(--danger)' : 'var(--down)', whiteSpace: 'nowrap' }}>
                  {settingsMsg}
                </span>
              )}
            </div>

            <div style={{ fontSize: 11, color: 'var(--text3)' }}>
              보증기준은 패널 정보 기준으로 자동 적용됩니다 (OLED → 3년 / 그 외 → 1년)
            </div>
          </div>
        </div>
      )}
    </>
  );
}
