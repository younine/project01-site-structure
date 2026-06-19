import { useState, useCallback } from 'react';

const AUTH_KEY = 'coupang-settings-auth';
const CRED_KEY = 'coupang-settings-cred';

export function useSettingsAuth() {
  const [authed, setAuthed] = useState(() =>
    sessionStorage.getItem(AUTH_KEY) === '1'
  );

  const login = useCallback(async (password) => {
    try {
      const res = await fetch('/api/coupang/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (data.ok) {
        sessionStorage.setItem(AUTH_KEY, '1');
        try { sessionStorage.setItem(CRED_KEY, btoa(`younine:${password}`)); } catch {}
        setAuthed(true);
        return true;
      }
    } catch {}
    return false;
  }, []);

  return { authed, login };
}
