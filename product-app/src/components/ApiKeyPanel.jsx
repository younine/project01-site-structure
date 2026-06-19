import { useState, useEffect } from 'react';
import './ApiKeyPanel.css';

function getToken() { return localStorage.getItem('auth_token'); }

export default function ApiKeyPanel({ onClose }) {
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState('');
  const [copied, setCopied] = useState('');

  const feedUrl = `${window.location.origin}/api/products/feed`;

  useEffect(() => {
    fetch('/api/products/feed-info', { headers: { Authorization: `Bearer ${getToken()}` } })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => setApiKey(d.apiKey || ''))
      .catch(() => setError('API 키를 불러오지 못했습니다'))
      .finally(() => setLoading(false));
  }, []);

  function copy(text, label) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(label);
      setTimeout(() => setCopied(''), 1500);
    }).catch(() => {});
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
