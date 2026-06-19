function fmtNum(n) {
  return n ? Number(n).toLocaleString('ko-KR') : '-';
}

function formatSpec(p) {
  if (p.dual_mode) {
    return [p.inch, p.dual_mode, p.panel, p.shape, p.brightness].filter(Boolean).join(', ');
  }
  return [p.inch, p.res, p.hz, p.panel, p.shape, p.brightness].filter(Boolean).join(', ');
}

export default function NewProducts({ products = [] }) {
  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">✦ 타사 신제품</div>
        <a href="/monitor.html" className="card-link">전체 보기</a>
      </div>
      <div className="tbl-wrap">
        {products.length === 0 ? (
          <div className="empty">데이터를 불러오는 중...</div>
        ) : (
          <table className="newproducts-table">
            <thead>
              <tr>
                <th>브랜드</th>
                <th>모델명</th>
                <th>주요스펙</th>
                <th className="price-col">판매가</th>
                <th>대응 자사모델</th>
                <th className="price-col">자사가</th>
                <th className="price-col">차이</th>
                <th className="price-col">차이율</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p, i) => {
                const diff = p.ourPrice ? p.price - p.ourPrice : null;
                const rate = p.ourPrice ? ((diff / p.ourPrice) * 100).toFixed(1) : null;
                return (
                  <tr key={i}>
                    <td data-label="브랜드"><span className="brand-tag">{p.brand}</span></td>
                    <td className="model-name" data-label="모델명">
                      {p.danawUrl
                        ? <a href={p.danawUrl} target="_blank" rel="noreferrer" className="model-link">{p.modelName}</a>
                        : p.modelName}
                    </td>
                    <td className="spec" data-label="스펙">{formatSpec(p)}</td>
                    <td className="price-col" data-label="판매가">{fmtNum(p.price)}</td>
                    <td className="our-model" data-label="자사모델">{p.ourModel || '-'}</td>
                    <td className="price-col" data-label="자사가">{fmtNum(p.ourPrice)}</td>
                    <td className={`price-col ${diff > 0 ? 'up' : diff < 0 ? 'down' : ''}`} data-label="차이">
                      {diff === null ? '-' : `${diff > 0 ? '+' : ''}${fmtNum(diff)}`}
                    </td>
                    <td className={`price-col ${rate > 0 ? 'up' : rate < 0 ? 'down' : ''}`} data-label="차이율">
                      {rate === null ? '-' : `${rate > 0 ? '+' : ''}${rate}%`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
