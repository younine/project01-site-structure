import { useState, useEffect } from 'react';
import { authFetch } from './authFetch';

const BUILTIN_SITES = ['dcinside', 'fmkorea', 'quasarzone', 'coolenjoy'];

function AddBoardModal({ siteId, siteName, isBuiltIn, onClose, onSave }) {
  const [form, setForm] = useState({ boardId: '', boardName: '', searchUrlTemplate: '', maxPages: '1', keywords: '' });

  async function handleSubmit(e) {
    e.preventDefault();
    const keywords = form.keywords.split(/[,\n]/).map(k => k.trim()).filter(Boolean);
    const res = await authFetch(`/api/community/sources/${siteId}/boards`, {
      method: 'POST',
      body: JSON.stringify({ ...form, maxPages: parseInt(form.maxPages) || 1, keywords }),
    });
    if (res.ok) onSave();
    else { const d = await res.json(); alert(d.error || '오류'); }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-title">게시판 추가 – {siteName}</div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">게시판 ID</label>
            <input className="form-input" required value={form.boardId} onChange={e => setForm(p => ({ ...p, boardId: e.target.value }))} placeholder="ex) hotdeal" />
          </div>
          <div className="form-group">
            <label className="form-label">게시판 이름</label>
            <input className="form-input" required value={form.boardName} onChange={e => setForm(p => ({ ...p, boardName: e.target.value }))} placeholder="ex) 핫딜" />
          </div>
          <div className="form-group">
            <label className="form-label">검색 URL 템플릿</label>
            <input className="form-input" required value={form.searchUrlTemplate}
              onChange={e => setForm(p => ({ ...p, searchUrlTemplate: e.target.value }))}
              placeholder="https://example.com/search?q={keyword}&page={page}" />
            <div className="form-hint">키워드: <code>{'{keyword}'}</code> · 페이지: <code>{'{page}'}</code></div>
            {!isBuiltIn && (
              <div className="unknown-site-notice" style={{ marginTop: 6 }}>
                ⚠️ 직접 추가한 사이트는 범용 파서를 사용하므로 파싱 정확도가 낮을 수 있습니다.
              </div>
            )}
          </div>
          <div className="form-group">
            <label className="form-label">수집 페이지 수 (1~10)</label>
            <input className="form-input" type="number" min="1" max="10" value={form.maxPages}
              onChange={e => setForm(p => ({ ...p, maxPages: e.target.value }))}
              style={{ width: 80 }} />
            <div className="form-hint">URL에 <code>{'{page}'}</code>가 있어야 다중 페이지가 작동합니다</div>
          </div>
          <div className="form-group">
            <label className="form-label">키워드 (쉼표 또는 줄바꿈으로 구분)</label>
            <textarea className="form-input" rows={3} value={form.keywords}
              onChange={e => setForm(p => ({ ...p, keywords: e.target.value }))} placeholder="한성&#10;모니터" />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn" onClick={onClose}>취소</button>
            <button type="submit" className="btn btn-primary">추가</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function MaxPagesEditor({ siteId, board, onSave }) {
  const [val, setVal] = useState(String(board.maxPages || 1));
  const [saving, setSaving] = useState(false);

  async function save(v) {
    const n = Math.min(Math.max(parseInt(v) || 1, 1), 10);
    setSaving(true);
    await authFetch(`/api/community/sources/${siteId}/boards/${board.boardId}/settings`, {
      method: 'PUT',
      body: JSON.stringify({ maxPages: n }),
    });
    setSaving(false);
    onSave();
  }

  const hasPage = board.searchUrlTemplate.includes('{page}');

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
      <span style={{ fontSize: 11, color: 'var(--text3)' }}>수집 페이지:</span>
      <input
        type="number" min="1" max="10"
        value={val}
        onChange={e => setVal(e.target.value)}
        onBlur={e => save(e.target.value)}
        disabled={saving || !hasPage}
        style={{ width: 48, padding: '2px 6px', border: '1px solid var(--border2)', borderRadius: 5, fontSize: 11, textAlign: 'center' }}
      />
      <span style={{ fontSize: 11, color: 'var(--text3)' }}>페이지</span>
      {!hasPage && <span style={{ fontSize: 10, color: 'var(--text3)' }}>(URL에 {'{page}'} 없음)</span>}
    </div>
  );
}

function KeywordsEditor({ siteId, board, onSave }) {
  const [keywords, setKeywords] = useState(board.keywords || []);
  const [newKw, setNewKw] = useState('');
  const [saving, setSaving] = useState(false);

  async function saveKeywords(next) {
    setSaving(true);
    await authFetch(`/api/community/sources/${siteId}/boards/${board.boardId}/keywords`, {
      method: 'PUT',
      body: JSON.stringify({ keywords: next }),
    });
    setSaving(false);
    onSave();
  }

  function addKw() {
    const trimmed = newKw.trim();
    if (!trimmed || keywords.includes(trimmed)) return;
    const next = [...keywords, trimmed];
    setKeywords(next);
    setNewKw('');
    saveKeywords(next);
  }

  function removeKw(kw) {
    const next = keywords.filter(k => k !== kw);
    setKeywords(next);
    saveKeywords(next);
  }

  return (
    <div>
      <div className="keyword-tags">
        {keywords.map(kw => (
          <span key={kw} className="keyword-tag">
            {kw}
            <button className="keyword-tag-remove" onClick={() => removeKw(kw)} disabled={saving}>×</button>
          </span>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
        <input
          style={{ flex: 1, padding: '4px 8px', border: '1px solid var(--border2)', borderRadius: 6, fontSize: 11 }}
          value={newKw} onChange={e => setNewKw(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addKw())}
          placeholder="키워드 추가..." disabled={saving}
        />
        <button className="btn btn-sm btn-primary" onClick={addKw} disabled={saving || !newKw.trim()}>추가</button>
      </div>
    </div>
  );
}

export default function SettingsPanel() {
  const [sources, setSources] = useState({});
  const [showAddSite, setShowAddSite] = useState(false);
  const [addBoardFor, setAddBoardFor] = useState(null);
  const [newSite, setNewSite] = useState({ siteId: '', name: '' });

  const load = () =>
    authFetch('/api/community/sources').then(r => r.json()).then(setSources).catch(() => {});

  useEffect(() => { load(); }, []);

  async function addSite() {
    const { siteId, name } = newSite;
    if (!siteId || !name) return;
    const res = await authFetch('/api/community/sources', { method: 'POST', body: JSON.stringify({ siteId, name }) });
    if (res.ok) { load(); setNewSite({ siteId: '', name: '' }); setShowAddSite(false); }
    else { const d = await res.json(); alert(d.error || '오류'); }
  }

  async function deleteSite(siteId) {
    if (!confirm(`"${sources[siteId]?.name}" 사이트를 삭제하시겠습니까? 관련 게시글은 유지됩니다.`)) return;
    await authFetch(`/api/community/sources/${siteId}`, { method: 'DELETE' });
    load();
  }

  async function deleteBoard(siteId, boardId) {
    if (!confirm('이 게시판을 삭제하시겠습니까?')) return;
    await authFetch(`/api/community/sources/${siteId}/boards/${boardId}`, { method: 'DELETE' });
    load();
  }

  return (
    <div className="settings-panel">
      {/* 사이트 목록 */}
      {Object.entries(sources).map(([siteId, site]) => {
        const isBuiltIn = BUILTIN_SITES.includes(siteId);
        return (
          <div key={siteId} className="settings-card">
            <div className="settings-card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="settings-card-title">{site.name}</span>
                {!isBuiltIn && (
                  <span className="badge badge-board" style={{ fontSize: 10 }}>사용자 추가</span>
                )}
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn btn-sm" onClick={() => setAddBoardFor(siteId)}>+ 게시판</button>
                {!isBuiltIn && (
                  <button className="btn btn-sm btn-danger" onClick={() => deleteSite(siteId)}>삭제</button>
                )}
              </div>
            </div>
            <div className="settings-card-body">
              {(site.boards || []).length === 0 ? (
                <div style={{ padding: '12px 16px', color: 'var(--text3)', fontSize: 12 }}>게시판 없음</div>
              ) : (
                (site.boards || []).map(board => (
                  <div key={board.boardId} className="board-row">
                    <div className="board-info">
                      <div className="board-name">{board.boardName}</div>
                      <div className="board-url">{board.searchUrlTemplate}</div>
                      {!isBuiltIn && (
                        <div className="unknown-site-notice" style={{ marginTop: 4 }}>
                          ⚠️ 범용 파서 사용 – 파싱 정확도가 낮을 수 있습니다
                        </div>
                      )}
                      <MaxPagesEditor siteId={siteId} board={board} onSave={load} />
                      <div style={{ marginTop: 6 }}>
                        <KeywordsEditor siteId={siteId} board={board} onSave={load} />
                      </div>
                    </div>
                    <button className="btn btn-sm btn-danger" style={{ flexShrink: 0 }} onClick={() => deleteBoard(siteId, board.boardId)}>삭제</button>
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })}

      {/* 사이트 추가 */}
      {showAddSite ? (
        <div className="settings-card">
          <div className="settings-card-header">
            <span className="settings-card-title">새 사이트 추가</span>
          </div>
          <div style={{ padding: 16 }}>
            <div className="unknown-site-notice" style={{ marginBottom: 12 }}>
              ⚠️ 직접 추가한 사이트는 범용 파서를 사용하므로 파싱 정확도가 낮을 수 있습니다.
            </div>
            <div className="form-group">
              <label className="form-label">사이트 ID (영문)</label>
              <input className="form-input" value={newSite.siteId} placeholder="ex) ruliweb"
                onChange={e => setNewSite(p => ({ ...p, siteId: e.target.value.replace(/\s/g, '') }))} />
            </div>
            <div className="form-group">
              <label className="form-label">사이트 이름</label>
              <input className="form-input" value={newSite.name} placeholder="ex) 루리웹"
                onChange={e => setNewSite(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn" onClick={() => setShowAddSite(false)}>취소</button>
              <button className="btn btn-primary" onClick={addSite} disabled={!newSite.siteId || !newSite.name}>추가</button>
            </div>
          </div>
        </div>
      ) : (
        <button className="btn" style={{ alignSelf: 'flex-start' }} onClick={() => setShowAddSite(true)}>
          + 사이트 추가
        </button>
      )}

      {/* 게시판 추가 모달 */}
      {addBoardFor && (
        <AddBoardModal
          siteId={addBoardFor}
          siteName={sources[addBoardFor]?.name}
          isBuiltIn={BUILTIN_SITES.includes(addBoardFor)}
          onClose={() => setAddBoardFor(null)}
          onSave={() => { load(); setAddBoardFor(null); }}
        />
      )}
    </div>
  );
}
