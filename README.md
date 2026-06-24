# PROJECT_01 — 사이트 전체 구조

사내 운영 도구 모음. React + Vite 기반 멀티 앱 구조로, Nginx가 URL 경로별로 각 앱을 서빙한다.

---

## 전체 URL 구조

| URL 경로 | 앱 디렉토리 | 설명 | 권한 |
|---|---|---|---|
| `/` | `main-app` | 메인 대시보드 | 로그인 필요 |
| `/community/` | `main-app` | 커뮤니티 게시글 수집 | 누구나 |
| `/login` | `main-app` | 로그인 페이지 | 누구나 |
| `/admin-settings/` | `main-app` | 관리자 설정 | admin 전용 |
| `/monitor.html` | 정적 파일 | 가격 모니터 (별도 HTML) | 누구나 |
| `/keyboard/` | `keyboard-app` | 키보드 가격비교 | 누구나 |
| `/nrank/` | `nrank-app` | 네이버 브랜드 랭킹 | 누구나 |
| `/coupang/` | `coupang-app` | 쿠팡 가격 수집기 | `coupang_viewer` |
| `/coupang/order/` | `coupang-order-app` | 쿠팡 발주서 변환 | `order_viewer` |
| `/coupang/register/` | `coupang-register-app` | 쿠팡 신제품 등록 | `coupang_viewer` |
| `/events/` | `event-app` | 행사 스케줄 캘린더 | 로그인 필요 |
| `/products/` | `product-app` | 제품 정보 관리 | `product_viewer` |
| `/b2b-order/` | `b2b-order-app` | B2B 발주 관리 | `b2b_viewer` |

---

## 공통 레이아웃 패턴

모든 앱이 **동일한 레이아웃 구조**를 사용한다.

```
┌──────────────────────────────────────────────────────────┐
│ [SIDEBAR 220px 고정]     [TOPBAR sticky top]             │
│  ┌──────────────┐        ┌────────────────────────────┐  │
│  │ PROJECT_01   │        │ ☰ 페이지제목   [우측 버튼들]│  │
│  │ ──────────── │        └────────────────────────────┘  │
│  │ 메인         │                                         │
│  │  ⊞ 대시보드  │        [CONTENT AREA]                  │
│  │ 가격비교     │         앱마다 다른 컨텐츠              │
│  │  🖥 모니터   │                                         │
│  │  ⌨ 키보드   │                                         │
│  │  🔍 랭킹    │                                         │
│  │ 쿠팡         │                                         │
│  │  🛒 가격수집 │                                         │
│  │  ↺ 재매칭   │                                         │
│  │  📋 발주변환 │                                         │
│  │  📝 신제품  │                                         │
│  │ B2B 발주     │                                         │
│  │  컴퓨존      │                                         │
│  │  아토즈      │                                         │
│  │  아싸컴      │                                         │
│  │  미라클      │                                         │
│  │ 행사스케줄   │                                         │
│  │  📅 캘린더  │                                         │
│  │ 제품 관리    │                                         │
│  │  📦 제품정보 │                                         │
│  │ ──────────── │                                         │
│  │ [역할] 유저명│                                         │
│  │ [로그아웃]   │                                         │
│  └──────────────┘                                         │
└──────────────────────────────────────────────────────────┘
```

### 레이아웃 핵심 CSS 클래스 (`shared/sidebar.css`)

```
.app-shell        → 전체 래퍼 (padding: 16px)
.sidebar          → 좌측 고정 패널 (width: 220px, border-radius: 20px, 카드형)
.main             → 사이드바 오른쪽 영역 (margin-left: 236px)
.topbar           → 상단 헤더 (height: 52px, sticky, border-radius: 14px, 카드형)
.content          → 실제 콘텐츠 영역
```

**모바일 (max-width: 900px):** 사이드바가 드로어(drawer)로 전환되고, 햄버거 버튼(☰)으로 토글.

---

## 디자인 시스템

### CSS 변수 (모든 앱 공통)

```css
/* 배경/서피스 */
--bg: #f4f5f7;           /* 페이지 배경 (연한 회색) */
--surface: #fff;          /* 카드/패널 배경 */
--surface2: #f8f9fa;      /* 보조 배경 */

/* 테두리 */
--border: rgba(0,0,0,0.07);
--border2: rgba(0,0,0,0.13);

/* 텍스트 */
--text: #1a1d23;          /* 기본 텍스트 (거의 검정) */
--text2: #5a6072;         /* 보조 텍스트 (중간 회색) */
--text3: #9399a8;         /* 흐린 텍스트 (밝은 회색) */

/* 강조색 */
--accent: #2563eb;        /* 파란색 - 주요 버튼, 활성 메뉴 */
--accent-dim: #eff6ff;    /* 파란색 연한 배경 */

/* 상태색 */
--success: #16a34a;       --success-dim: #f0fdf4;
--warning: #d97706;       --warning-dim: #fffbeb;
--danger: #dc2626;        --danger-dim: #fef2f2;
--info: #0891b2;          --info-dim: #ecfeff;

/* 레이아웃 */
--sidebar-w: 220px;
```

