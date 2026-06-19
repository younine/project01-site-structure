import { useState, useCallback, useRef, useEffect } from 'react';

const MAX_URLS  = 5;

function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

async function saveToServer(data) {
  try {
    await fetch('/api/coupang/settings', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(data),
    });
  } catch {}
}

export function useServerSettings() {
  const [savedUrls, setSavedUrls] = useState([]);
  const [settings,  setSettings]  = useState([]);
  const stateRef = useRef({ savedUrls: [], productMappings: [] });

  useEffect(() => {
    fetch('/api/coupang/settings')
      .then(r => r.json())
      .then(data => {
        const urls     = (data.savedUrls       || []).map(u => ({ ...u, id: uuid() }));
        const mappings = (data.productMappings || []).map(m => ({ ...m, id: uuid() }));
        setSavedUrls(urls);
        setSettings(mappings);
        stateRef.current = { savedUrls: urls, productMappings: mappings };
      })
      .catch(() => {});
  }, []);

  const addSavedUrl = useCallback(({ alias, url }) => {
    setSavedUrls(prev => {
      if (prev.length >= MAX_URLS) return prev;
      const next = [...prev, { id: uuid(), alias: alias.trim(), url: url.trim() }];
      stateRef.current = { ...stateRef.current, savedUrls: next };
      saveToServer(stateRef.current);
      return next;
    });
  }, []);

  const removeSavedUrl = useCallback((id) => {
    setSavedUrls(prev => {
      const next = prev.filter(u => u.id !== id);
      stateRef.current = { ...stateRef.current, savedUrls: next };
      saveToServer(stateRef.current);
      return next;
    });
  }, []);

  const addSetting = useCallback((item) => {
    setSettings(prev => {
      const next = [...prev, { ...item, id: uuid() }];
      stateRef.current = { ...stateRef.current, productMappings: next };
      saveToServer(stateRef.current);
      return next;
    });
  }, []);

  const removeSetting = useCallback((id) => {
    setSettings(prev => {
      const next = prev.filter(s => s.id !== id);
      stateRef.current = { ...stateRef.current, productMappings: next };
      saveToServer(stateRef.current);
      return next;
    });
  }, []);

  const removeSettings = useCallback((ids) => {
    const idSet = new Set(ids);
    setSettings(prev => {
      const next = prev.filter(s => !idSet.has(s.id));
      stateRef.current = { ...stateRef.current, productMappings: next };
      saveToServer(stateRef.current);
      return next;
    });
  }, []);

  const updateSetting = useCallback((id, updated) => {
    setSettings(prev => {
      const next = prev.map(s => s.id === id ? { ...s, ...updated } : s);
      stateRef.current = { ...stateRef.current, productMappings: next };
      saveToServer(stateRef.current);
      return next;
    });
  }, []);

  const bulkSaveSettings = useCallback(async (items) => {
    const next = items.map(item => ({ ...item, id: uuid() }));
    setSettings(next);
    stateRef.current = { ...stateRef.current, productMappings: next };
    await saveToServer(stateRef.current);
  }, []);

  return { savedUrls, addSavedUrl, removeSavedUrl, settings, addSetting, removeSetting, removeSettings, updateSetting, bulkSaveSettings };
}
