import { useState, useCallback } from 'react';

const LS_KEY  = 'coupang-saved-urls';
const MAX_URLS = 5;

function load() {
  try { return JSON.parse(localStorage.getItem(LS_KEY)) || []; }
  catch { return []; }
}

export function useSavedUrls() {
  const [savedUrls, setSavedUrls] = useState(load);

  const addSavedUrl = useCallback(({ alias, url }) => {
    setSavedUrls(prev => {
      if (prev.length >= MAX_URLS) return prev;
      const next = [...prev, { id: Date.now(), alias: alias.trim(), url: url.trim() }];
      localStorage.setItem(LS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const removeSavedUrl = useCallback((id) => {
    setSavedUrls(prev => {
      const next = prev.filter(u => u.id !== id);
      localStorage.setItem(LS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  return { savedUrls, addSavedUrl, removeSavedUrl };
}