### 폰트
- **Pretendard** (Google Fonts) — 기본 폰트
- 기본 크기: `13px`
- 사이드바 섹션 제목: `uppercase`, `letter-spacing: 0.5px`

### 카드/패널 스타일
- 배경: `var(--surface)` / 테두리: `1px solid var(--border)` / 라운드: `14px~20px`
- 사이드바: `border-radius: 20px`
- TopBar: `border-radius: 14px`

---

## 앱별 상세 구조

### 1. main-app — 메인 대시보드 (`/`)

```
App
├── TopBar (인라인 컴포넌트)
│   ├── 햄버거 버튼 (모바일)
│   ├── "대시보드" 제목
│   ├── 최종 갱신 시간
│   ├── "● 정상" 상태 배지
│   └── 새로고침 버튼
├── Sidebar (@shared/Sidebar.jsx)
└── Content
    ├── NewProducts       → 최근 등록된 신제품 목록 테이블
    ├── CoupangCard       → 쿠팡 수집 현황 (수집완료/품절/재매칭요청 수)
    └── NaverBrandRank    → 네이버 브랜드 랭킹 요약
```

**특수 라우트:**
- `/login` → `LoginPage` (아이디/비밀번호 입력 폼)
- `/admin-settings/` → `AdminSettings` (사용자 관리 패널, admin 전용)
- `/community/` → `CommunityPage` (커뮤니티 게시글 수집 — 별도 앱 없이 main-app이 경로 감지 후 렌더링, 비로그인 접근 허용)
  - 소스: `src/components/CommunityPage.jsx`, `PostList.jsx`, `SettingsPanel.jsx`, `authFetch.js`
  - nginx `/community/` 블록이 `/index.html`(main-app)으로 폴백

---

### 2. coupang-app — 쿠팡 가격 수집기 (`/coupang/`)

```
App
├── TopBar
│   ├── 탭 버튼: [수집기] [재매칭요청 N건]
│   ├── 수집 시작/중지 버튼
│   └── 설정 버튼
├── Sidebar
└── Content (탭별 전환)
    ├── [수집기 탭]
    │   ├── CollectSettings   → 수집 URL 목록, 설정 관리
    │   ├── ProgressPanel     → 실시간 수집 진행률 바 + 로그
    │   └── ResultPanel
    │       ├── FilterTabs    → [전체 / 저가경고 / 품절] 필터
    │       ├── SearchBar     → 검색
    │       └── ResultTable   → 수집 결과 테이블 (모델명/쿠팡가/공급가/상태)
    └── [재매칭 탭]
        └── RematchTab        → 재매칭 요청 목록 + MappingSheet
```

**MappingSheet:** 모달 형태. 쿠팡 상품을 자사 SKU에 매핑.

---

### 3. coupang-order-app — 쿠팡 발주서 변환 (`/coupang/order/`)

```
App
├── TopBar ("📋 발주서 변환")
├── Sidebar
└── Content (3열 레이아웃)
    ├── UploadSection   → 엑셀(.xlsx) 파일 드래그&드롭 업로드
    ├── HsPanel         → HS코드 관리 (조회/추가/삭제)
    ├── PreviewTable    → 변환 미리보기 테이블
    └── LogPanel        → 처리 로그
```

---

### 4. coupang-register-app — 쿠팡 신제품 등록 (`/coupang/register/`)

```
App
├── TopBar ("📝 쿠팡 신제품 등록")
├── Sidebar
└── Content (2열 레이아웃)
    ├── CategoryTab     → 카테고리 선택 탭
    ├── CandidateList   → 등록 후보 제품 목록
    └── RegisterPanel   → 선택 제품 상세 + 등록 실행
```

---

### 5. nrank-app — 네이버 브랜드 랭킹 (`/nrank/`)

```
App
├── TopBar
│   ├── "네이버 검색 랭킹" 제목
│   └── 카테고리 선택 버튼들 (여러 카테고리 있을 때)
├── Sidebar
└── Content
    ├── 탭 버튼: [일일 브랜드 순위] [실시간 조회]
    ├── DailyTab      → 날짜별 브랜드 순위 테이블 (우리 브랜드 강조)
    └── RealtimeTab   → 키워드 입력 → 실시간 순위 조회
```

---

### 6. event-app — 행사 스케줄 (`/events/`)

