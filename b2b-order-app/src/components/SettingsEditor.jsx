import { useState, useEffect, useCallback } from 'react';
import SpreadsheetGrid from './SpreadsheetGrid';

const WAREHOUSE_COLS = ['업체명', '우편번호', '창고주소', '연락처'];

const DEFAULT_WH_ROWS = [
  ['아토즈', '', '', ''],
  ['아싸컴', '', '', ''],
  ['미라클', '', '', ''],
];

function whToRow(wh) {
  return [wh.vendor || '', wh.zip || '', wh.address || '', wh.phone || ''];
}

function rowToWh(row) {
  return { vendor: row[0] || '', zip: row[1] || '', address: row[2] || '', phone: row[3] || '' };
}

function migrateOldAddr(addr) {
  const m = (addr || '').match(/\[(\d{5,6})\]/);
  const zip = m ? m[1] : '';
  const address = (addr || '').replace(/\[\d{5,6}\]\s*/, '').trim();
  return { zip, address };
}

export default function SettingsEditor() {
  const [whRows, setWhRows] = useState(DEFAULT_WH_ROWS.map(r => [...r]));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) return;
    fetch('/api/b2b/settings', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) return;
        if (data.warehouses?.length) {
          setWhRows(data.warehouses.map(whToRow));
        } else {
          const defaults = DEFAULT_WH_ROWS.map(r => [...r]);
          const atozIdx = defaults.findIndex(r => r[0] === '아토즈');
          const miracleIdx = defaults.findIndex(r => r[0] === '미라클');
          if (data.atoz_warehouse_address && atozIdx >= 0) {
            const { zip, address } = migrateOldAddr(data.atoz_warehouse_address);
            defaults[atozIdx][1] = zip; defaults[atozIdx][2] = address;
          }
          if (data.miracle_warehouse_address && miracleIdx >= 0) {
            const { zip, address } = migrateOldAddr(data.miracle_warehouse_address);
            defaults[miracleIdx][1] = zip; defaults[miracleIdx][2] = address;
          }
          setWhRows(defaults);
        }
      })
      .catch(() => {});
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const token = localStorage.getItem('auth_token');
      const warehouses = whRows.filter(r => r.some(c => c.trim())).map(rowToWh);
      const res = await fetch('/api/b2b/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ items: [], warehouses }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || '저장 실패');
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }, [whRows]);

  return (
    <div className="tab-content">
      <div className="section">
        <div className="section-title">창고 주소 관리</div>
        <p className="section-desc">
          업체발주 건의 배송지로 사용됩니다. 업체명은 발주 생성 시 자동 참조됩니다.
        </p>
        <SpreadsheetGrid columns={WAREHOUSE_COLS} rows={whRows} onChange={setWhRows} />
      </div>
      <div className="action-row" style={{ marginTop: 12 }}>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? '저장 중...' : '저장'}
        </button>
        {saved && <span className="msg msg-success">저장되었습니다</span>}
        {error && <span className="msg msg-error">{error}</span>}
      </div>
      <div className="section" style={{ marginTop: 16 }}>
        <p className="section-desc" style={{ color: 'var(--info)' }}>
          단가 및 HS코드는 <a href="/products/" style={{ color: 'var(--accent)' }}>제품 관리</a> 페이지에서 관리합니다.
        </p>
      </div>
    </div>
  );
}
