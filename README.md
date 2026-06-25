# project01-site-structure

OCI 서버(168.110.111.1)에서 운영 중인 멀티 앱 구조. 각 앱은 React + Vite로 빌드되며 `/var/www/html` 아래에 정적 파일로 배포된다. API 서버는 `~/phs-api/server.js` (Express, PM2 `phs-api`, port 3000).

---

## 서버 접속

```
SSH: ssh -i ~/.ssh/oci_key.pem ubuntu@168.110.111.1
IP: 168.110.111.1 / 유저: ubuntu / 키: ~/.ssh/oci_key.pem
```

---

## 앱 목록 및 배포

빌드 = 배포. `npm run deploy`는 빌드 후 `/var/www/html`로 자동 복사하는 스크립트.
`npm run build`만 있는 앱은 outDir이 이미 웹루트 하위 또는 nginx alias로 직접 서빙됨.

| 앱 | 소스 경로 | 담당 URL | 빌드 명령 |
|---|---|---|---|
| main-app | `~/main-app` | `/`, `/login`, `/admin-settings/`, `/community/`, `/nrank/`, `/events/`, `/b2b-order/` | `npm run deploy` |
| product-app | `~/product-app` | `/products/` | `npm run build` |
| coupang-app | `~/coupang-app` | `/coupang/` | `npm run deploy` |
| coupang-order-app | `~/coupang-order-app` | `/coupang/order/` | `npm run deploy` |
| coupang-register-app | `~/coupang-register-app` | `/coupang/register/` | `npm run build` |

> `coupang-register-app`은 nginx alias로 `~/coupang-register-app/dist/`를 직접 서빙.

---

## main-app 구조

단일 빌드 파일(`/var/www/html/index.html`)로 여러 경로를 담당한다.
React Router 미사용. `window.location.pathname`을 직접 확인해 분기한다.

### App.jsx 라우팅 흐름

```
pathname 체크
  /community/  → CommunityPage  (authLoading 대기 없이 즉시 렌더)
  /nrank/      → NrankPage      (authLoading 대기 없이 즉시 렌더)
  /b2b-order/  → authLoading 대기 후 → B2BPage (user 없으면 /login 리다이렉트)
  /events/     → authLoading 대기 후 → EventsPage (user 없으면 /login 리다이렉트)
  authLoading  → 로딩 스피너
  /admin-settings/ → AdminSettings (admin만)
  /login       → LoginPage
  /            → Dashboard (NewProducts + CoupangCard + NaverBrandRank)
```

community, nrank는 비로그인 허용이라 `authLoading` 분기 전에 처리.
b2b-order, events는 로그인 필수이므로 `authLoading` 분기 이후에 처리.

### 내부 라우팅 표

| 경로 | 컴포넌트 | 접근 | 로그인 처리 |
|---|---|---|---|
| `/` | Dashboard (NewProducts, CoupangCard, NaverBrandRank) | 로그인 필요 | authLoading 후 처리 |
| `/login` | LoginPage | 누구나 | authLoading 후 처리 |
| `/admin-settings/` | AdminSettings | admin 전용 | authLoading 후 처리 |
| `/community/` | CommunityPage | 누구나 (비로그인 허용) | authLoading 이전에 즉시 렌더 |
| `/nrank/` | NrankPage | 누구나 (비로그인 허용) | authLoading 이전에 즉시 렌더 |
| `/events/` | EventsPage | 로그인 필요 | authLoading 대기 후, user 없으면 /login 리다이렉트 |
| `/b2b-order/` | B2BPage (CompuzoneTab, AtozTab, OrderConverter, MiracleTab) | b2b_viewer 권한 | authLoading 대기 후, user 없으면 /login 리다이렉트 |
| `/b2b-order/settings/` | SettingsEditor | b2b_editor 권한 | authLoading 대기 후 |

### 소스 파일 구조

