# project01-site-structure

OCI 서버(168.110.111.1)에서 운영 중인 멀티 앱 구조.

## 앱 목록

| 앱 | 소스 경로 | 담당 URL | 빌드 명령 |
|---|---|---|---|
| main-app | ~/main-app | /, /login, /admin-settings/, /community/, /nrank/, /events/ | npm run deploy |
| product-app | ~/product-app | /products/ | npm run build |
| coupang-app | ~/coupang-app | /coupang/ | npm run deploy |
| coupang-order-app | ~/coupang-order-app | /coupang/order/ | npm run deploy |
| b2b-order-app | ~/b2b-order-app | /b2b-order/ | npm run deploy |
| keyboard-app | ~/keyboard-app | /keyboard/ | npm run deploy |
| coupang-register-app | ~/coupang-register-app | /coupang/register/ | npm run build |

## main-app 내부 라우팅

단일 빌드(/var/www/html/index.html)로 여러 경로를 담당한다.

| 경로 | 컴포넌트 | 접근 |
|---|---|---|
| / | 대시보드 (NewProducts, CoupangCard, NaverBrandRank) | 로그인 필요 |
| /login | LoginPage | 누구나 |
| /admin-settings/ | AdminSettings | admin 전용 |
| /community/ | CommunityPage | 누구나 (비로그인 허용) |
| /nrank/ | NrankPage (DailyTab, RealtimeTab) | 누구나 (비로그인 허용) |
| /events/ | EventsPage (Calendar, PromoForm, PromoList, DetailPanel) | 로그인 필요 |

nginx에서 각 경로를 try_files로 main-app에 폴백.

## 공유 컴포넌트

- ~/shared/Sidebar.jsx : 모든 앱에서 @shared/Sidebar로 import
- /var/www/html/shared/sidebar.css : 런타임 로드 (빌드 불필요)
- Sidebar.jsx 수정 시 모든 앱 재빌드 필요

## 서버 구성

- API 서버: ~/monitor-api/server.js (PM2 monitor-api, port 3000)
- 웹 루트: /var/www/html
- 정적 파일이므로 빌드 후 PM2 재시작 불필요 (monitor-api 수정 시만 재시작)
