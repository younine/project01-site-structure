'use strict';

const express = require('express');
const cors = require('cors');
const { google } = require('googleapis');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const multer = require('multer');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use((req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });

// ── Auth 설정 ────────────────────────────────────────────────────────────────
const ALL_PERMISSIONS = [
  'coupang_viewer', 'coupang_editor',
  'order_viewer', 'order_editor',
  'b2b_viewer', 'b2b_editor',
  'product_viewer', 'product_editor',
];

const JWT_SECRET = process.env.JWT_SECRET || 'hansung-monitor-secret-2026';
const USERS_PATH = path.join(require('os').homedir(), 'auth', 'users.json');
const tokenBlacklist = new Set();

function readUsers() {
  try {
    return JSON.parse(fs.readFileSync(USERS_PATH, 'utf8'));
  } catch {
    return { users: [] };
  }
}

function writeUsers(data) {
  fs.writeFileSync(USERS_PATH, JSON.stringify(data, null, 2), 'utf8');
}

function requireAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ error: '인증이 필요합니다' });
  const token = auth.slice(7);
  if (tokenBlacklist.has(token)) return res.status(401).json({ error: '로그아웃된 토큰입니다' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    req.token = token;
    next();
  } catch {
    res.status(401).json({ error: '유효하지 않은 토큰입니다' });
  }
}

function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: '관리자 권한이 필요합니다' });
  next();
}

// editor는 viewer 권한 포함. 구버전 'coupang'/'order' 권한 호환 처리.
function hasPerm(user, perm) {
  if (!user) return false;
  if (user.role === 'admin') return true;
  const perms = user.permissions || [];
  if (perms.includes(perm)) return true;
  if (perm.endsWith('_viewer') && perms.includes(perm.replace('_viewer', '_editor'))) return true;
  if ((perm === 'coupang_viewer' || perm === 'coupang_editor') && perms.includes('coupang')) return true;
  if ((perm === 'order_viewer' || perm === 'order_editor') && perms.includes('order')) return true;
  return false;
}

function requireCoupangViewer(req, res, next) {
  if (!hasPerm(req.user, 'coupang_viewer')) return res.status(403).json({ error: '쿠팡 수집기 권한이 없습니다' });
  next();
}
function requireCoupangEditor(req, res, next) {
  if (!hasPerm(req.user, 'coupang_editor')) return res.status(403).json({ error: '쿠팡 수집기 편집 권한이 없습니다' });
  next();
}
function requireOrderViewer(req, res, next) {
  if (!hasPerm(req.user, 'order_viewer')) return res.status(403).json({ error: '발주서 변환기 권한이 없습니다' });
  next();
}
function requireOrderEditor(req, res, next) {
  if (!hasPerm(req.user, 'order_editor')) return res.status(403).json({ error: '발주서 변환기 편집 권한이 없습니다' });
  next();
}

// ── POST /api/auth/login ─────────────────────────────────────────────────────
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: '아이디와 비밀번호를 입력하세요' });
  const { users } = readUsers();
  const user = users.find(u => u.username === username);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: '아이디 또는 비밀번호가 올바르지 않습니다' });
  }
  const payload = { id: user.id, username: user.username, role: user.role, permissions: user.permissions };
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: payload });
});

// ── POST /api/auth/logout ────────────────────────────────────────────────────
app.post('/api/auth/logout', requireAuth, (req, res) => {
  tokenBlacklist.add(req.token);
  res.json({ ok: true });
});

// ── GET /api/auth/me ─────────────────────────────────────────────────────────
app.get('/api/auth/me', requireAuth, (req, res) => {
  const { users } = readUsers();
  const user = users.find(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: '사용자를 찾을 수 없습니다' });
  const { password: _, ...safe } = user;
  res.json(safe);
});

// ── GET /api/auth/users ──────────────────────────────────────────────────────
app.get('/api/auth/users', requireAuth, requireAdmin, (req, res) => {
  const { users } = readUsers();
  res.json(users.map(({ password: _, ...u }) => u));
});

// ── POST /api/auth/users ─────────────────────────────────────────────────────
app.post('/api/auth/users', requireAuth, requireAdmin, (req, res) => {
  const { username, password, role, permissions } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: '아이디와 비밀번호를 입력하세요' });
  const data = readUsers();
  if (data.users.find(u => u.username === username)) {
    return res.status(409).json({ error: '이미 존재하는 아이디입니다' });
  }
  const newUser = {
    id: String(Date.now()),
    username,
    password: bcrypt.hashSync(password, 10),
    role: role === 'admin' ? 'admin' : 'user',
    permissions: role === 'admin' ? ALL_PERMISSIONS : (Array.isArray(permissions) ? permissions : []),
  };
  data.users.push(newUser);
  writeUsers(data);
  const { password: _, ...safe } = newUser;
  res.status(201).json(safe);
});

// ── PUT /api/auth/users/:id/permissions ──────────────────────────────────────
app.put('/api/auth/users/:id/permissions', requireAuth, requireAdmin, (req, res) => {
  const data = readUsers();
  const user = data.users.find(u => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: '사용자를 찾을 수 없습니다' });
  if (!Array.isArray(req.body?.permissions)) return res.status(400).json({ error: 'permissions 배열이 필요합니다' });
  user.permissions = req.body.permissions;
  writeUsers(data);
  const { password: _, ...safe } = user;
  res.json(safe);
});

// ── DELETE /api/auth/users/:id ────────────────────────────────────────────────
app.delete('/api/auth/users/:id', requireAuth, requireAdmin, (req, res) => {
  const data = readUsers();
  const idx = data.users.findIndex(u => u.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: '사용자를 찾을 수 없습니다' });
  if (data.users[idx].role === 'admin' && data.users.filter(u => u.role === 'admin').length === 1) {
    return res.status(400).json({ error: '마지막 관리자 계정은 삭제할 수 없습니다' });
  }
  data.users.splice(idx, 1);
  writeUsers(data);
  res.json({ ok: true });
});

const SHEET_ID = '1887ejzSH9NkK4vmB8x1lAWjqjJ3M20ZczWCuD1T3Mm0';
const SHEET_NAME = '가공데이터';
const CREDS_PATH = path.join(require('os').homedir(), 'credentials.json');

const BRANDS = ['삼성','LG','알파스캔','필립스','MSI','제이씨현','크로스오버','비트엠','주연테크','앱코'];