```
~/main-app/src/
  App.jsx                       # 라우팅 진입점
  App.css                       # 전역 스타일 (dashboard + community + nrank + events + b2b 모든 CSS 포함)
  hooks/
    useAuth.js                  # JWT 인증 상태 (user, loading, login, logout, hasPermission)
    useDashboard.js             # 대시보드 데이터 (신제품, 쿠팡 현황)
    useEvents.js                # 행사 CRUD (authFetch 사용, /api/events 연동)
    useCompuzone.js             # 컴퓨존 xlsx 파싱 및 변환 훅
  components/
    authFetch.js                # 인증 헤더 자동 첨부 fetch 래퍼
    Sidebar.jsx                 # @shared/Sidebar alias로 공유 사이드바 임포트
    LoginPage.jsx / LoginPage.css
    AdminSettings.jsx
    NewProducts.jsx
    NaverBrandRank.jsx
    CommunityPage.jsx           # 게시글 수집기 (PostList, SettingsPanel 포함)
    PostList.jsx
    SettingsPanel.jsx
    NrankPage.jsx               # 네이버 검색 랭킹 (DailyTab + RealtimeTab 감싸는 컨테이너)
    DailyTab.jsx
    RealtimeTab.jsx
    EventsPage.jsx              # 행사 스케줄 (Calendar + PromoForm + PromoList + DetailPanel)
    Calendar.jsx / Calendar.css
    PromoForm.jsx / PromoForm.css
    PromoList.jsx / PromoList.css
    DetailPanel.jsx / DetailPanel.css
    B2BPage.jsx                 # B2B 발주 컨테이너 (VendorCard + 탭 구성)
    CompuzoneTab.jsx            # 컴퓨존 xlsx 업로드 → 발주서 변환
    AtozTab.jsx                 # 아토즈 CSV 변환
    OrderConverter.jsx          # 아싸컴 텍스트 변환
    MiracleTab.jsx              # 미라클 Claude AI 파싱 (SSE 스트리밍)
    SettingsEditor.jsx          # B2B 공용 설정 (창고주소 관리)
    SpreadsheetGrid.jsx         # 편집 가능한 스프레드시트 컴포넌트
  utils/
    productMatcher.js           # buildModelIndex + matchProduct (HS코드/모델명 기반 매칭)
    orderNumber.js              # 주문번호 생성 유틸
```

### authFetch

`~/main-app/src/components/authFetch.js`

`localStorage`의 `auth_token`을 읽어 `Authorization: Bearer ...` 헤더를 자동으로 첨부하는 `fetch` 래퍼.
모든 인증 필요 API 호출에 이것을 사용한다. 직접 `fetch`에 헤더를 붙이지 않는다.

```js
import { authFetch } from './authFetch';
const res = await authFetch('/api/events');
const res = await authFetch('/api/events', { method: 'POST', body: JSON.stringify(data) });
```

---

## B2B 발주 구조 (B2BPage)

`~/main-app/src/components/B2BPage.jsx`

main-app `/b2b-order/` 경로로 통합. 별도 앱 없음.

### 탭 구성

| 탭 | 컴포넌트 | 설명 |
|---|---|---|
| 컴퓨존 | CompuzoneTab | xlsx 업로드 → 발주서 엑셀 변환 |
| 아토즈 | AtozTab | CSV 붙여넣기 → 제품 매칭 → 발주서 변환 |
| 아싸컴 | OrderConverter | 텍스트 붙여넣기 → 발주서 변환 |
| 미라클 | MiracleTab | 텍스트 붙여넣기 → Claude AI 파싱 → 발주서 변환 |

### Claude AI 파싱 (미라클)

phs-api에서 `spawn('/home/ubuntu/.local/bin/claude', ['-p', prompt])` 호출.
`POST /api/claude` 엔드포인트가 SSE 스트리밍으로 응답. OAuth 인증 필요 (`~/.claude/.credentials.json`).

### 제품 매칭

`~/main-app/src/utils/productMatcher.js`

`buildModelIndex(products)` + `matchProduct(index, hsCode, modelName)`.
HS코드 우선 매칭, 없으면 모델명 퍼지 매칭. 매칭 실패 시 `unmatched` 표시.

### 설정

`/b2b-order/settings/` → `SettingsEditor.jsx` → phs-api `GET/POST /api/b2b/settings`.
창고주소(업체명, 우편번호, 주소, 연락처)를 SpreadsheetGrid로 관리.

---

## 공유 사이드바

- 소스: `~/shared/Sidebar.jsx`
- CSS: `/var/www/html/shared/sidebar.css` (런타임 로드, 빌드 불필요)
- 각 앱 `vite.config.js`에서 `@shared` alias → `~/shared/`로 설정
- **Sidebar.jsx 수정 시 모든 앱을 재빌드해야 한다**
- 데스크탑: transition 없음. 모바일(≤900px): `transform: translateX(-100%)` + `transition: transform 0.25s ease` 드로어 슬라이드

### 사이드바 네비게이션 구조

