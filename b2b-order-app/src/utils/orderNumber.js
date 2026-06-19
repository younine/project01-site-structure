// 주문번호 형식: {업체코드}{YYMMDD}-{순번}
// 순번 규칙: 업체발주 → -00 고정, 직발송 → -01부터 순번 증가

export function getDateStr() {
  const d = new Date();
  return (
    String(d.getFullYear()).slice(2) +
    String(d.getMonth() + 1).padStart(2, '0') +
    String(d.getDate()).padStart(2, '0')
  );
}

// vendorCode: 'CPZ', 'MC', ... 업체 추가 시 코드만 등록
// orderType: '업체발주' | '직발송'
// seq: 직발송 순번 (1부터, 업체발주일 때는 무시)
export function makeOrderNo(vendorCode, orderType, seq = 1) {
  const suffix = orderType === '업체발주' ? '00' : String(seq).padStart(2, '0');
  return `${vendorCode}${getDateStr()}-${suffix}`;
}
