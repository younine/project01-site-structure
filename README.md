# PROJECT_01 사이트 구조

Claude Design 참고용 레포지토리입니다.

## 전체 구조

```
/                        → 메인 대시보드 (main-app)
/coupang/                → 쿠팡 가격 수집기 (coupang-app)
/coupang/order/          → 쿠팡 발주서 변환 (coupang-order-app)
/coupang/register/       → 쿠팡 신제품 등록 (coupang-register-app)
/nrank/                  → 네이버 브랜드 랭킹 (nrank-app)
/events/                 → 행사 스케줄 캘린더 (event-app)
/products/               → 제품 정보 관리 (product-app)
/keyboard/               → 키보드 가격비교 (keyboard-app)
/b2b-order/              → B2B 발주 관리 (b2b-order-app)
```

## 디자인 시스템

### 색상 (CSS 변수)

```css
--bg: #f4f5f7;           /* 페이지 배경 */
--surface: #fff;          /* 카드/패널 배경 */
--surface2: #f8f9fa;      /* 보조 배경 */
--border: rgba(0,0,0,0.07);
--text: #1a1d23;          /* 기본 텍스트 */
--text2: #5a6072;         /* 보조 텍스트 */
--text3: #9399a8;         /* 흐린 텍스트 */
--accent: #2563eb;        /* 주요 강조색 (파란색) */
--success: #16a34a;
--warning: #d97706;
--danger: #dc2626;
--info: #0891b2;
--sidebar-w: 220px;
```

### 폰트
- Pretendard (Google Fonts)
- 기본 폰트 크기: 13px

### 레이아웃 패턴

모든 앱이 동일한 레이아웃 구조를 공유합니다:

```
┌─────────────────────────────────────────┐
│  Sidebar (220px 고정)  │  TopBar         │
│                        ├─────────────────│
│  - 로고: PROJECT_01    │  Content Area   │
│  - 네비게이션 메뉴     │                 │
│  - 사용자 정보/로그아웃│                 │
└─────────────────────────────────────────┘
```

- 사이드바: 좌측 고정, 220px
- TopBar: 상단 고정 헤더
- Content: 나머지 영역

### 공통 컴포넌트

- `shared/Sidebar.jsx` - 모든 앱이 공유하는 사이드바
- `shared/useAuth.js` - JWT 기반 인증 훅

## 앱별 상세

### main-app (메인 대시보드)
- 쿠팡 수집 현황 카드
- 신제품 목록
- 네이버 브랜드 랭킹 요약

### coupang-app (쿠팡 가격 수집기)
- 탭 구성: 수집기 설정 / 진행 현황 / 결과 / 재매칭
- 실시간 수집 진행률 표시
- 수집 결과 테이블

### coupang-order-app (발주서 변환)
- 엑셀 파일 업로드
- HS코드 패널
- 미리보기 테이블

### coupang-register-app (신제품 등록)
- 카테고리 탭
- 등록 후보 목록
- 등록 패널

### nrank-app (네이버 브랜드 랭킹)
- 탭: 실시간 / 일별
- 브랜드 랭킹 테이블

### event-app (행사 스케줄)
- 월별 캘린더 뷰
- 행사/프로모션 목록
- 행사 상세 패널
- 행사 등록/수정 폼

### product-app (제품 정보)
- API 키 관리 패널
- 제품 스프레드시트

### keyboard-app (키보드 가격비교)
- 필터 탭
- 신제품 목록
- 결과 테이블

### b2b-order-app (B2B 발주)
- 탭: 컴퓨존 / 아토즈 / 아싸컴 / 미라클
- 스프레드시트 그리드
- 설정 에디터

## 기술 스택

- React 18 + Vite
- CSS Variables (디자인 토큰)
- JWT 인증 (monitor-api)
- PM2 (백엔드 프로세스 관리)
- Nginx (정적 파일 서빙)