// ── Google Sheets 인증 ──────────────────────────────────────────────────────
async function fetchRows() {
  const auth = new google.auth.GoogleAuth({
    keyFile: CREDS_PATH,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
  const client = await auth.getClient();
  const sheets = google.sheets({ version: 'v4', auth: client });
  const res = await sheets.spreadsheets.values.get(
    { spreadsheetId: SHEET_ID, range: `${SHEET_NAME}!A:U` },
    { headers: { 'Cache-Control': 'no-cache, no-store', 'Pragma': 'no-cache' } }
  );
  return res.data.values || [];
}

// ── 숫자 파싱 (콤마 포함 문자열 → 정수) ────────────────────────────────────
function parsePrice(str) {
  if (!str || str === '' || str === '0') return 0;
  return parseInt(str.replace(/,/g, ''), 10) || 0;
}

// ── 자사 모델코드 추출 (e.g. "한성컴퓨터 TFG24F07V 1500R ..." → "TFG24F07V") ──
function extractModelCode(fullName) {
  const stripped = fullName.replace(/^한성컴퓨터\s+/, '');
  const m = stripped.match(/^(TFG\S+(?:\s+QD-OLED)?|ULTRON\s+\S+)/);
  return m ? m[1] : stripped.split(' ')[0];
}

// ── 스펙 문자열 빌드 ──────────────────────────────────────────────────────
function buildSpec(row) {
  // row: [구분, 상품코드, 모델명, 브랜드, 인치, 해상도, 주사율, 패널, 오늘가, 어제가, 변동액, ...]
  const res = row[5] || '';
  const panel = row[13] || row[7] || '';
  const hz = row[12] || row[6] || '';  // 주사율구간(13번째 컬럼) 우선, 없으면 주사율
  return [res, panel, hz].filter(Boolean).join(' · ');
}

// ── 스펙 그룹 키 (자사↔경쟁사 매칭에 사용) ──────────────────────────────
function specKey(row) {
  const miniLed = row[20] === 'MINILED' ? 'MINILED' : '';
  return `${row[4]}|${row[5]}|${row[12]}|${row[13]}|${miniLed}`;
}

// ── 설정 탭 노출 순서 읽기 (T열, 8행~) ──────────────────────────────────────
async function fetchDisplayOrder() {
  const auth = new google.auth.GoogleAuth({
    keyFile: CREDS_PATH,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
  const client = await auth.getClient();
  const sheets = google.sheets({ version: 'v4', auth: client });
  const res = await sheets.spreadsheets.values.get(
    { spreadsheetId: SHEET_ID, range: '설정!T8:T' },
    { headers: { 'Cache-Control': 'no-cache, no-store', 'Pragma': 'no-cache' } }
  );
  return (res.data.values || []).map(row => (row[0] || '').trim()).filter(Boolean);
}

const INCH_ORDER = ['24인치', '27인치', '32인치', '34인치', '38인치', '49인치'];

// ── GET /api/compare ─────────────────────────────────────────────────────────
// buildDashModels 형식으로 반환
// {
//   m: 모델코드,   i: 인치,  s: 스펙문자열,
//   o: 오늘가격,   w: 무결점가격(없으면 null),
//   k: { 브랜드명: { n: 경쟁사명, p: 가격, id: 상품코드, c: 변동액 }, ... }
// }
app.get('/api/monitor/compare', async (req, res) => {
  try {
    const [allRows, orderList] = await Promise.all([
      fetchRows().then(r => r.slice(1)),
      fetchDisplayOrder(),
    ]);

    const ownRows = allRows.filter(r => r[0] === '자사');
    const compRows = allRows.filter(r => r[0] === '경쟁사');

    // 자사: regular(무결점=false) 행 목록
    const regular = ownRows.filter(r => r[16] === 'false');

    // 자사 무결점 행 인덱스 (모델명으로 매핑)
    const noDefectMap = {};
    ownRows
      .filter(r => r[16] === 'true')
      .forEach(r => {
        // 무결점 행의 모델명 = 기본 모델명 + " 무결점"
        const baseName = r[2].replace(/\s*무결점$/, '');
        noDefectMap[baseName] = r;
      });

    // 경쟁사를 스펙키 → 브랜드 → 가격순 배열로 인덱싱 (최대 5개)
    const compIndex = {};
    compRows.forEach(r => {
      const key = specKey(r);
      const brand = r[3];
      if (!BRANDS.includes(brand)) return;
      if (!compIndex[key]) compIndex[key] = {};
      if (!compIndex[key][brand]) compIndex[key][brand] = [];
      compIndex[key][brand].push(r);
    });

    const result = regular.map(r => {
      const modelCode = extractModelCode(r[2]);
      const inch = r[4] || '';
      const spec = buildSpec(r);
      const todayPrice = parsePrice(r[8]);
      const key = specKey(r);

      // 무결점 가격
      const ndRow = noDefectMap[r[2]];
      const noDefectPrice = ndRow ? parsePrice(ndRow[8]) : null;

      // 경쟁사 매핑 (브랜드별 최대 5개, 가격순 배열)
      const k = {};
      const compsBySpec = compIndex[key] || {};
      for (const [brand, brandRows] of Object.entries(compsBySpec)) {
        k[brand] = brandRows
          .sort((a, b) => parsePrice(a[8]) - parsePrice(b[8]))
          .slice(0, 5)
          .map(cr => {
            const todayP = parsePrice(cr[8]);
            const yesterdayP = parsePrice(cr[9]);
            return {
              n: cr[2],
              p: todayP,
              id: cr[1] ? parseInt(cr[1], 10) || null : null,
              c: yesterdayP > 0 ? todayP - yesterdayP : 0,
            };
          });
      }

      return { m: modelCode, i: inch, s: spec, o: todayPrice, w: noDefectPrice, k,
               d: r[14] || r[15] || '', ml: r[20] === 'MINILED' ? 'MINILED' : '',
               pc: r[1] ? parseInt(r[1], 10) || null : null };
    });

    // 설정 탭 순서대로 정렬, 미등록 모델은 인치순으로 뒤에 붙임
    const orderMap = new Map(orderList.map((code, idx) => [code, idx]));
    result.sort((a, b) => {
      const ai = orderMap.has(a.m) ? orderMap.get(a.m) : Infinity;
      const bi = orderMap.has(b.m) ? orderMap.get(b.m) : Infinity;
      if (ai !== bi) return ai - bi;
      const aInch = INCH_ORDER.indexOf(a.i);
      const bInch = INCH_ORDER.indexOf(b.i);
      return (aInch === -1 ? 99 : aInch) - (bInch === -1 ? 99 : bInch);
    });

    res.json(result);
  } catch (err) {
    console.error('/api/compare error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/newproducts ────────────────────────────────────────────────────
// buildNewModels 형식으로 반환 (이번달 경쟁사 신제품)
// {
//   brand, name, id, inch, res, hz, panel, shape, brightness, ym,
//   price, ownModel, ownPrice, diff, diffRatio
// }
app.get('/api/monitor/newproducts', async (req, res) => {
  try {
    const allRows = (await fetchRows()).slice(1);

    // 현재 연월 (YYYY/MM 형식)
    const now = new Date();
    const thisMonth = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}`;

    const ownRows = allRows.filter(r => r[0] === '자사' && r[16] === 'false');

    // 자사: 스펙키 → 가장 저렴한 regular 자사 모델
    const ownIndex = {};
    ownRows.forEach(r => {
      const key = specKey(r);
      const price = parsePrice(r[8]);
      if (!ownIndex[key] || price < parsePrice(ownIndex[key][8])) {
        ownIndex[key] = r;
      }
    });

    // 이번달 경쟁사 신제품
    const newComp = allRows.filter(r =>
      r[0] === '경쟁사' && r[17] && r[17].startsWith(thisMonth)
    );

    const result = newComp.map(r => {
      const brand = r[3] || '';
      const name = r[2] || '';
      const id = r[1] ? parseInt(r[1], 10) || null : null;
      const inch = r[4] || '';
      const resolution = r[5] || '';
      const hz = r[6] || '';
      const panel = r[13] || r[7] || '';
      const shape = r[18] || '';
      const brightness = r[19] || '';
      const dual_mode = r[14] || '';
      const ym = r[17] ? r[17].replace('/', '-') : '';
      const price = parsePrice(r[8]);

      // 동스펙 자사 모델 매칭
      const key = specKey(r);
      const ownRow = ownIndex[key] || null;
      const ownModel = ownRow ? extractModelCode(ownRow[2]) : null;
      const ownPrice = ownRow ? parsePrice(ownRow[8]) : null;
      const diff = ownPrice !== null ? price - ownPrice : null;
      const diffRatio = ownPrice ? Math.round(diff / ownPrice * 1000) / 10 : null;

      return { brand, name, id, inch, res: resolution, hz, panel, shape, brightness, dual_mode, ym, price, ownModel, ownPrice, diff, diffRatio };
    });

    res.json(result);
  } catch (err) {
    console.error('/api/newproducts error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/pricechanges ────────────────────────────────────────────────────
// 대시보드 시트의 "어제 대비 주요 가격 변동 TOP 15" 섹션을 동적으로 탐지해 반환
app.get('/api/monitor/pricechanges', async (req, res) => {
  try {
    const auth = new google.auth.GoogleAuth({
      keyFile: CREDS_PATH,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });
    const client = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: client });
    const batch = await sheets.spreadsheets.values.batchGet(
      { spreadsheetId: SHEET_ID, ranges: ['대시보드!B3', '대시보드!B:I', '가공데이터!A:C'] },
      { headers: { 'Cache-Control': 'no-cache, no-store', 'Pragma': 'no-cache' } }
    );
    const [metaRange, fullRange, garoungRange] = batch.data.valueRanges;

    // "최종: 2026. 5. 27. 오전 9:02:10" 파싱
    const metaStr = (metaRange.values || [['']])[0][0] || '';
    const timeMatch = metaStr.match(/최종:\s*(.+)/);
    const lastRefresh = timeMatch ? timeMatch[1].trim() : '';

    // 가공데이터 모델명 → pcode 맵 (r[2]=모델명, r[1]=상품코드)
    const namePcodeMap = {};
    (garoungRange.values || []).slice(1).forEach(r => {
      const name = (r[2] || '').trim();
      const pcode = r[1] ? parseInt(r[1], 10) || null : null;
      if (name && pcode) namePcodeMap[name] = pcode;
    });

    // "어제 대비 주요 가격 변동" 섹션 제목 행을 동적으로 탐지
    const allRows = fullRange.values || [];
    const sectionIdx = allRows.findIndex(r => (r[0] || '').includes('어제 대비 주요 가격 변동'));
    // 섹션 제목(+1) → 컬럼 헤더(+2) → 데이터 시작(+2)
    const dataRows = sectionIdx >= 0 ? allRows.slice(sectionIdx + 2) : [];

    const items = dataRows
      .filter(r => r[0] && r[1])
      .slice(0, 15)
      .map(r => ({
        type:      r[0],
        name:      r[1],
        brand:     r[2] || '',
        inch:      r[3] || '',
        today:     parsePrice(r[4]),
        yesterday: parsePrice(r[5]),
        diff:      parsePrice(r[6]),
        pct:       parseFloat((r[7] || '0').replace('%', '')) || 0,
        pcode:     namePcodeMap[r[1]] || null,
      }));
    res.json({ lastRefresh, items });
  } catch (err) {
    console.error('/api/pricechanges error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/claude (SSE streaming) ─────────────────────────────────────────
app.post('/api/claude', (req, res) => {
  const { message } = req.body;
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'message is required' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const send = (type, text) => {
    const payload = text !== undefined
      ? JSON.stringify({ type, text })
      : JSON.stringify({ type });
    res.write(`data: ${payload}\n\n`);
  };

  const child = spawn('claude', ['-p', message], { stdio: ['ignore', 'pipe', 'pipe'] });

  child.stdout.on('data', chunk => send('output', chunk.toString()));
  child.stderr.on('data', chunk => send('output', chunk.toString()));
  child.on('error', err => { send('error', err.message); res.end(); });
  child.on('close', () => { send('done'); res.end(); });

  // req.on('close') fires when request body is consumed — use res instead
  res.on('close', () => { if (!child.exitCode && !child.killed) child.kill(); });
});

// ═══════════════════════════════════════════════════════════════════════════
// 키보드 가격비교 API
// ═══════════════════════════════════════════════════════════════════════════

const KB_SPECS_URL = 'https://raw.githubusercontent.com/kwondohoon1/danawa-monitor-crawler/main/data/specs/keyboard_specs.csv';
const KB_HIST_URL  = 'https://raw.githubusercontent.com/kwondohoon1/danawa-monitor-crawler/main/data/history/keyboard_price_history.csv';
const KB_OWN_KW    = '한성';
const KB_EXCL_KW   = ['해외구매', '리퍼', '단순변심', '포터블', '중고'];
const KB_MEMB_KW   = ['자석축', '광축', '정전용량'];
const KB_COLOR_KW  = [
  '스모키그레이', '레트로베이지', '알루비얼골드', '스페이스그레이', '다크그레이',
  '스카이블루', '뽀송',
  '화이트', '블랙', '레드', '블루', '핑크', '그레이', '민트', '베이지', '퍼플',
  '아이보리', '네이비', '올리브', '크림', '골드', '실버', '청록', '카키', '라임',
];

let kbCache = null;
let kbCacheAt = 0;
const KB_TTL = 5 * 60 * 1000;

async function ghFetch(url) {
  const token = process.env.GITHUB_TOKEN;
  const headers = { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' };
  if (token) headers.Authorization = `token ${token}`;
  const r = await fetch(`${url}?_=${Date.now()}`, { headers });
  if (!r.ok) throw new Error(`GitHub ${r.status}: ${url}`);
  return r.text();
}

function parseCSV(text) {
  // Split lines respecting quoted fields; keep quotes for field-level parser
  const lines = [];
  let cur = '', inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') { inQ = !inQ; cur += c; continue; }
    if (c === '\r') continue;
    if (c === '\n' && !inQ) { lines.push(cur); cur = ''; continue; }
    cur += c;
  }
  if (cur.trim()) lines.push(cur);
  if (!lines.length) return [];

  const splitLine = line => {
    const f = []; let field = '', inq = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"' && !inq) { inq = true; continue; }
      if (c === '"' && inq) { if (line[i+1] === '"') { field += '"'; i++; continue; } inq = false; continue; }
      if (c === ',' && !inq) { f.push(field.trim()); field = ''; continue; }
      field += c;
    }
    f.push(field.trim());
    return f;
  };

  const headers = splitLine(lines[0]);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const vals = splitLine(line);
    const obj = {};
    headers.forEach((h, j) => { obj[h] = vals[j] !== undefined ? vals[j] : ''; });
    rows.push(obj);
  }
  return rows;
}

function col(row, ...names) {
  for (const n of names) if (row[n] !== undefined) return (row[n] || '').trim();
  return '';
}

function normalizeContact(c) {
  return KB_MEMB_KW.includes(c) ? '무접점' : c;
}

// Parenthetical suffixes that are NOT colors (preserve these)
const KB_KEEP_PARENS = /^(정품|무결점|한글|영문|한\/영|국내정품|공식|US|KR|JP|A급|B급)$/i;

function removeColor(name) {
  if (/\(\d+색상\)/.test(name)) return name;
  let r = name.trim();
  // Remove trailing (ColorVariant) — any trailing (...) not in KB_KEEP_PARENS
  let prev;
  do {
    prev = r;
    r = r.replace(/\s*\(([^)]+)\)\s*$/, (match, inner) =>
      KB_KEEP_PARENS.test(inner.trim()) ? match : ''
    ).trim();
  } while (r !== prev);
  // Remove trailing space-separated color keywords
  for (const kw of KB_COLOR_KW) {
    r = r.replace(new RegExp(`\\s+${kw}\\s*$`, 'i'), '').trim();
  }
  return r;
}

function kbSpecKey(contact, sw, sl, conn, polling) {
  const c = normalizeContact(contact);
  const is8k = (polling || '').includes('8000');
  const base = `${c}|${sw||''}|${sl||''}|${conn||''}`;
  return is8k ? `${base}|8000Hz` : base;
}

function kbParsePrice(s) {
  if (!s) return 0;
  return parseInt(String(s).replace(/,/g, ''), 10) || 0;
}

async function buildKBData() {
  const now = Date.now();
  if (kbCache && now - kbCacheAt < KB_TTL) return kbCache;

  const stripBOM = t => t.replace(/^﻿/, '');
  const [specsText, histText] = await Promise.all([ghFetch(KB_SPECS_URL), ghFetch(KB_HIST_URL)]);
  const specs = parseCSV(stripBOM(specsText));
  const hist  = parseCSV(stripBOM(histText));

  // ── Wide-format price history: product_code, product_name, [YYYY-MM-DD...] ──
  const histHeaders = hist.length > 0 ? Object.keys(hist[0]) : [];
  const dateCols = histHeaders.filter(h => /^\d{4}-\d{2}-\d{2}$/.test(h)).sort().reverse();

  const priceMap = {};
  for (const h of hist) {
    const pcode = (h['product_code'] || h['pcode'] || '').trim();
    const name  = (h['product_name'] || h['name'] || '').trim();
    if (!pcode) continue;
    let today = 0, yesterday = 0;
    for (const d of dateCols) {
      const p = kbParsePrice(h[d]);
      if (p > 0) {
        if (!today) today = p;
        else if (!yesterday) { yesterday = p; break; }
      }
    }
    if (today > 0) priceMap[pcode] = { today, yesterday: yesterday || today, name };
  }

  // ── Build product list from specs ──
  const products = [];
  for (const s of specs) {
    const pcode = (s['product_code'] || s['pcode'] || '').trim();
    if (!pcode) continue;
    const pi = priceMap[pcode];
    if (!pi) continue;

    const name = pi.name || (s['product_name'] || '').trim();
    if (!name) continue;
    if (KB_EXCL_KW.some(kw => name.includes(kw))) continue;

    const contactRaw = (s['switch_contact_type'] || '').trim();
    const contact    = normalizeContact(contactRaw);
    const sw         = (s['switch_type'] || '').trim();
    const size       = (s['size'] || '').trim();
    const layout     = (s['key_layout'] || '').trim();
    const sl         = size && layout ? `${size}(${layout})` : (size || layout);
    const conn       = (s['connection_type'] || '').trim();
    const pollRaw    = (s['polling_rate'] || '').trim();
    const polling    = pollRaw && !/Hz$/i.test(pollRaw) ? `${pollRaw}Hz` : pollRaw;
    const regDate    = (s['registration_month'] || '').trim();
    const brand      = name.split(/\s+/)[0] || '';

    products.push({
      pcode, name, brand, contact, sw, sl, conn, polling,
      is8k: polling.includes('8000'),
      price: pi.today, yesterday: pi.yesterday,
      diff: pi.today - pi.yesterday,
      regDate,
      isOwn: name.includes(KB_OWN_KW),
    });
  }

  // ── group by color-removed name → pick lowest price ──
  const grouped = {};
  for (const p of products) {
    const base = removeColor(p.name);
    if (!grouped[base]) grouped[base] = [];
    grouped[base].push(p);
  }
  const reps = [];
  for (const [base, group] of Object.entries(grouped)) {
    group.sort((a, b) => (a.price || Infinity) - (b.price || Infinity));
    const r = { ...group[0], baseName: base, colorCount: group.length };
    r.displayName = group.length > 1 ? `${base} (${group.length}색상)` : r.name;
    reps.push(r);
  }

  const ownReps  = reps.filter(p => p.isOwn);
  const compReps = reps.filter(p => !p.isOwn);

  // ── competitor spec index ──
  const compBySpec = {};
  for (const p of compReps) {
    const key = kbSpecKey(p.contact, p.sw, p.sl, p.conn, p.polling);
    if (!compBySpec[key]) compBySpec[key] = [];
    compBySpec[key].push(p);
  }
  for (const arr of Object.values(compBySpec)) arr.sort((a, b) => (a.price||Infinity) - (b.price||Infinity));

  // ── build compare data ──
  const compareData = ownReps.map(p => {
    const m = p.baseName.replace(/^한성컴퓨터\s+/, '').replace(/^한성\s+/, '').trim();
    const specKey = kbSpecKey(p.contact, p.sw, p.sl, p.conn, p.polling);
    const comps = (compBySpec[specKey] || []).slice(0, 15).map(c => ({
      name:    c.displayName,
      price:   c.price,
      code:    c.pcode,
      contact: c.contact,
      switch:  c.sw,
      sl:      c.sl,
      conn:    c.conn,
      polling: c.polling,
      diffOwn: c.price - p.price,
      change:  c.diff,
    }));
    return {
      m, code: p.pcode, contact: p.contact, switch: p.sw, sl: p.sl,
      conn: p.conn, polling: p.polling, is8k: p.is8k,
      price: p.price, yesterday: p.yesterday, diff: p.diff,
      comps,
    };
  });

  // ── new products this month ──
  const nowD = new Date();
  const thisYM = `${nowD.getFullYear()}/${String(nowD.getMonth()+1).padStart(2,'0')}`;
  const newProducts = compReps
    .filter(p => p.regDate && p.regDate.startsWith(thisYM))
    .map(p => ({
      type: '경쟁사', code: p.pcode, name: p.name,
      name_no_color: p.baseName, contact: p.contact, switch: p.sw,
      sl: p.sl, conn: p.conn, polling: p.polling,
      today: p.price, yesterday: p.yesterday, diff: p.diff,
      reg: (p.regDate || '').slice(0, 7), brand: p.brand,
      display_name: p.displayName,
    }));

  kbCache = { compareData, newProducts };
  kbCacheAt = Date.now();
  return kbCache;
}

// ── GET /api/keyboard/compare ────────────────────────────────────────────────
app.get('/api/keyboard/compare', async (req, res) => {
  try {
    const { compareData } = await buildKBData();
    res.json(compareData);
  } catch (err) {
    console.error('/api/keyboard/compare error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/keyboard/new ────────────────────────────────────────────────────
app.get('/api/keyboard/new', async (req, res) => {
  try {
    const { newProducts } = await buildKBData();
    res.json(newProducts);
  } catch (err) {
    console.error('/api/keyboard/new error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── nrank 카테고리 설정 ───────────────────────────────────────────────────────
// 카테고리 추가 시 이 배열에만 항목을 추가하면 됨
const NRANK_CATEGORIES = [
  {
    id:       'monitor',
    name:     '모니터',
    csvUrl:   'https://raw.githubusercontent.com/younine/naver-ranking/main/data/history/nrank_monitor.csv',
    ourBrand: '한성컴퓨터',
    keyword:  '모니터',
  },
  {
    id:       'tv',
    name:     'TV',
    csvUrl:   'https://raw.githubusercontent.com/younine/naver-ranking/main/data/history/nrank_tv.csv',
    ourBrand: '한성컴퓨터',
    keyword:  'TV',
  },
  // {
  //   id:       'keyboard',
  //   name:     '키보드',
  //   csvUrl:   'https://raw.githubusercontent.com/younine/naver-ranking/main/data/history/nrank_keyboard.csv',
  //   ourBrand: '한성컴퓨터',
  // },
];

const NRANK_TTL   = 30 * 60 * 1000;
const nrankCache  = {}; // { [categoryId]: { data, cachedAt } }

function isNrankStale(categoryId) {
  const c = nrankCache[categoryId];
  if (!c) return true;
  return Date.now() - c.cachedAt > NRANK_TTL;
}

// ── GitHub Actions 워크플로우 트리거 (매일 8:30 KST) ─────────────────────────
const NRANK_REPO     = 'younine/naver-ranking';
const NRANK_WORKFLOW = 'collect.yml';

async function triggerNrankWorkflow(keyword, category) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) { console.error('[nrank] GITHUB_TOKEN 없음 — 워크플로우 트리거 불가'); return; }

  try {
    const r = await fetch(
      `https://api.github.com/repos/${NRANK_REPO}/actions/workflows/${NRANK_WORKFLOW}/dispatches`,
      {
        method: 'POST',
        headers: {
          Authorization:  `token ${token}`,
          Accept:         'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ref: 'main', inputs: { keyword, category } }),
      }
    );

    if (r.status === 204) {
      console.log(`[nrank:${category}] 워크플로우 트리거 성공 → 10분 후 CSV 캐시 갱신 예정`);
      setTimeout(async () => {
        const cat = NRANK_CATEGORIES.find(c => c.id === category);
        if (cat) {
          try {
            await fetchNrankBrand(cat);
          } catch (e) {
            console.error(`[nrank:${cat.id}] 트리거 후 갱신 실패:`, e.message);
          }
        }
      }, 10 * 60 * 1000);
    } else {
      const body = await r.text().catch(() => '');
      console.error(`[nrank:${category}] 워크플로우 트리거 실패 (HTTP ${r.status}):`, body.slice(0, 200));
    }
  } catch (e) {
    console.error(`[nrank:${category}] 워크플로우 트리거 오류:`, e.message);
  }
}

function scheduleNrankTrigger(kstHour, kstMinute, keyword, category) {
  const now = Date.now();
  const kst = new Date(now + 9 * 3600 * 1000);
  let target = new Date(Date.UTC(
    kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate(),
    kstHour - 9, kstMinute, 0, 0
  ));
  if (now >= target.getTime()) target = new Date(target.getTime() + 24 * 3600 * 1000);

  const diffMin = Math.round((target.getTime() - now) / 60000);
  console.log(`[nrank:${category}] 다음 수집 트리거: ${target.toISOString()} (약 ${diffMin}분 후)`);

  setTimeout(async () => {
    await triggerNrankWorkflow(keyword, category);
    scheduleNrankTrigger(kstHour, kstMinute, keyword, category);
  }, target.getTime() - Date.now());
}
scheduleNrankTrigger(8, 30, '모니터', 'monitor');
scheduleNrankTrigger(8, 31, 'TV', 'tv');

async function fetchNrankBrand(category) {
  let csvText = await ghFetch(category.csvUrl);
  if (csvText.charCodeAt(0) === 0xFEFF) csvText = csvText.slice(1);

  const rows = parseCSV(csvText);
  if (!rows.length) throw new Error('CSV 데이터가 비어있습니다');

  const keys     = Object.keys(rows[0]);
  const dateCols = keys.filter(k => /^\d{4}-\d{2}-\d{2}$/.test(k.trim()));
  if (dateCols.length === 0) throw new Error(`날짜 컬럼 없음. 컬럼: ${keys.join(', ')}`);

  const brandKey = keys.find(k => /^brand$/i.test(k.trim())) || 'brand';
  const titleKey = keys.find(k => /^title$/i.test(k.trim())) || 'title';
  const priceKey = keys.find(k => /^price$/i.test(k.trim())) || 'price';
  const linkKey  = keys.find(k => /^link$/i.test(k.trim()))  || 'link';

  const brandMap = {};
  const products = [];

  for (const row of rows) {
    const brand = (row[brandKey] || '').trim();
    if (!brand) continue;
    if (!brandMap[brand]) brandMap[brand] = {};

    const ranks = {};
    for (const dc of dateCols) {
      const val = (row[dc] || '').trim();
      if (!val) continue;
      const rank = parseInt(val, 10);
      if (isNaN(rank) || rank <= 0) continue;
      ranks[dc] = rank;
      if (!brandMap[brand][dc] || brandMap[brand][dc] > rank) brandMap[brand][dc] = rank;
    }

    if (Object.keys(ranks).length > 0) {
      products.push({
        title: (row[titleKey] || '').trim(),
        brand,
        price: parseInt(row[priceKey] || '0', 10) || 0,
        link:  (row[linkKey]  || '').trim(),
        ranks,
      });
    }
  }

  const dates      = [...dateCols].sort();
  const latestDate = dates[dates.length - 1];

  // 브랜드별 100위 내 제품 수 (최신일 기준)
  const brand100Map = {};
  for (const p of products) {
    const r = p.ranks[latestDate];
    if (r && r <= 100) brand100Map[p.brand] = (brand100Map[p.brand] || 0) + 1;
  }

  // 브랜드 순위 기준: 100위 내 제품 수 내림차순 → 동점 시 최상위 순위 오름차순
  const brands = Object.keys(brandMap)
    .filter(b => Object.keys(brandMap[b]).length > 0)
    .sort((a, b) => {
      const cnt = (brand100Map[b] || 0) - (brand100Map[a] || 0);
      if (cnt !== 0) return cnt;
      return (brandMap[a][latestDate] ?? 9999) - (brandMap[b][latestDate] ?? 9999);
    });

  const brandRankMap = {};
  brands.forEach((b, i) => { brandRankMap[b] = i + 1; });

  const data = { cachedAt: new Date().toISOString(), brands, dates, data: brandMap, brandRankMap, brand100Map, products };
  nrankCache[category.id] = { data, cachedAt: Date.now() };
  console.log(`[nrank:${category.id}] CSV 갱신 완료 (${rows.length}행, ${brands.length}브랜드, ${dates.length}일)`);
  return data;
}

// GET /api/nrank/categories
app.get('/api/nrank/categories', (req, res) => {
  res.json(NRANK_CATEGORIES.map(({ id, name, ourBrand }) => ({ id, name, ourBrand })));
});

// GET /api/nrank/brand?category=monitor
app.get('/api/nrank/brand', async (req, res) => {
  const categoryId = req.query.category || NRANK_CATEGORIES[0].id;
  const category   = NRANK_CATEGORIES.find(c => c.id === categoryId);
  if (!category) return res.status(400).json({ error: `알 수 없는 카테고리: ${categoryId}` });
  try {
    const force = req.query.force === '1';
    if (!force && !isNrankStale(categoryId)) return res.json(nrankCache[categoryId].data);
    const result = await fetchNrankBrand(category);
    res.json(result);
  } catch (err) {
    console.error(`/api/nrank/brand[${categoryId}] error:`, err.message);
    if (nrankCache[categoryId]) return res.json(nrankCache[categoryId].data);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/nrank/best  — 네이버 베스트 브랜드 순위 (snxbest.naver.com 스크래핑) ──
const axios = require('axios');

const NAVER_BEST_URL    = 'https://snxbest.naver.com/brand';
const NAVER_BEST_PARAMS = 'categoryId=50000153&sortType=BRAND_POPULAR&periodType=WEEKLY&ageType=ALL';
const BEST_TTL          = 60 * 60 * 1000; // 1시간 캐시
const bestCache         = { data: null, cachedAt: 0 };

async function fetchNaverBest() {
  const res = await axios.get(`${NAVER_BEST_URL}?${NAVER_BEST_PARAMS}`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'ko-KR,ko;q=0.9',
    },
    timeout: 15000,
  });

  const html = res.data;

  // Next.js 스트리밍 청크 중 rankData가 포함된 스크립트 찾기
  let decoded = null;
  const scriptRe = /<script[^>]*>([\s\S]*?)<\/script>/g;
  let sm;
  while ((sm = scriptRe.exec(html)) !== null) {
    const content = sm[1];
    if (!content.includes('rankData')) continue;
    const pm = content.match(/self\.__next_f\.push\(\[\d+,([\s\S]*)\]\)/);
    if (!pm) continue;
    const raw = pm[1].trim();
    if (raw[0] !== '"') continue;
    decoded = JSON.parse(raw);
    break;
  }
  if (!decoded) throw new Error('rankData 스크립트를 찾을 수 없습니다');

  const rdIdx = decoded.indexOf('"rankData":[');
  if (rdIdx === -1) throw new Error('rankData 키를 찾을 수 없습니다');

  const start = decoded.indexOf('[', rdIdx);
  let depth = 0, end = start;
  for (let i = start; i < decoded.length; i++) {
    if (decoded[i] === '[') depth++;
    else if (decoded[i] === ']') { depth--; if (depth === 0) { end = i + 1; break; } }
  }

  const rankData = JSON.parse(decoded.slice(start, end));

  const ranks = rankData.map(item => ({
    rank:     item.rank,
    title:    item.title,
    brandUrl: item.brandUrl || null,
    status:   item.status  || 'STABLE',
  }));
  const syncDate = rankData[0]?.syncDate || null;

  return { ranks, syncDate };
}

app.get('/api/nrank/best', async (req, res) => {
  try {
    const force = req.query.force === '1';
    if (!force && bestCache.data && Date.now() - bestCache.cachedAt < BEST_TTL) {
      return res.json(bestCache.data);
    }
    const data = await fetchNaverBest();
    bestCache.data     = data;
    bestCache.cachedAt = Date.now();
    res.json(data);
  } catch (err) {
    console.error('/api/nrank/best error:', err.message);
    if (bestCache.data) return res.json(bestCache.data);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/nrank/realtime ─────────────────────────────────────────────────
app.post('/api/nrank/realtime', async (req, res) => {
  try {
    const { keyword, brand } = req.body || {};
    if (!keyword || !brand) return res.status(400).json({ error: 'keyword, brand 필요' });

    const clientId     = process.env.NAVER_CLIENT_ID;
    const clientSecret = process.env.NAVER_CLIENT_SECRET;
    if (!clientId || !clientSecret) return res.status(500).json({ error: '네이버 API 키가 설정되지 않았습니다 (NAVER_CLIENT_ID, NAVER_CLIENT_SECRET)' });

    // 최대 300개 (100개 × 3회)
    const allItems = [];
    for (let start = 1; start <= 201; start += 100) {
      const url = `https://openapi.naver.com/v1/search/shop.json?query=${encodeURIComponent(keyword)}&display=100&start=${start}&sort=sim`;
      const r = await fetch(url, {
        headers: {
          'X-Naver-Client-Id':     clientId,
          'X-Naver-Client-Secret': clientSecret,
        },
      });
      if (!r.ok) {
        const errText = await r.text().catch(() => '');
        throw new Error(`Naver API ${r.status}: ${errText.slice(0, 200)}`);
      }
      const data = await r.json();
      const items = data.items || [];
      allItems.push(...items);
      if (items.length < 100) break;
    }

    // 전체 아이템에 순위 부여
    const ranked = allItems.map((item, i) => ({
      rank:   i + 1,
      title:  (item.title || '').replace(/<[^>]+>/g, ''),
      price:  parseInt(item.lprice || item.hprice || '0', 10),
      link:   item.link || '',
      image:  item.image || '',
      brand:  (item.brand || item.maker || '').trim(),
    }));

    // 브랜드별 집계
    const brandStats = {};
    for (const item of ranked) {
      const b = item.brand || '기타';
      if (!brandStats[b]) brandStats[b] = { firstRank: item.rank, count: 0, count100: 0, products: [] };
      brandStats[b].count++;
      if (item.rank <= 100) brandStats[b].count100++;
      if (brandStats[b].products.length < 50) brandStats[b].products.push(item);
    }

    // 브랜드 순위: 100위 내 개수 내림차순 → 동점 시 최상위 순위 오름차순
    const sortedBrands = Object.entries(brandStats)
      .sort(([, a], [, b]) => {
        const cnt = b.count100 - a.count100;
        return cnt !== 0 ? cnt : a.firstRank - b.firstRank;
      });
    const brandRankMap = {};
    sortedBrands.forEach(([b], i) => { brandRankMap[b] = i + 1; });

    // 요청 브랜드와 가장 유사한 키 찾기
    const brandLower = brand.toLowerCase();
    const matchedKey = Object.keys(brandStats).find(k => k.toLowerCase() === brandLower)
      || Object.keys(brandStats).find(k => k.toLowerCase().includes(brandLower) || brandLower.includes(k.toLowerCase()))
      || null;

    const stats = matchedKey ? brandStats[matchedKey] : null;

    res.json({
      keyword,
      brand,
      matchedBrand: matchedKey || null,
      firstRank:    stats?.firstRank ?? null,
      count:        stats?.count ?? 0,
      count100:     stats?.count100 ?? 0,
      brandRank:    matchedKey ? brandRankMap[matchedKey] : null,
      totalBrands:  sortedBrands.length,
      totalItems:   ranked.length,
      products:     stats?.products ?? [],
      allBrands:    sortedBrands.slice(0, 30).map(([b, s]) => ({
        brand: b, brandRank: brandRankMap[b], firstRank: s.firstRank, count100: s.count100, count: s.count,
      })),
    });
  } catch (err) {
    console.error('/api/nrank/realtime error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/compuzone/xls ──────────────────────────────────────────────────
app.post('/api/compuzone/xls', requireAuth, (req, res, next) => {
  const u = req.user;
  if (u.role !== 'admin' && !u.permissions?.includes('b2b_viewer') && !u.permissions?.includes('b2b_editor'))
    return res.status(403).json({ error: 'B2B 발주 권한이 없습니다' });
  next();
}, (req, res) => {
  const { headers, rows, numCols, filename } = req.body || {};
  if (!headers || !rows) return res.status(400).json({ error: 'headers, rows 필요' });

  const payload = JSON.stringify({ headers, rows, numCols: numCols || [] });
  const py = spawn('python3', [path.join(__dirname, 'gen_xls.py')]);
  const chunks = [];

  py.stdin.write(payload);
  py.stdin.end();

  py.stdout.on('data', d => chunks.push(d));
  py.stderr.on('data', d => console.error('[gen_xls]', d.toString()));

  py.on('close', code => {
    if (code !== 0) return res.status(500).json({ error: 'xls 생성 실패' });
    const buf = Buffer.concat(chunks);
    const name = filename || 'download.xls';
    res.setHeader('Content-Type', 'application/vnd.ms-excel');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(name)}`);
    res.send(buf);
  });
});

// ── GET /api/order/hs-codes ──────────────────────────────────────────────────
app.get('/api/order/hs-codes', requireAuth, requireCoupangViewer, (req, res) => {
  const hsPath = path.join(__dirname, 'hs_codes.json');
  if (!fs.existsSync(hsPath)) return res.json({ codes: {}, count: 0 });
  try {
    const codes = JSON.parse(fs.readFileSync(hsPath, 'utf8'));
    res.json({ codes, count: Object.keys(codes).length });
  } catch {
    res.json({ codes: {}, count: 0 });
  }
});

// ── POST /api/order/hs-codes ─────────────────────────────────────────────────
app.post('/api/order/hs-codes', requireAuth, requireCoupangEditor, (req, res) => {
  const { codes } = req.body || {};
  if (!codes || typeof codes !== 'object') return res.status(400).json({ error: 'codes 필요' });
  const hsPath = path.join(__dirname, 'hs_codes.json');
  fs.writeFileSync(hsPath, JSON.stringify(codes, null, 2));
  res.json({ ok: true, count: Object.keys(codes).length });
});

// ── POST /api/order/xls ──────────────────────────────────────────────────────
app.post('/api/order/xls', requireAuth, requireCoupangViewer, (req, res) => {
  const { headers, rows, numCols, filename } = req.body || {};
  if (!headers || !rows) return res.status(400).json({ error: 'headers, rows 필요' });

  const payload = JSON.stringify({ headers, rows, numCols: numCols || [] });
  const py = spawn('python3', [path.join(__dirname, 'gen_xls.py')]);
  const chunks = [];

  py.stdin.write(payload);
  py.stdin.end();

  py.stdout.on('data', d => chunks.push(d));
  py.stderr.on('data', d => console.error('[gen_xls]', d.toString()));

  py.on('close', code => {
    if (code !== 0) return res.status(500).json({ error: 'xls 생성 실패' });
    const buf = Buffer.concat(chunks);
    const name = filename || 'download.xls';
    res.setHeader('Content-Type', 'application/vnd.ms-excel');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(name)}`);
    res.send(buf);
  });
});

// ── B2B 공용 설정 ────────────────────────────────────────────────────────────
const B2B_SETTINGS_PATH = path.join(require('os').homedir(), 'b2b-settings.json');

function readB2BSettings() {
  try { return JSON.parse(fs.readFileSync(B2B_SETTINGS_PATH, 'utf8')); }
  catch { return { items: [] }; }
}

function requireB2B(req, res, next) {
  if (!hasPerm(req.user, 'b2b_viewer')) return res.status(403).json({ error: 'B2B 권한이 없습니다' });
  next();
}
function requireB2BEditor(req, res, next) {
  if (!hasPerm(req.user, 'b2b_editor')) return res.status(403).json({ error: 'B2B 편집 권한이 없습니다' });
  next();
}

app.get('/api/b2b/settings', requireAuth, requireB2B, (req, res) => {
  res.json(readB2BSettings());
});

app.post('/api/b2b/settings', requireAuth, requireB2BEditor, (req, res) => {
  const { items, warehouses, miracle_warehouse_address, atoz_warehouse_address } = req.body || {};
  if (!Array.isArray(items)) return res.status(400).json({ error: 'items 배열이 필요합니다' });
  const prev = readB2BSettings();
  const data = {
    items,
    warehouses: warehouses !== undefined ? warehouses : (prev.warehouses || []),
    miracle_warehouse_address: miracle_warehouse_address !== undefined ? miracle_warehouse_address : (prev.miracle_warehouse_address || ''),
    atoz_warehouse_address: atoz_warehouse_address !== undefined ? atoz_warehouse_address : (prev.atoz_warehouse_address || ''),
    updatedAt: new Date().toISOString(),
  };
  fs.writeFileSync(B2B_SETTINGS_PATH, JSON.stringify(data, null, 2), 'utf8');
  res.json({ ok: true });
});

// ── GET /api/b2b/atoz/sheet-cache (구글 시트에서 Claude가 파싱한 캐시 반환) ──
const ATOZ_CACHE_PATH = path.join(require('os').homedir(), 'b2b-atoz-cache.json');
app.get('/api/b2b/atoz/sheet-cache', requireAuth, requireB2B, (req, res) => {
  try {
    if (!fs.existsSync(ATOZ_CACHE_PATH)) return res.status(404).json({ error: '캐시 없음. 시트 불러오기를 먼저 요청해주세요.' });
    const data = JSON.parse(fs.readFileSync(ATOZ_CACHE_PATH, 'utf8'));
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: '캐시 읽기 실패' });
  }
});

// ── POST /api/b2b/parse (Claude AI로 카카오톡 주문 텍스트 파싱 + 모델 매칭) ──
app.post('/api/b2b/parse', requireAuth, requireB2B, (req, res) => {
  const { text } = req.body || {};
  if (!text) return res.status(400).json({ error: 'text 필요' });

  const productsData = readProducts();
  const skuList = (productsData.products || []).map(it => it.modelName).filter(Boolean).join('\n');

  const prompt = `다음 카카오톡 주문 텍스트에서 주문 정보를 추출하고, 아래 등록 상품 목록에서 가장 적합한 modelName을 매칭해줘.

[등록 상품 목록]
${skuList}

규칙:
1. 상품명: 카톡 원본 그대로
2. modelName: 위 목록에서 가장 근접한 코드. 일반/무결점 구분이 있으면 반영, 없으면 _일반 선택. 매칭 불가 시 빈 문자열.
3. 수량: 없으면 1
4. 주문번호: 없으면 빈 문자열
5. 발주형태: "업체발주"(주소 없이 업체·창고로) 또는 "직발송"(개인 직접 배송). 불명확하면 "직발송".
6. 수령인·연락처·주소: 직발송만 기입. 주소의 [우편번호] 형식 그대로 유지.

설명·마크다운 없이 순수 JSON 배열만 반환:
[{"상품명":"","modelName":"","수량":1,"발주형태":"","수령인":"","연락처":"","주소":"","주문번호":""}]

텍스트:
${text}`;

  const child = spawn('claude', ['-p', prompt], { stdio: ['ignore', 'pipe', 'pipe'] });
  const chunks = [];
  const errChunks = [];

  child.stdout.on('data', d => chunks.push(d));
  child.stderr.on('data', d => errChunks.push(d));
  child.on('error', err => res.status(500).json({ error: err.message }));
  child.on('close', code => {
    if (code !== 0) return res.status(500).json({ error: errChunks.join('') || 'claude 실행 실패' });
    const raw = Buffer.concat(chunks).toString('utf8');
    try {
      const match = raw.match(/\[[\s\S]*\]/);
      if (!match) throw new Error('JSON 배열을 찾을 수 없습니다');
      const items = JSON.parse(match[0]);
      res.json({ items });
    } catch (e) {
      res.status(500).json({ error: `JSON 파싱 실패: ${e.message}`, raw });
    }
  });
});

// ── POST /api/order/miracle/download ─────────────────────────────────────────
app.post('/api/order/miracle/download', requireAuth, requireB2B, (req, res) => {
  const { headers, rows, numCols, filename } = req.body || {};
  if (!headers || !rows) return res.status(400).json({ error: 'headers, rows 필요' });

  const payload = JSON.stringify({ headers, rows, numCols: numCols || [] });
  const py = spawn('python3', [path.join(__dirname, 'gen_xls.py')]);
  const chunks = [];

  py.stdin.write(payload);
  py.stdin.end();

  py.stdout.on('data', d => chunks.push(d));
  py.stderr.on('data', d => console.error('[gen_xls miracle]', d.toString()));

  py.on('close', code => {
    if (code !== 0) return res.status(500).json({ error: 'xls 생성 실패' });
    const buf = Buffer.concat(chunks);
    const name = filename || 'miracle.xls';
    res.setHeader('Content-Type', 'application/vnd.ms-excel');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(name)}`);
    res.send(buf);
  });
});

// ── POST /api/order/atoz/download ────────────────────────────────────────────
app.post('/api/order/atoz/download', requireAuth, requireB2B, (req, res) => {
  const { headers, rows, numCols, filename } = req.body || {};
  if (!headers || !rows) return res.status(400).json({ error: 'headers, rows 필요' });

  const payload = JSON.stringify({ headers, rows, numCols: numCols || [] });
  const py = spawn('python3', [path.join(__dirname, 'gen_xls.py')]);
  const chunks = [];

  py.stdin.write(payload);
  py.stdin.end();

  py.stdout.on('data', d => chunks.push(d));
  py.stderr.on('data', d => console.error('[gen_xls atoz]', d.toString()));

  py.on('close', code => {
    if (code !== 0) return res.status(500).json({ error: 'xls 생성 실패' });
    const buf = Buffer.concat(chunks);
    const name = filename || 'atoz.xls';
    res.setHeader('Content-Type', 'application/vnd.ms-excel');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(name)}`);
    res.send(buf);
  });
});

// ── POST /api/order/assacom/download ─────────────────────────────────────────
app.post('/api/order/assacom/download', requireAuth, requireB2B, (req, res) => {
  const { headers, rows, numCols, filename } = req.body || {};
  if (!headers || !rows) return res.status(400).json({ error: 'headers, rows 필요' });

  const payload = JSON.stringify({ headers, rows, numCols: numCols || [] });
  const py = spawn('python3', [path.join(__dirname, 'gen_xls.py')]);
  const chunks = [];

  py.stdin.write(payload);
  py.stdin.end();

  py.stdout.on('data', d => chunks.push(d));
  py.stderr.on('data', d => console.error('[gen_xls assacom]', d.toString()));

  py.on('close', code => {
    if (code !== 0) return res.status(500).json({ error: 'xls 생성 실패' });
    const buf = Buffer.concat(chunks);
    const name = filename || 'assacom.xls';
    res.setHeader('Content-Type', 'application/vnd.ms-excel');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(name)}`);
    res.send(buf);
  });
});

// ── Products API ─────────────────────────────────────────────────────────────
const PRODUCTS_PATH = path.join(require('os').homedir(), 'product-data', 'products.json');

function readProducts() {
  try {
    const dir = path.dirname(PRODUCTS_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    return JSON.parse(fs.readFileSync(PRODUCTS_PATH, 'utf8'));
  } catch {
    return { products: [] };
  }
}

function writeProducts(data) {
  const dir = path.dirname(PRODUCTS_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(PRODUCTS_PATH, JSON.stringify(data, null, 2), 'utf8');
}

function requireProductViewer(req, res, next) {
  if (!hasPerm(req.user, 'product_viewer')) return res.status(403).json({ error: '제품 관리 권한이 없습니다' });
  next();
}
function requireProductEditor(req, res, next) {
  if (!hasPerm(req.user, 'product_editor')) return res.status(403).json({ error: '제품 편집 권한이 없습니다' });
  next();
}

app.get('/api/products', requireAuth, requireProductViewer, (req, res) => {
  res.json(readProducts());
});

app.post('/api/products', requireAuth, requireProductEditor, (req, res) => {
  const { products } = req.body || {};
  if (!Array.isArray(products)) return res.status(400).json({ error: 'products 배열이 필요합니다' });
  writeProducts({ products, updatedAt: new Date().toISOString() });
  res.json({ ok: true, count: products.length });
});

// ── 외부 가격검수기 연동용 읽기 전용 피드 (API 키 인증, 판매가 정보만 노출) ──────────
function requireApiKey(req, res, next) {
  const key = req.headers['x-api-key'];
  if (!key || key !== process.env.PRICE_FEED_API_KEY) {
    return res.status(401).json({ error: 'API 키가 유효하지 않습니다' });
  }
  next();
}

// 관리자가 프론트엔드에서 연동 정보(주소+키)를 확인/복사할 수 있도록 제공
app.get('/api/products/feed-info', requireAuth, requireAdmin, (req, res) => {
  res.json({ apiKey: process.env.PRICE_FEED_API_KEY || '' });
});

app.get('/api/products/feed', requireApiKey, (req, res) => {
  const data = readProducts();
  const products = (data.products || []).map(p => ({
    skuId: p.skuId || '',
    modelName: p.modelName || '',
    salePrice: p.salePrice || '',
  }));
  res.json({ products, updatedAt: data.updatedAt || null });
});

// ── Events API ───────────────────────────────────────────────────────────────
const EVENTS_PATH = path.join(require('os').homedir(), 'event-data', 'events.json');

function readEvents() {
  try {
    const dir = path.dirname(EVENTS_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    return JSON.parse(fs.readFileSync(EVENTS_PATH, 'utf8'));
  } catch {
    return [];
  }
}

function writeEvents(data) {
  const dir = path.dirname(EVENTS_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(EVENTS_PATH, JSON.stringify(data, null, 2), 'utf8');
}

/* 구 형식(modelCode 필드) → 프로모션 형식 자동 마이그레이션 */
function migrateToPromotions(events) {
  if (!events.length || events[0].models !== undefined) return events;
  const groups = {};
  for (const ev of events) {
    const key = `${ev.platform}|${ev.startDate}|${ev.endDate}`;
    if (!groups[key]) {
      groups[key] = {
        id: ev.id,
        promotionName: `${ev.platform} ${ev.startDate.slice(5)}~${ev.endDate.slice(5)}`,
        platform: ev.platform,
        startDate: ev.startDate,
        endDate: ev.endDate,
        models: [],
        createdAt: ev.createdAt,
      };
    }
    groups[key].models.push({ modelCode: ev.modelCode || '', salePrice: ev.salePrice || '', memo: ev.memo || '' });
  }
  const promotions = Object.values(groups);
  writeEvents(promotions);
  return promotions;
}

/* GET /api/events — 프로모션 목록 반환 */
app.get('/api/events', requireAuth, (req, res) => {
  res.json(migrateToPromotions(readEvents()));
});

/* POST /api/events — 프로모션 단위 등록 */
app.post('/api/events', requireAuth, (req, res) => {
  const { promotionName, platform, startDate, endDate, models } = req.body || {};
  if (!promotionName || !Array.isArray(models) || models.length === 0) {
    return res.status(400).json({ error: '프로모션명과 모델 목록이 필요합니다' });
  }
  const promotions = migrateToPromotions(readEvents());
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  promotions.push({
    id,
    promotionName: promotionName.trim(),
    platform: platform || '전체',
    startDate,
    endDate,
    models: models.map(m => ({ modelCode: m.modelCode || '', salePrice: m.salePrice || '', memo: m.memo || '' })),
    createdAt: new Date().toISOString(),
  });
  writeEvents(promotions);
  res.json({ id, count: models.length });
});

/* DELETE /api/events/:id — 프로모션 단위 삭제 */
app.delete('/api/events/:id', requireAuth, (req, res) => {
  const promotions = migrateToPromotions(readEvents());
  const idx = promotions.findIndex(p => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: '프로모션을 찾을 수 없습니다' });
  promotions.splice(idx, 1);
  writeEvents(promotions);
  res.json({ ok: true });
});


// ── 쿠팡 신제품 등록 ─────────────────────────────────────────────────────────

const REGISTER_BASE_DIR = path.join(require('os').homedir(), 'coupang-register-app', 'template');

// 카테고리 설정: csvUrl이 null이면 자동 조회 미지원 (수동 입력만 가능)
const CATEGORY_CONFIG = {
  monitor: {
    label: '모니터',
    csvUrl: 'https://raw.githubusercontent.com/kwondohoon1/danawa-monitor-crawler/main/data/specs/monitor_specs.csv',
    categoryPath: '가전/디지털>컴퓨터/게임/SW>모니터>모니터 (63148)',
    staticFields: {
      '브랜드': '한성컴퓨터',
      '과세여부': '과세',
      '제조사': '(주)한성',
      '거래타입': '제조사',
      '수입여부': '수입상품',
      '박스 내 SKU 수량': '1',
      '유통기간 *식품의 경우 소비기간 (일수기재)': '0',
      '취급주의 사유': '유리',
      '계절': '사계절',
      '에너지소비효율등급': '최저소비효율만족',
      '제조자(수입자)': '(주)한성',
      '제조국': '중국',
    },
  },
};

function getCategoryDir(cat)  { return path.join(REGISTER_BASE_DIR, cat); }
function getCategoryTpl(cat)  { return path.join(getCategoryDir(cat), 'estimate.xlsx'); }

function getRegisterSettingsPath(cat) { return path.join(getCategoryDir(cat), 'settings.json'); }
function loadRegisterSettings(cat) {
  const p = getRegisterSettingsPath(cat);
  if (!fs.existsSync(p)) return {};
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return {}; }
}
function saveRegisterSettings(cat, data) {
  const dir = getCategoryDir(cat);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(getRegisterSettingsPath(cat), JSON.stringify(data, null, 2));
}

function parseRegisterCSV(text) {
  const lines = [];
  let cur = '', inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') { inQ = !inQ; cur += c; continue; }
    if (c === '\r') continue;
    if (c === '\n' && !inQ) { lines.push(cur); cur = ''; continue; }
    cur += c;
  }
  if (cur.trim()) lines.push(cur);
  if (!lines.length) return [];
  const splitLine = line => {
    const f = []; let field = '', inq = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"' && !inq) { inq = true; continue; }
      if (c === '"' && inq) { if (line[i+1] === '"') { field += '"'; i++; continue; } inq = false; continue; }
      if (c === ',' && !inq) { f.push(field.trim()); field = ''; continue; }
      field += c;
    }
    f.push(field.trim());
    return f;
  };
  const headers = splitLine(lines[0].replace(/^﻿/, ''));
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const vals = splitLine(line);
    const obj = {};
    headers.forEach((h, j) => { obj[h] = vals[j] !== undefined ? vals[j] : ''; });
    rows.push(obj);
  }
  return rows;
}

// 다나와 패널 표기 → 쿠팡 드롭다운 허용값(PLS/TN/IPS/VA/AHVA/QLED/OLED)으로 정규화
// 예: "Fast IPS" → "IPS", "PVA" → "VA", "Nano IPS" → "IPS"
function normalizePanel(panel) {
  if (/AHVA/i.test(panel)) return 'AHVA';
  if (/QLED/i.test(panel)) return 'QLED';
  if (/OLED/i.test(panel)) return 'OLED';
  if (/PLS/i.test(panel))  return 'PLS';
  if (/IPS/i.test(panel))  return 'IPS';
  if (/VA/i.test(panel))   return 'VA';
  if (/TN/i.test(panel))   return 'TN';
  return '';
}

function mapToRegisterFields(row) {
  const fields = {};

  fields['상품명'] = row.product_name || '';

  // inch: "40cm(16인치)" → split
  const inchMatch = (row.inch || '').match(/^([\d.]+)cm\(([\d.]+)인치\)/);
  if (inchMatch) {
    fields['화면크기(cm)'] = inchMatch[1];
    fields['화면크기(in)'] = inchMatch[2];
  } else {
    fields['화면크기(cm)'] = row.inch || '';
    fields['화면크기(in)'] = '';
  }

  // resolution: "FHD(1920x1080)" → 드롭다운은 괄호 앞 카테고리명만 허용
  // 다나와 표기와 쿠팡 드롭다운 명칭이 다른 경우 매핑 (예: "Ultra WQHD" → "UWQHD")
  const RES_PREFIX_MAP = { 'Ultra WQHD': 'UWQHD' };
  const resPrefix = (row.resolution || '').split('(')[0].trim();
  fields['해상도'] = RES_PREFIX_MAP[resPrefix] || resPrefix;

  // refresh_rate: "144Hz" → "144"
  fields['화면 재생빈도(Hz)'] = (row.refresh_rate || '').replace(/[^0-9]/g, '');

  const panel = row.panel || '';
  fields['모니터 패널']    = normalizePanel(panel);
  fields['모니터 화면비율'] = row.aspect_ratio || '';
  fields['모니터 형태']    = row.shape || '';

  // OLED → 3년, 그 외 → 1년 (CJ 품질보증기준 / AJ 제조사 품질보증 동일하게 채움)
  const warranty = /OLED/i.test(panel) ? '3년' : '1년';
  fields['품질보증기준']   = warranty;
  fields['제조사 품질보증'] = warranty;

  // brightness: "500nits" → "500"
  fields['밝기'] = (row.brightness || '').replace(/[^0-9.]/g, '');

  // registration_month: "2024/03" → split
  const ymMatch = (row.registration_month || '').match(/^(\d{4})\/(\d{2})$/);
  if (ymMatch) {
    fields['출시년월']  = row.registration_month;
    fields['출시 연도'] = ymMatch[1];
  } else {
    fields['출시년월']  = row.registration_month || '';
    fields['출시 연도'] = '';
  }

  fields['주요 사양']        = row.full_spec || '';
  fields['이미지 대체 텍스트'] = row.full_spec || '';
  fields['크기']             = row.inch || '';

  const spec = row.full_spec || '';

  // 응답속도: "1ms" 패턴
  const msMatch = spec.match(/(\d+(?:\.\d+)?)\s*ms/i);
  fields['응답속도'] = msMatch ? msMatch[1] + 'ms' : '';

  // HDMI 포트 개수
  const hdmiMatches = spec.match(/HDMI/gi);
  fields['HDMI 포트 개수'] = hdmiMatches ? String(hdmiMatches.length) : '0';

  // DisplayPort 수
  const dpMatches = spec.match(/DisplayPort|(?<![A-Za-z])DP(?![A-Za-z])/gi);
  fields['Display Port 단자개수'] = dpMatches ? String(dpMatches.length) : '0';

  // USB Type-C 수
  const ucMatches = spec.match(/USB\s*C타입/gi);
  fields['USB Type-C 단자 개수'] = ucMatches ? String(ucMatches.length) : '0';

  // 스피커 내장 — 드롭다운은 "스피커 장착" 단일 옵션뿐, 해당 없으면 공란
  fields['모니터 자체스피커 장착여부'] = /스피커\s*내장/i.test(spec) ? '스피커 장착' : '';

  // 터치 기능 — 드롭다운은 "터치스크린 지원" 단일 옵션뿐, 해당 없으면 공란
  fields['터치 기능여부'] = /터치스크린/i.test(spec) ? '터치스크린 지원' : '';

  // 휴대용 — 드롭다운은 "휴대용" 단일 옵션뿐, 해당 없으면 공란
  fields['휴대용 여부'] = /휴대용/i.test(spec) ? '휴대용' : '';

  // 무게: "숫자g" 또는 "숫자kg"
  const kgMatch  = spec.match(/(\d+(?:\.\d+)?)\s*kg/i);
  const gMatch   = spec.match(/(\d+)\s*g(?!b)/i);
  if (kgMatch)    fields['무게'] = kgMatch[1] + 'kg';
  else if (gMatch) fields['무게'] = gMatch[1] + 'g';
  else            fields['무게'] = '';

  return fields;
}

const MAX_TEMPLATES = 3;

function listTemplates(cat) {
  const dir = getCategoryDir(cat);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(f => f.endsWith('.xlsx'))
    .map(f => {
      const stat = fs.statSync(path.join(dir, f));
      return { name: f, mtime: stat.mtime.getTime() };
    })
    .sort((a, b) => b.mtime - a.mtime);
}

function tplLabel(name) {
  return name.replace(/\.xlsx$/, '');
}

// ── GET /api/coupang/register/settings ───────────────────────────────────────
app.get('/api/coupang/register/settings', requireAuth, requireCoupangViewer, (req, res) => {
  const cat = (req.query.category || '').trim();
  if (!cat) return res.status(400).json({ error: 'category 필요' });
  res.json(loadRegisterSettings(cat));
});

// ── POST /api/coupang/register/settings ──────────────────────────────────────
app.post('/api/coupang/register/settings', requireAuth, requireCoupangEditor, (req, res) => {
  const { category, ...data } = req.body || {};
  if (!category) return res.status(400).json({ error: 'category 필요' });
  saveRegisterSettings(category, data);
  res.json({ ok: true });
});

// [GET] /api/coupang/register/categories — 카테고리 목록
app.get('/api/coupang/register/categories', requireAuth, requireCoupangViewer, (req, res) => {
  // CATEGORY_CONFIG 기준 + 실제 폴더가 있는 미등록 카테고리 병합
  const known = new Set(Object.keys(CATEGORY_CONFIG));
  const fromDisk = fs.existsSync(REGISTER_BASE_DIR)
    ? fs.readdirSync(REGISTER_BASE_DIR).filter(d =>
        fs.statSync(path.join(REGISTER_BASE_DIR, d)).isDirectory())
    : [];
  const all = [...new Set([...known, ...fromDisk])];

  res.json(all.map(id => ({
    id,
    label: (CATEGORY_CONFIG[id] || {}).label || id,
    hasCSV: !!(CATEGORY_CONFIG[id] || {}).csvUrl,
    hasTemplate: listTemplates(id).length > 0,
  })));
});

// [GET] /api/coupang/register/templates?category=monitor
app.get('/api/coupang/register/templates', requireAuth, requireCoupangViewer, (req, res) => {
  const cat = (req.query.category || '').trim();
  if (!cat) return res.status(400).json({ error: 'category 필요' });
  res.json(listTemplates(cat).map(f => ({ name: f.name, label: tplLabel(f.name), mtime: f.mtime })));
});

// [1] POST /api/coupang/register/preview
app.post('/api/coupang/register/preview', requireAuth, requireCoupangViewer, async (req, res) => {
  const { product_code, category } = req.body || {};
  if (!product_code) return res.status(400).json({ error: 'product_code 필요' });
  if (!category)     return res.status(400).json({ error: 'category 필요' });

  const cfg = CATEGORY_CONFIG[category];
  if (!cfg || !cfg.csvUrl) {
    return res.status(400).json({ error: '해당 카테고리는 자동 조회를 지원하지 않습니다. 직접 입력해 주세요.' });
  }

  try {
    const text = await ghFetch(cfg.csvUrl);
    const rows = parseRegisterCSV(text);
    const row  = rows.find(r => (r.product_code || '').trim() === String(product_code).trim());
    if (!row) return res.status(404).json({ error: '상품코드를 찾을 수 없습니다' });
    const fields = mapToRegisterFields(row);
    const settings = loadRegisterSettings(category);
    if (settings.as_contact) fields['A/S 책임자와 전화번호'] = settings.as_contact;
    res.json(fields);
  } catch (err) {
    console.error('[register/preview]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// [2] POST /api/coupang/register/download
app.post('/api/coupang/register/download', requireAuth, requireCoupangViewer, (req, res) => {
  const { _template, _category, rows: rowsInput, ...singleFields } = req.body || {};
  const cat     = (_category || 'monitor').trim();
  const tplName = _template || 'estimate.xlsx';
  const tplPath = path.join(getCategoryDir(cat), path.basename(tplName));

  if (!fs.existsSync(tplPath)) {
    return res.status(404).json({ error: '템플릿 파일이 없습니다. 관리자에게 문의하세요.' });
  }

  // 카테고리별 고정값을 각 행에 주입
  const catCfg = CATEGORY_CONFIG[cat] || {};
  const applyStatic = f => {
    if (catCfg.categoryPath) f['카테고리'] = catCfg.categoryPath;
    if (catCfg.staticFields) Object.assign(f, catCfg.staticFields);
    return f;
  };

  const rows = Array.isArray(rowsInput)
    ? rowsInput.map(r => applyStatic({ ...r }))
    : [applyStatic({ ...singleFields })];

  const catSettings = loadRegisterSettings(cat);
  if (catSettings.as_contact) {
    rows.forEach(r => { r['A/S 책임자와 전화번호'] = catSettings.as_contact; });
  }

  const payload = JSON.stringify({ action: 'download', template_path: tplPath, rows });
  const py = spawn('python3', [path.join(__dirname, 'register_xls.py')]);
  const chunks = [];

  py.stdin.write(payload);
  py.stdin.end();

  py.stdout.on('data', d => chunks.push(d));
  py.stderr.on('data', d => console.error('[register_xls]', d.toString()));

  py.on('close', code => {
    if (code !== 0) return res.status(500).json({ error: 'xlsx 생성 실패' });
    const buf = Buffer.concat(chunks);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent('coupang_register.xlsx')}`);
    res.send(buf);
  });
});

// [3] POST /api/coupang/register/template  (관리자 전용)
const registerUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const cat = (req.body.category || '').trim();
      if (!cat) return cb(new Error('category 필요'));
      const dir = getCategoryDir(cat);
      fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (req, file, cb) => cb(null, '__incoming__.xlsx'),
  }),
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        file.originalname.endsWith('.xlsx')) {
      cb(null, true);
    } else {
      cb(new Error('xlsx 파일만 업로드 가능합니다'));
    }
  },
});

app.post('/api/coupang/register/template', requireAuth, requireAdmin, registerUpload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: '파일이 없습니다' });
  const cat     = (req.body.category || '').trim();
  if (!cat) return res.status(400).json({ error: 'category 필요' });

  const dir     = getCategoryDir(cat);
  const tplPath = getCategoryTpl(cat);

  if (fs.existsSync(tplPath)) {
    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 16);
    fs.renameSync(tplPath, path.join(dir, `estimate_${ts}.xlsx`));
  }
  fs.renameSync(path.join(dir, '__incoming__.xlsx'), tplPath);

  const all = listTemplates(cat);
  if (all.length > MAX_TEMPLATES) {
    all.slice(MAX_TEMPLATES).forEach(f => {
      try { fs.unlinkSync(path.join(dir, f.name)); } catch {}
    });
  }

  res.json({ ok: true, templates: listTemplates(cat).map(f => ({ name: f.name, label: tplLabel(f.name), mtime: f.mtime })) });
});


