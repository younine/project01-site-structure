// modelName format: "ModelCode_일반" | "ModelCode_무결점"
export function buildModelIndex(items) {
  const map = new Map();
  for (const item of (items || [])) {
    const skuname = (item.modelName || '').trim();
    const m = skuname.match(/_(일반|무결점)$/);
    if (!m) continue;
    const grade = m[1];
    const modelCode = skuname.slice(0, skuname.length - m[0].length).trim();
    if (!modelCode) continue;
    const key = modelCode.toLowerCase();
    if (!map.has(key)) map.set(key, { modelCode, grades: {} });
    map.get(key).grades[grade] = item;
  }
  return [...map.entries()].sort((a, b) => b[0].length - a[0].length);
}

// Detects 일반/무결점 from product name regardless of delimiter (_, /, (), [], -, space, etc.)
// Defaults to 일반 when no keyword is present.
// Returns { item, matched }.
export function matchProduct(productName, modelIndex) {
  if (!productName?.trim() || !modelIndex?.length) return { item: null, matched: false };
  const nameLower = productName.trim().toLowerCase();
  for (const [key, entry] of modelIndex) {
    if (nameLower.includes(key)) {
      const grade = /무결점/.test(productName) ? '무결점' : '일반';
      const item = entry.grades[grade] || entry.grades['일반'] || null;
      return { item, matched: !!item };
    }
  }
  return { item: null, matched: false };
}
