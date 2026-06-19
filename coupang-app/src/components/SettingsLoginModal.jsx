import { useState } from 'react';

export default function SettingsLoginModal({ onLogin, onSuccess, onCancel }) {
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!password) return;
    setLoading(true);
    setError('');
    const ok = await onLogin(password);
    if (ok) {
      onSuccess();
    } else {
      setError('비밀번호가 틀렸습니다.');
      setLoading(false);
    }
  }

  return (
    <div style={s.overlay} onClick={onCancel}>
      <div style={s.modal} onClick={e => e.stopPropagation()}>
        <p style={s.title}>관리자 인증</p>
        <p style={s.desc}>설정 탭은 관리자만 접근할 수 있습니다.</p>
        <form onSubmit={handleSubmit}>
          <input
            autoFocus
            type="password"
            placeholder="비밀번호 입력"
            value={password}
            onChange={e => setPassword(e.target.value)}
            style={s.input}
            disabled={loading}
          />
          {error && <p style={s.error}>{error}</p>}
          <div style={s.actions}>
            <button type="button" onClick={onCancel} style={s.cancelBtn} disabled={loading}>
              취소
            </button>
            <button type="submit" style={s.submitBtn} disabled={loading || !password}>
              {loading ? '확인 중…' : '로그인'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const s = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.45)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    background: '#fff',
    borderRadius: 12,
    padding: '28px 32px',
    width: 320,
    boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
  },
  title: {
    margin: '0 0 6px',
    fontSize: 16,
    fontWeight: 700,
    color: '#1e293b',
  },
  desc: {
    margin: '0 0 20px',
    fontSize: 13,
    color: '#64748b',
  },
  input: {
    width: '100%',
    boxSizing: 'border-box',
    padding: '10px 12px',
    fontSize: 14,
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    outline: 'none',
    marginBottom: 8,
  },
  error: {
    margin: '0 0 8px',
    fontSize: 12,
    color: '#ef4444',
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 16,
  },
  cancelBtn: {
    padding: '8px 16px',
    fontSize: 13,
    fontWeight: 500,
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    background: '#fff',
    color: '#64748b',
    cursor: 'pointer',
  },
  submitBtn: {
    padding: '8px 20px',
    fontSize: 13,
    fontWeight: 600,
    border: 'none',
    borderRadius: 8,
    background: '#2563eb',
    color: '#fff',
    cursor: 'pointer',
  },
};