```
App
├── TopBar ("📅 행사 스케줄 관리")
├── Sidebar
└── Content (2열 레이아웃)
    ├── [좌측 col-left]
    │   └── Calendar      → 월별 캘린더. 날짜에 행사 도트 표시. 클릭하면 상세.
    └── [우측 col-right]
        ├── PromoForm     → 새 행사 등록 폼
        └── PromoList     → 행사 목록 (선택하면 DetailPanel 오픈)
            └── DetailPanel → 행사 상세 정보 패널
```

---

### 7. product-app — 제품 관리 (`/products/`)

```
App
├── TopBar
│   ├── "📦 제품 관리" 제목
│   └── [🔑 API 버튼] (admin 전용)
├── Sidebar
└── Content
    └── ProductSpreadsheet  → 구글 스프레드시트 형태의 제품 정보 테이블
        (행: 제품, 열: 각종 스펙/가격 정보)

모달:
└── ApiKeyPanel   → 외부 API 키 관리 (admin 전용, 우측 슬라이드 패널)
```

---

### 8. keyboard-app — 키보드 가격비교 (`/keyboard/`)

```
App
├── TopBar
│   ├── "⌨ 키보드 가격 비교" 제목
│   ├── 요약 통계 (자사 N개 / 경쟁사 N개 / 저가 N건)
│   └── 새로고침 버튼
├── Sidebar
└── Content
    ├── 요약 카드 4개: [자사보다 저가] [신규 경쟁사 제품] [자사 모델수] [경쟁사 모델수]
    ├── FilterTabs      → 필터 탭 (전체 / 저가경고 등)
    ├── ResultTable     → 가격비교 테이블
    └── NewProducts     → 신규 등록 제품 목록
```

---

### 9. b2b-order-app — B2B 발주 관리 (`/b2b-order/`)

```
App
├── TopBar ("B2B 발주 관리")
├── Sidebar (activeHash 기반으로 스크롤 위치에 따라 메뉴 활성화)
└── Content (단일 스크롤 페이지, 4개 섹션)
    ├── #compuzone → VendorCard
    │   └── CompuzoneTab   → 엑셀 업로드 → 발주서 변환 → 다운로드
    ├── #atoz      → VendorCard
    │   └── AtozTab        → 구글 시트 연동, 발주 데이터 조회/다운로드
    ├── #assacom   → VendorCard
    │   └── (OrderConverter 활용)
    └── #miracle   → VendorCard
        └── MiracleTab     → 발주 데이터 처리

특수 라우트:
└── /b2b-order/settings/ → SettingsEditor (거래처별 매핑 설정)
```

**스크롤 연동:** IntersectionObserver로 뷰포트에 보이는 섹션을 감지해 사이드바 메뉴 자동 활성화.

---

## 인증/권한 시스템

### 권한 목록

| 권한 | 접근 가능 앱 |
|---|---|
| (없음 / 비로그인) | `/`, `/keyboard/`, `/nrank/`, `/monitor.html` |
| 로그인 (공통) | 위 + `/events/` |
| `coupang_viewer` | `/coupang/`, `/coupang/register/` |
| `coupang_editor` | coupang_viewer 포함 + 수정 기능 |
| `order_viewer` | `/coupang/order/` |
| `order_editor` | order_viewer 포함 + 수정 기능 |
| `b2b_viewer` | `/b2b-order/` |
| `b2b_editor` | b2b_viewer 포함 + 수정 기능 |
| `product_viewer` | `/products/` |
| `product_editor` | product_viewer 포함 + 수정 기능 |
| `admin` | 모든 권한 + 사용자 관리 |

### 인증 흐름

1. `POST /api/auth/login` → JWT 토큰 발급
2. 토큰을 `localStorage`에 저장
3. 각 앱의 `useAuth` 훅이 `GET /api/auth/me`로 현재 사용자 확인
4. 권한 없으면 → `/login?redirect=현재경로` 로 리다이렉트
5. 로그인 후 → 원래 경로로 복귀

---

## 공통 컴포넌트

### `shared/Sidebar.jsx`
모든 앱이 import해서 사용하는 사이드바 컴포넌트.

**Props:**
```js
user           // 현재 로그인 사용자 객체 (null이면 로그인 버튼 표시)
hasPermission  // (perm) => boolean 함수
onLogout       // 로그아웃 핸들러
isOpen         // 모바일 드로어 열림 상태
onClose        // 드로어 닫기 핸들러
coupangCount   // 사이드바 쿠팡 배지 숫자
activeHash     // 현재 활성 해시 (b2b-order-app에서 스크롤 연동용)
```