```
[메인]
  대시보드 (/)

[가격비교]
  모니터 (/monitor.html)
  네이버 검색 랭킹 (/nrank/)

[커뮤니티]
  게시글 수집 (/community/)

[쿠팡]   ← coupang_viewer / order_viewer 권한 보유 시만 표시
  가격 수집 (/coupang/)
  재매칭요청 (/coupang/#rematch)
  발주서 변환 (/coupang/order/)
  신제품 등록 (/coupang/register/)

[B2B 발주]  ← b2b_viewer 권한 보유 시만 표시
  컴퓨존 (/b2b-order/#compuzone)
  아토즈 (/b2b-order/#atoz)
  아싸컴 (/b2b-order/#assacom)
  미라클 (/b2b-order/#miracle)

[행사 스케줄]  ← 로그인 시만 표시
  캘린더 (/events/)

[제품 관리]  ← 로그인 시만 표시
  제품 정보 (/products/)
```

푸터: 로그인 상태면 유저명 + 역할 뱃지 + 로그아웃 버튼 + (admin이면 설정 버튼). 비로그인이면 로그인 버튼.

---

## 권한 시스템

JWT 기반. `~/auth/users.json`에 유저 정보 저장.
`phs-api`가 로그인 처리 및 JWT 발급. 토큰 만료 7일.

### 권한 종류

| 권한 | 설명 |
|---|---|
| `coupang_viewer` | 쿠팡 수집기 조회 |
| `coupang_editor` | 쿠팡 수집기 편집 (viewer 포함) |
| `order_viewer` | 발주서 변환기 조회 |
| `order_editor` | 발주서 변환기 편집 (viewer 포함) |
| `b2b_viewer` | B2B 발주 조회 |
| `b2b_editor` | B2B 발주 편집 (viewer 포함) |
| `product_viewer` | 제품 정보 조회 |
| `product_editor` | 제품 정보 편집 (viewer 포함) |

`role: admin`은 모든 권한 자동 보유. `editor`는 `viewer` 권한을 포함한다.

### 새 권한 추가 시

1. `~/shared/Sidebar.jsx`의 `PERM_NAV` 배열에 항목 추가
2. `~/auth/users.json`의 해당 유저 `permissions` 배열에 추가
3. `phs-api/server.js`의 `ALL_PERMISSIONS`에 추가
4. 모든 앱 재빌드

### useAuth 훅

```js
const { user, loading, login, logout, hasPermission } = useAuth();
// user: null (비로그인) 또는 { id, username, role, permissions }
// hasPermission('coupang_viewer') → boolean
```

---

## API 서버 (phs-api)

- 경로: `~/phs-api/server.js`
- PM2 이름: `phs-api` / 포트: 3000
- nginx에서 `/api/` → `proxy_pass http://localhost:3000` (단, `/api/coupang/` → port 3001은 coupang-collector)
- 수정 후 `pm2 restart phs-api` 필요

### 주요 엔드포인트

```
[인증]
POST /api/auth/login              # 로그인, JWT 발급
POST /api/auth/logout             # 로그아웃 (토큰 블랙리스트)
GET  /api/auth/me                 # 내 정보
GET  /api/auth/users              # 유저 목록 (admin)
POST /api/auth/users              # 유저 생성 (admin)
PUT  /api/auth/users/:id/permissions  # 권한 수정 (admin)
DELETE /api/auth/users/:id        # 유저 삭제 (admin)

[대시보드]
GET /api/monitor/compare          # 가격 비교 데이터
GET /api/monitor/newproducts      # 신제품 목록
GET /api/monitor/pricechanges     # 가격 변동

[네이버 검색 랭킹]
GET  /api/nrank/categories        # 카테고리 목록
GET  /api/nrank/brand             # 브랜드 랭킹 (일별)
GET  /api/nrank/best              # 베스트 상품
POST /api/nrank/realtime          # 실시간 랭킹

[행사 스케줄]
GET    /api/events                # 전체 행사 목록 (인증 필요)
POST   /api/events                # 행사 등록 (인증 필요)
DELETE /api/events/:id            # 행사 삭제 (인증 필요)

[제품]
GET  /api/products                # 제품 목록 (product_viewer)
POST /api/products                # 제품 등록 (product_editor)
GET  /api/products/feed           # 외부 연동용 피드 (API Key 인증)

[B2B 발주]
POST /api/claude                  # Claude AI 파싱 (SSE 스트리밍, 미라클 탭용)
POST /api/compuzone/xls           # 컴퓨존 발주서 엑셀 다운로드
POST /api/miracle/download        # 미라클 발주서 다운로드
POST /api/atoz/download           # 아토즈 발주서 다운로드
POST /api/assacom/download        # 아싸컴 발주서 다운로드
GET  /api/b2b/settings            # B2B 공용 설정 조회
POST /api/b2b/settings            # B2B 공용 설정 저장

[쿠팡 등록]
GET  /api/coupang/register/settings    # 등록 설정
POST /api/coupang/register/settings
GET  /api/coupang/register/categories # 카테고리
GET  /api/coupang/register/templates  # 템플릿 목록
POST /api/coupang/register/preview    # 미리보기
POST /api/coupang/register/download   # 등록 엑셀 다운로드
POST /api/coupang/register/template   # 템플릿 업로드 (admin)
DELETE /api/coupang/register/template # 템플릿 삭제 (admin)
GET  /api/coupang/register/candidates # 등록 후보 상품
```

