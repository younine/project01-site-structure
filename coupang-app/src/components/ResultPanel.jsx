import ResultTable from './ResultTable';
import RematchTab  from './RematchTab';
import SettingsTab from './SettingsTab';

const ALL_TABS = [
  { key: 'all',      label: '전체' },
  { key: 'soldout',  label: '품절' },
  { key: 'coupon',   label: '쿠폰 있음' },
  { key: 'rematch',  label: '재매칭요청' },
  { key: 'settings', label: '설정', editorOnly: true },
];

export default function ResultPanel({ results, tab, setTab, settings, addSetting, removeSetting, removeSettings, updateSetting, bulkSaveSettings, rematchItems, collectedAt, savedUrls, addSavedUrl, removeSavedUrl, isEditor = false }) {
  const TABS = ALL_TABS.filter(t => !t.editorOnly || isEditor);

  const counts = {
    all:      results.length,
    soldout:  results.filter(r => r.status === '품절').length,
    coupon:   results.filter(r => r.hasCoupon).length,
    rematch:  rematchItems.length,
    settings: settings.length,
  };

  const tabRows = {
    all:     results,
    soldout: results.filter(r => r.status === '품절'),
    coupon:  results.filter(r => r.hasCoupon),
  };

  return (
    <section style={s.card}>
      <div style={s.tabBar}>
        {TABS.map(t => (
          <button
            key={t.key}
            style={{ ...s.tabBtn, ...(tab === t.key ? s.tabActive : {}) }}
            onClick={() => setTab(t.key)}
          >
            {t.label}
            {counts[t.key] > 0 && (
              <span style={{ ...s.badge, ...(tab === t.key ? s.badgeActive : {}) }}>
                {counts[t.key]}
              </span>
            )}
          </button>
        ))}
        {collectedAt && (
          <span style={s.collectedAt}>최종 수집: {collectedAt}</span>
        )}
      </div>

      <div style={s.body}>
        {(tab === 'all' || tab === 'soldout' || tab === 'coupon') && (
          <ResultTable rows={tabRows[tab]} />
        )}
        {tab === 'rematch' && (
          <RematchTab items={rematchItems} />
        )}
        {tab === 'settings' && (
          <SettingsTab
            settings={settings} onAdd={addSetting} onRemove={removeSetting} onRemoveMany={removeSettings} onUpdate={updateSetting}
            onBulkSave={bulkSaveSettings}
            savedUrls={savedUrls} addSavedUrl={addSavedUrl} removeSavedUrl={removeSavedUrl}
          />
        )}
      </div>
    </section>
  );
}

const s = {
  card: {
    background: '#fff',
    border: '1px solid rgba(0,0,0,0.08)',
    borderRadius: 12,
    overflowX: 'auto',
  },
  tabBar: {
    display: 'flex',
    alignItems: 'center',
    borderBottom: '1px solid rgba(0,0,0,0.08)',
    padding: '0 4px',
  },
  collectedAt: {
    marginLeft: 'auto',
    paddingRight: 12,
    fontSize: 11,
    color: '#9399a8',
    whiteSpace: 'nowrap',
  },
  tabBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '14px 16px',
    fontSize: 13,
    fontWeight: 500,
    color: '#9399a8',
    border: 'none',
    background: 'none',
    cursor: 'pointer',
    borderBottom: '2px solid transparent',
    marginBottom: -1,
    transition: 'color 0.15s',
    whiteSpace: 'nowrap',
  },
  tabActive: {
    color: '#2563eb',
    borderBottomColor: '#2563eb',
    fontWeight: 600,
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 18,
    height: 18,
    padding: '0 5px',
    borderRadius: 99,
    fontSize: 10,
    fontWeight: 700,
    background: '#f0f0f0',
    color: '#5a6072',
  },
  badgeActive: {
    background: 'rgba(37,99,235,0.12)',
    color: '#2563eb',
  },
  body: { padding: '16px 0' },
};
