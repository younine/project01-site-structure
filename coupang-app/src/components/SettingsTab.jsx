import { useState } from 'react';
import MappingSheet from './MappingSheet';

const URL_EMPTY = { alias: '', url: '' };
const MAX_URLS  = 5;

export default function SettingsTab({ settings, onBulkSave, savedUrls = [], addSavedUrl, removeSavedUrl }) {
  const [urlForm, setUrlForm] = useState(URL_EMPTY);
  const setUrl = (key) => (e) => setUrlForm(f => ({ ...f, [key]: e.target.value }));

  const handleAddUrl = () => {
    if (!urlForm.alias.trim() || !urlForm.url.trim()) return;
    addSavedUrl(urlForm);
    setUrlForm(URL_EMPTY);
  };

  return (
    <div style={s.root}>

      {/* 자주 쓰는 URL 관리 */}
      <div style={s.section}>
        <div style={s.sectionTitle}>
          자주 쓰는 URL 관리
          <span style={s.sectionCount}>{savedUrls.length} / {MAX_URLS}</span>
        </div>
        <div style={s.urlFormRow}>
          <div style={{ ...s.field, width: 120, flexShrink: 0 }}>
            <label style={s.label}>별칭</label>
            <input
              style={s.input} placeholder="브랜드명"
              value={urlForm.alias} onChange={setUrl('alias')}
              disabled={savedUrls.length >= MAX_URLS}
            />
          </div>
          <div style={{ ...s.field, flex: 1 }}>
            <label style={s.label}>URL</label>
            <input
              style={s.input} placeholder="https://www.coupang.com/..."
              value={urlForm.url} onChange={setUrl('url')}
              disabled={savedUrls.length >= MAX_URLS}
            />
          </div>
          <button
            style={{ ...s.addBtn, alignSelf: 'flex-end', opacity: savedUrls.length >= MAX_URLS ? 0.4 : 1 }}
            onClick={handleAddUrl} disabled={savedUrls.length >= MAX_URLS}
          >+ 추가</button>
        </div>

        {savedUrls.length > 0 ? (
          <div style={s.urlList}>
            {savedUrls.map(u => (
              <div key={u.id} style={s.urlRow}>
                <span style={s.urlAlias}>{u.alias}</span>
                <span style={s.urlText}>{u.url}</span>
                <button style={s.delBtn} onClick={() => removeSavedUrl(u.id)}>삭제</button>
              </div>
            ))}
          </div>
        ) : (
          <div style={s.urlEmpty}>저장된 URL이 없습니다. 위 폼에서 추가하세요.</div>
        )}
      </div>

      {/* 상품코드 매핑 스프레드시트 */}
      <div style={s.sectionTitle}>상품코드 매핑</div>
      <MappingSheet initialRows={settings} onSave={onBulkSave} />
    </div>
  );
}

const s = {
  root:        { display: 'flex', flexDirection: 'column', gap: 16, padding: '0 16px 16px' },
  section:     { background: '#f8f9fa', borderRadius: 10, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 },
  sectionTitle:{ fontSize: 13, fontWeight: 700, color: '#1a1d23', display: 'flex', alignItems: 'center', gap: 8 },
  sectionCount:{ fontSize: 11, fontWeight: 500, color: '#9399a8' },
  urlFormRow:  { display: 'flex', alignItems: 'flex-end', gap: 10 },
  urlList:     { display: 'flex', flexDirection: 'column', gap: 6 },
  urlRow:      { display: 'flex', alignItems: 'center', gap: 10, background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 7, padding: '8px 12px' },
  urlAlias:    { fontSize: 12, fontWeight: 700, color: '#1a1d23', whiteSpace: 'nowrap', minWidth: 80 },
  urlText:     { flex: 1, fontSize: 11, color: '#5a6072', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  urlEmpty:    { fontSize: 12, color: '#9399a8', textAlign: 'center', padding: '8px 0' },
  field:       { display: 'flex', flexDirection: 'column', gap: 5 },
  label:       { fontSize: 11, fontWeight: 600, color: '#9399a8', textTransform: 'uppercase', letterSpacing: '0.4px' },
  input:       { padding: '8px 10px', borderRadius: 7, border: '1px solid rgba(0,0,0,0.14)', fontSize: 12, background: '#fff', color: '#1a1d23', outline: 'none', width: '100%' },
  addBtn:      { padding: '8px 20px', borderRadius: 7, border: 'none', background: '#2563eb', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 },
  delBtn:      { padding: '4px 10px', borderRadius: 5, border: '1px solid #fee2e2', background: '#fff', color: '#dc2626', fontSize: 11, fontWeight: 600, cursor: 'pointer' },
};
