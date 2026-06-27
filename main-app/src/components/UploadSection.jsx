import { useRef } from 'react';
import './UploadSection.css';

export default function UploadSection({ zipFile, setZipFile, loadHS, hsMap, hsSource, bizNo, setBizNo, isEditor }) {
  const zipRef = useRef();
  const hsRef = useRef();
  const hsCount = Object.keys(hsMap).length;

  const handleZip = (file) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.zip')) { alert('.zip 파일만 가능합니다'); return; }
    setZipFile(file);
  };

  const handleHS = async (file) => {
    if (!file) return;
    if (!file.name.match(/\.xlsx?$/i)) { alert('.xlsx 파일만 가능합니다'); return; }
    await loadHS(file);
  };

  const onDrop = (e, type) => {
    e.preventDefault();
    e.currentTarget.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (!file) return;
    type === 'zip' ? handleZip(file) : handleHS(file);
  };

  return (
    <div className="upload-section">
      <div className="section-label">STEP 1 — 파일 업로드</div>
      <div className="upload-grid">
        <div>
          <div className="upload-label">① 발주서 ZIP <span className="req">* 필수</span></div>
          <div
            className={`drop-zone${zipFile ? ' loaded' : ''}`}
            onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('dragover'); }}
            onDragLeave={e => e.currentTarget.classList.remove('dragover')}
            onDrop={e => onDrop(e, 'zip')}
            onClick={() => zipRef.current.click()}
          >
            <input ref={zipRef} type="file" accept=".zip" onChange={e => handleZip(e.target.files[0])} style={{ display: 'none' }} />
            <div className="drop-icon">🗜️</div>
            <div className="drop-title">발주서리스트_XXXXXXXX.zip</div>
            <div className="drop-sub">드래그하거나 클릭하여 업로드</div>
            {zipFile && <div className="drop-status">✓ {zipFile.name} ({(zipFile.size/1024).toFixed(0)}KB)</div>}
          </div>
        </div>
        <div>
          <div className="upload-label">② HS코드 파일 <span className="opt">선택</span></div>
          <div
            className={`drop-zone blue-zone${hsCount > 0 ? ' loaded' : ''}`}
            onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('dragover'); }}
            onDragLeave={e => e.currentTarget.classList.remove('dragover')}
            onDrop={e => onDrop(e, 'hs')}
            onClick={() => hsRef.current.click()}
          >
            <input ref={hsRef} type="file" accept=".xlsx,.xls" onChange={e => handleHS(e.target.files[0])} style={{ display: 'none' }} />
            <div className="drop-icon">📋</div>
            <div className="drop-title">HS_코드.xlsx</div>
            <div className="drop-sub">SKU → HS CODE 매핑 · 1열:SKU, 3열:HS코드</div>
            {hsSource === 'server' && <div className="drop-status" style={{ color: 'var(--success)' }}>✓ 서버 등록 코드 {hsCount}개 자동 적용 중</div>}
            {hsSource === 'manual' && <div className="drop-status" style={{ color: 'var(--blue)' }}>✓ {hsCount}개 로드됨 (이 세션만 적용)</div>}
          </div>
        </div>
      </div>
      {isEditor && (
        <div className="config-row">
          <div className="config-label"><strong>AF열 세금계산서</strong> — 자사 사업자번호</div>
          <input
            type="text"
            className="config-input"
            value={bizNo}
            onChange={e => setBizNo(e.target.value)}
            placeholder="000-00-00000"
          />
          <div className="config-hint">※ 거래처(쿠팡) 번호가 아닌 <strong>자사</strong> 사업자번호</div>
        </div>
      )}
    </div>
  );
}