// [5] GET /api/coupang/register/candidates — 등록 대상 추천 목록
let candidatesCache = null;
let candidatesCacheAt = 0;
const CANDIDATES_TTL = 10 * 60 * 1000;

app.get('/api/coupang/register/candidates', requireAuth, requireCoupangViewer, async (req, res) => {
  try {
    if (candidatesCache && Date.now() - candidatesCacheAt < CANDIDATES_TTL) {
      return res.json(candidatesCache);
    }

    const [specsText, latestText] = await Promise.all([
      ghFetch('https://raw.githubusercontent.com/kwondohoon1/danawa-monitor-crawler/main/data/specs/monitor_specs.csv'),
      ghFetch('https://raw.githubusercontent.com/kwondohoon1/danawa-monitor-crawler/main/data/latest/monitor.csv'),
    ]);

    const specRows = parseRegisterCSV(specsText);
    const hsList = specRows.filter(r => (r.product_name || '').includes('한성컴퓨터') && r.fetch_status === 'ok');

    // Build price map: product_code → latest available price
    const latestRows = parseRegisterCSV(latestText);
    const priceMap = {};
    if (latestRows.length > 0) {
      const keys = Object.keys(latestRows[0]);
      const dateKeys = keys.filter(k => /^\d{4}-\d{2}-\d{2}$/.test(k)).sort().reverse();
      const latestKey = dateKeys[0];
      if (latestKey) {
        latestRows.forEach(r => {
          if (r.product_code) priceMap[r.product_code.trim()] = r[latestKey] || '';
        });
      }
    }

    // Load products.json and build modelName → skuId map
    const productsPath = path.join(require('os').homedir(), 'product-data', 'products.json');
    let products = [];
    try { products = (JSON.parse(fs.readFileSync(productsPath, 'utf8')).products) || []; } catch {}

    const modelSkuMap = {};
    products.forEach(p => { if (p.modelName) modelSkuMap[p.modelName] = p.skuId || ''; });

    // Extract model key from danawa product_name
    function candidateKey(productName) {
      const base = productName.replace(/^한성컴퓨터\s*/i, '').trim();
      const m = base.match(/^([A-Za-z0-9]+)/);
      const model = m ? m[1].toUpperCase() : '';
      const variant = productName.includes('무결점') ? '무결점' : '일반';
      return model ? `${model}_${variant}` : null;
    }

    const candidates = hsList.filter(row => {
      const key = candidateKey(row.product_name || '');
      if (!key) return true;
      if (!(key in modelSkuMap)) return true;
      return !modelSkuMap[key];
    });

    candidates.sort((a, b) => {
      const am = (a.registration_month || '').replace('/', '');
      const bm = (b.registration_month || '').replace('/', '');
      return bm.localeCompare(am);
    });

    const result = candidates.map(row => ({
      product_code:       row.product_code || '',
      product_name:       row.product_name || '',
      registration_month: row.registration_month || '',
      inch:               row.inch || '',
      resolution:         row.resolution || '',
      price:              priceMap[row.product_code] || '',
    }));

    candidatesCache = result;
    candidatesCacheAt = Date.now();
    res.json(result);
  } catch (err) {
    console.error('[register/candidates]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// [4] DELETE /api/coupang/register/template  (관리자 전용)
app.delete('/api/coupang/register/template', requireAuth, requireAdmin, (req, res) => {
  const { category, name } = req.body || {};
  if (!category || !name) return res.status(400).json({ error: 'category, name 필요' });
  const filePath = path.join(getCategoryDir(category.trim()), path.basename(name));
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: '파일이 없습니다' });
  fs.unlinkSync(filePath);
  res.json({ ok: true, templates: listTemplates(category.trim()).map(f => ({ name: f.name, label: tplLabel(f.name), mtime: f.mtime })) });
});

app.listen(PORT, () => {
  console.log(`Monitor API server running on http://localhost:${PORT}`);
});
