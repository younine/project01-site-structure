import { useState, useCallback, useEffect } from 'react';

const TOKEN_KEY = 'auth_token';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) { setLoading(false); return; }
    fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setUser(data); else localStorage.removeItem(TOKEN_KEY); })
      .catch(() => localStorage.removeItem(TOKEN_KEY))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (username, password) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || '로그인에 실패했습니다');
    localStorage.setItem(TOKEN_KEY, data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
  }, []);

  const hasPermission = useCallback((perm) => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    const perms = user.permissions || [];
    if (perms.includes(perm)) return true;
    if (perm.endsWith('_viewer') && perms.includes(perm.replace('_viewer', '_editor'))) return true;
    if ((perm === 'coupang_viewer' || perm === 'coupang_editor') && perms.includes('coupang')) return true;
    if ((perm === 'order_viewer' || perm === 'order_editor') && perms.includes('order')) return true;
    return false;
  }, [user]);

  return { user, loading, login, logout, hasPermission };
}