---

## PM2 프로세스

| 이름 | 포트 | 경로 | 설명 |
|---|---|---|---|
| `phs-api` | 3000 | `~/phs-api/server.js` | 메인 API 서버 |
| `coupang-collector` | 3001 | `~/coupang-collector/server.js` | 쿠팡 가격 수집기 |

정적 파일 배포(빌드) 후에는 PM2 재시작 불필요. `phs-api/server.js` 수정 시에만 `pm2 restart phs-api`.

---

## nginx 라우팅 구조

`/etc/nginx/sites-enabled/default`

```
/community/        → try_files ... /index.html          (main-app)
/nrank/            → try_files ... /index.html          (main-app)
/events/           → try_files ... /index.html          (main-app)
/b2b-order/        → try_files ... /index.html          (main-app)
/admin-settings/   → try_files ... /index.html          (main-app)
/login             → try_files /index.html              (main-app)
/coupang/          → try_files ... /coupang/index.html
/coupang/order/    → try_files ... /coupang/order/index.html
/coupang/register/ → alias ~/coupang-register-app/dist/
/products/         → try_files ... /products/index.html
/api/coupang/      → proxy_pass http://localhost:3001   (coupang-collector)
/api/              → proxy_pass http://localhost:3000   (phs-api)
/                  → try_files $uri $uri/ =404
```

주의: `/community/`, `/nrank/`, `/events/`, `/b2b-order/`, `/admin-settings/`는 모두 `/index.html`(main-app)로 폴백. 해당 경로 아래에 구 빌드 디렉토리가 남아있으면 nginx가 먼저 서빙하여 main-app 폴백이 작동하지 않는다.

---

## 주요 데이터 파일

| 파일 | 내용 |
|---|---|
| `~/product-data/products.json` | 전체 제품 목록 (모델명, 판매가, 각 채널 코드) |
| `~/event-data/events.json` | 행사 스케줄 데이터 |
| `~/auth/users.json` | 유저 계정 (bcrypt 해시 저장) |

---

## product-app 구조

단일 `ProductSheet.jsx` 컴포넌트. `activeTab` prop으로 탭 전환.

| 탭 | 표시 컬럼 |
|---|---|
| 마켓코드 | 모델명, 판매가, 카탈로그, SKU ID(쿠팡), 네이버, 지마켓, 지마켓any, 옥션, 옥션any, 11번가, 하이마트, 롯데온, SSG, 오늘의집, 카카오, 컴퓨존, 알리, 쿠팡아이템ID |
| B2B단가표 | 모델명, 판매가, HS코드, 아토즈단가, 아싸컴단가, 미라클단가 |

---

## 행사 스케줄 구조 (EventsPage)

`~/main-app/src/components/EventsPage.jsx`

- Calendar: 월별 캘린더. 날짜에 행사 표시, 클릭으로 선택
- PromoForm: 행사 일괄 등록. 모델코드+할인율+행사가+메모를 탭으로 붙여넣기, 제품 DB와 매칭해 미리보기 후 등록
- PromoList: 등록된 행사 목록
- DetailPanel: 선택된 행사 상세 (슬라이드 패널). phs-api `enrichEvents()`가 서버사이드에서 products 데이터와 조인해 채널별 상품코드를 주입함

---

## 네이버 검색 랭킹 구조 (NrankPage)

`~/main-app/src/components/NrankPage.jsx`

- 카테고리 버튼으로 조회 대상 전환 (`/api/nrank/categories`에서 목록 로드)
- DailyTab: 일별 랭킹 테이블 + 브랜드 순위 카드
- RealtimeTab: 실시간 랭킹
- 랭킹 데이터는 GitHub `younine/naver-ranking` 레포의 CSV 파일. 설정값은 `phs-api/server.js`에 있음

---

## GitHub 인증

- 토큰: 맥미니 `~/.zshrc`의 `$GITHUB_TOKEN` 환경변수
- API 호출 시 `Authorization: Bearer $GITHUB_TOKEN` 헤더 사용
- 파일 복원: `wget -q -O [대상] 'https://raw.githubusercontent.com/younine/project01-site-structure/main/[경로]'`
