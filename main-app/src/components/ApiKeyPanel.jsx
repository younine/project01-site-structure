import { useState, useEffect } from 'react';
import { authFetch } from './authFetch';
import './ApiKeyPanel.css';

export default function ApiKeyPanel({ onClose }) {
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState('');
  const [copied, setCopied] = useState('');

  const feedUrl = `${window.location.origin}/api/products/feed`;

  useEffect(() => {
    authFetch('/api/products/feed-info')
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => setApiKey(d.apiKey || ''))
      .catch(() => setError('API 키를 불러오지 못했습니다'))
      .finally(() => setLoading(false));
  }, []);

  function copy(text, label) {
    const done = () => { setCopied(label); setTimeout(() => setCopied(''), 1500); };
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done));
    } else {
      fallbackCopy(text, done);
    }
  }

  function fallbackCopy(text, done) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    try { document.execCommand('copy'); done(); } catch (_) {}
    document.body.removeChild(ta);
  }

  return (
    <>
      <div className="apikey-backdrop" onClick={onClose} />
      <div className="apikey-panel">
        <div className="apikey-header">
          <span style={{ fontSize: 18 }}>🔑</span>
          <div className="apikey-title">외부 연동 API</div>
          <button className="apikey-close" onClick={onClose}>✕</button>
        </div>
        <div className="apikey-body">
          {loading ? (
            <div className="apikey-loading">불러오는 중...</div>
          ) : error ? (
            <div className="apikey-error">{error}</div>
          ) : (
            <>
              <div className="apikey-field">
                <div className="apikey-label">요청 주소 (GET)</div>
                <div className="apikey-row">
                  <code className="apikey-value">{feedUrl}</code>
                  <button className="apikey-copy" onClick={() => copy(feedUrl, 'url')}>
                    {copied === 'url' ? '복사됨' : '복사'}
                  </button>
                </div>
              </div>
              <div className="apikey-field">
                <div className="apikey-label">API 키 (x-api-key 헤더)</div>
                <div className="apikey-row">
                  <code className="apikey-value">{apiKey}</code>
                  <button className="apikey-copy" onClick={() => copy(apiKey, 'key')}>
                    {copied === 'key' ? '복사됨' : '복사'}
                  </button>
                </div>
              </div>
              <div className="apikey-hint">
                응답에는 skuId / modelName / salePrice 만 포함됩니다 (단가 정보 제외).
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
