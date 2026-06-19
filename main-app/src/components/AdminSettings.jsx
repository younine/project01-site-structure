import { useState, useEffect, useCallback } from 'react';

const SECTIONS = [
  { key: 'coupang', label: '쿠팡 수집기' },
  { key: 'order',   label: '쿠팡 발주서' },
  { key: 'b2b',     label: 'B2B 발주' },
  { key: 'product', label: '제품 관리' },
];

const LEVELS = [
  { value: 'none',   label: '없음' },
  { value: 'viewer', label: 'viewer' },
  { value: 'editor', label: 'editor' },
];

function getLevel(permissions, key) {
  if ((permissions || []).includes(`${key}_editor`)) return 'editor';
  if ((permissions || []).includes(`${key}_viewer`)) return 'viewer';
  return 'none';
}

function buildPermissions(permissions, key, level) {
  const filtered = (permissions || []).filter(p =>
    p !== `${key}_viewer` && p !== `${key}_editor` && p !== key
  );
  if (level === 'viewer') return [...filtered, `${key}_viewer`];
  if (level === 'editor') return [...filtered, `${key}_editor`];
  return filtered;
}

export default function AdminSettings() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState('');
  const [newUser, setNewUser] = useState({ username: '', password: '', role: 'user' });
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState('');

  const token = localStorage.getItem('auth_token');

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/users', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('조회 실패');
      setUsers(await res.json());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const updatePermissions = async (user, key, level) => {
    setSaving(user.id + key);
    const newPerms = buildPermissions(user.permissions, key, level);
    try {
      const res = await fetch(`/api/auth/users/${user.id}/permissions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ permissions: newPerms }),
      });
      if (!res.ok) throw new Error('저장 실패');
      const updated = await res.json();
      setUsers(prev => prev.map(u => u.id === user.id ? updated : u));
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving('');
    }
  };

  const deleteUser = async (user) => {
    if (!window.confirm(`"${user.username}" 계정을 삭제하시겠습니까?`)) return;
    try {
      const res = await fetch(`/api/auth/users/${user.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error || '삭제 실패');
      }
      setUsers(prev => prev.filter(u => u.id !== user.id));
    } catch (e) {
      alert(e.message);
    }
  };

  const addUser = async (e) => {
    e.preventDefault();
    setAddError('');
    setAdding(true);
    try {
      const res = await fetch('/api/auth/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...newUser, permissions: [] }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || '추가 실패');
      }
      const created = await res.json();
      setUsers(prev => [...prev, created]);
      setNewUser({ username: '', password: '', role: 'user' });
    } catch (e) {
      setAddError(e.message);
    } finally {
      setAdding(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: 24, fontFamily: "'Pretendard', -apple-system, sans-serif" }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>

        {/* 헤더 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <a href="/" style={{ color: 'var(--text3)', fontSize: 12, textDecoration: 'none' }}>← 대시보드</a>
            <span style={{ color: 'var(--border2)' }}>|</span>
            <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>관리자 설정</span>
          </div>
        </div>

        {/* 계정 목록 */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-header">
            <div className="card-title">계정 목록</div>
            {error && <span style={{ color: 'var(--danger)', fontSize: 11 }}>{error}</span>}
          </div>
          {loading ? (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>로딩 중...</div>
          ) : (
            <div className="tbl-wrap">
              <table>
                <thead>
                  <tr>
                    <th>아이디</th>
                    <th>역할</th>
                    {SECTIONS.map(s => <th key={s.key}>{s.label}</th>)}
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => (
                    <tr key={user.id}>
                      <td style={{ fontWeight: 500, color: 'var(--text)' }}>{user.username}</td>
                      <td>
                        <span style={{
                          display: 'inline-block',
                          padding: '2px 8px',
                          borderRadius: 99,
                          fontSize: 11,
                          fontWeight: 600,
                          background: user.role === 'admin' ? 'var(--accent-dim)' : 'var(--surface2)',
                          color: user.role === 'admin' ? 'var(--accent)' : 'var(--text3)',
                          border: `1px solid ${user.role === 'admin' ? 'rgba(37,99,235,0.3)' : 'var(--border2)'}`,
                        }}>
                          {user.role === 'admin' ? '관리자' : '일반'}
                        </span>
                      </td>
                      {SECTIONS.map(sec => (
                        <td key={sec.key}>
                          {user.role === 'admin' ? (
                            <span style={{ color: 'var(--success)', fontSize: 11, fontWeight: 600 }}>전체 권한</span>
                          ) : (
                            <div style={{ display: 'flex', gap: 10 }}>
                              {LEVELS.map(lvl => {
                                const checked = getLevel(user.permissions, sec.key) === lvl.value;
                                const isSaving = saving === user.id + sec.key;
                                return (
                                  <label key={lvl.value} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, cursor: 'pointer', color: checked ? 'var(--text)' : 'var(--text3)', fontWeight: checked ? 600 : 400 }}>
                                    <input
                                      type="radio"
                                      name={`${user.id}-${sec.key}`}
                                      checked={checked}
                                      onChange={() => updatePermissions(user, sec.key, lvl.value)}
                                      disabled={!!isSaving}
                                      style={{ accentColor: 'var(--accent)' }}
                                    />
                                    {lvl.label}
                                  </label>
                                );
                              })}
                            </div>
                          )}
                        </td>
                      ))}
                      <td>
                        {user.role !== 'admin' && (
                          <button
                            onClick={() => deleteUser(user)}
                            style={{ background: 'none', border: '1px solid var(--danger)', color: 'var(--danger)', borderRadius: 6, padding: '3px 10px', fontSize: 11, cursor: 'pointer' }}
                          >
                            삭제
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr><td colSpan={SECTIONS.length + 3} className="empty">계정이 없습니다</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 계정 추가 */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">계정 추가</div>
          </div>
          <form onSubmit={addUser} style={{ padding: '14px 16px', display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div>
              <label style={{ display: 'block', fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 4 }}>아이디</label>
              <input
                style={{ border: '1px solid var(--border2)', borderRadius: 6, padding: '6px 10px', fontSize: 12, width: 140, outline: 'none', fontFamily: 'inherit' }}
                value={newUser.username}
                onChange={e => setNewUser(u => ({ ...u, username: e.target.value }))}
                placeholder="아이디"
                required
                autoComplete="off"
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 4 }}>비밀번호</label>
              <input
                type="password"
                style={{ border: '1px solid var(--border2)', borderRadius: 6, padding: '6px 10px', fontSize: 12, width: 140, outline: 'none', fontFamily: 'inherit' }}
                value={newUser.password}
                onChange={e => setNewUser(u => ({ ...u, password: e.target.value }))}
                placeholder="비밀번호"
                required
                autoComplete="new-password"
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 4 }}>역할</label>
              <select
                style={{ border: '1px solid var(--border2)', borderRadius: 6, padding: '6px 10px', fontSize: 12, background: 'var(--surface)', fontFamily: 'inherit', outline: 'none' }}
                value={newUser.role}
                onChange={e => setNewUser(u => ({ ...u, role: e.target.value }))}
              >
                <option value="user">일반</option>
                <option value="admin">관리자</option>
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button
                type="submit"
                disabled={adding}
                style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 7, padding: '7px 18px', fontSize: 12, fontWeight: 600, cursor: 'pointer', opacity: adding ? 0.6 : 1 }}
              >
                {adding ? '추가 중...' : '+ 계정 추가'}
              </button>
              {addError && <span style={{ color: 'var(--danger)', fontSize: 11 }}>{addError}</span>}
            </div>
          </form>
        </div>

      </div>
    </div>
  );
}