**네비게이션 구성 로직:**
- `BASE_NAV` — 항상 표시 (대시보드, 모니터, 키보드, 랭킹)
- `PERM_NAV` — 권한 있을 때만 표시 (쿠팡, B2B 발주)
- `EVENT_NAV` — 로그인 시 표시 (행사 스케줄)
- `PRODUCT_NAV` — 로그인 시 표시 (제품 관리)

### `shared/useAuth.js`
JWT 인증 훅. 모든 앱에서 공통 사용.

```js
const { user, loading, login, logout, hasPermission } = useAuth();
```

---

## API 서버 (monitor-api, port 3000)

모든 앱이 동일한 백엔드를 사용한다.

### 인증 API
```
POST /api/auth/login              → 로그인, JWT 발급
POST /api/auth/logout             → 로그아웃 (토큰 블랙리스트)
GET  /api/auth/me                 → 현재 사용자 정보
GET  /api/auth/users              → 사용자 목록 (admin)
POST /api/auth/users              → 사용자 추가 (admin)
PUT  /api/auth/users/:id/permissions → 권한 수정 (admin)
DELETE /api/auth/users/:id        → 사용자 삭제 (admin)
```

### 대시보드 / 모니터
```
GET /api/monitor/compare          → 가격비교 데이터
GET /api/monitor/newproducts      → 신제품 목록
GET /api/monitor/pricechanges     → 가격변동 내역
```

### 쿠팡 수집기
```
POST /api/claude                  → 쿠팡 수집 실행 (SSE 스트리밍)
```

### 발주서
```
GET  /api/order/hs-codes          → HS코드 목록
POST /api/order/hs-codes          → HS코드 추가
POST /api/order/xls               → 엑셀 발주서 변환
```

### B2B
```
GET  /api/b2b/settings            → B2B 설정 조회
POST /api/b2b/settings            → B2B 설정 저장
GET  /api/b2b/atoz/sheet-cache    → 아토즈 시트 캐시
POST /api/b2b/parse               → 발주 파일 파싱
POST /api/order/miracle/download  → 미라클 다운로드
POST /api/order/atoz/download     → 아토즈 다운로드
POST /api/order/assacom/download  → 아싸컴 다운로드
POST /api/compuzone/xls           → 컴퓨존 엑셀 처리
```

### 네이버 랭킹
```
GET  /api/nrank/categories        → 카테고리 목록
GET  /api/nrank/brand             → 브랜드 랭킹 (일별)
GET  /api/nrank/best              → 베스트 랭킹
POST /api/nrank/realtime          → 실시간 순위 조회
```

### 키보드
```
GET /api/keyboard/compare         → 키보드 가격비교 데이터
GET /api/keyboard/new             → 신규 키보드 목록
```

### 제품 관리
```
GET  /api/products                → 제품 목록
POST /api/products                → 제품 추가/수정
GET  /api/products/feed-info      → 피드 정보 (admin)
GET  /api/products/feed           → 제품 피드 (API 키 인증)
```

### 행사 스케줄
```
GET    /api/events                → 행사 목록
POST   /api/events                → 행사 추가
DELETE /api/events/:id            → 행사 삭제
```

### 쿠팡 신제품 등록
```
GET  /api/coupang/register/settings    → 등록 설정
POST /api/coupang/register/settings    → 등록 설정 저장
GET  /api/coupang/register/categories  → 카테고리 목록
GET  /api/coupang/register/templates   → 등록 템플릿 목록
POST /api/coupang/register/preview     → 미리보기 생성
POST /api/coupang/register/download    → 등록 파일 다운로드
POST /api/coupang/register/template    → 템플릿 업로드 (admin)
GET  /api/coupang/register/candidates  → 등록 후보 목록
DELETE /api/coupang/register/template  → 템플릿 삭제 (admin)
```

---

## 기술 스택

| 항목 | 내용 |
|---|---|
| 프론트엔드 | React 18 + Vite |
| 스타일링 | CSS Variables + 컴포넌트별 CSS 파일 |
| 인증 | JWT (jsonwebtoken + bcryptjs) |
| 백엔드 | Node.js + Express (port 3000) |
| 프로세스 관리 | PM2 |
| 웹서버 | Nginx (정적 파일 서빙 + API 프록시) |
| 공유 컴포넌트 | `@shared` alias → `/home/ubuntu/shared/` |

### 빌드/배포 구조
각 앱은 독립적으로 빌드되며, Nginx가 URL 경로별로 각 앱의 `dist` 폴더를 서빙한다.

```
vite build → /var/www/html/{경로}/
```

예시 (`vite.config.js`):
```js
base: '/coupang/',
build: { outDir: '/var/www/html/coupang', emptyOutDir: false }
resolve: { alias: { '@shared': '/home/ubuntu/shared' } }
```
