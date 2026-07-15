# Backpackr 영업 CRM

의존성 없이 Node.js만으로 동작하는 경량 영업용 CRM 툴입니다.

## 주요 기능

- **대시보드** — 진행 중 파이프라인 총액, 이번 달 성사 금액, 단계별 현황, 다가오는 마감 딜, 최근 활동
- **파이프라인 (칸반)** — 리드 → 컨택 → 제안 → 협상 → 성사/실패, 드래그 & 드롭으로 단계 이동
- **딜 관리** — 금액, 예상 마감일, 담당자, 검색/단계 필터
- **고객사 / 연락처 관리** — 검색, 딜·연락처 연결
- **활동 기록** — 통화 / 미팅 / 이메일 / 메모 타임라인

## 실행 방법

Node.js 22 이상이 필요합니다. (`node:sqlite` 내장 모듈 사용 — `npm install` 불필요)

```bash
# 샘플 데이터 넣기 (선택)
npm run seed

# 서버 실행
npm start
# → http://localhost:3000
```

개발 중에는 파일 변경 시 자동 재시작:

```bash
npm run dev
```

## 구조

```
server.js        # HTTP 서버 + REST API (내장 http 모듈)
lib/db.js        # SQLite 스키마 (내장 node:sqlite)
lib/seed.js      # 데모 데이터 시드
public/          # SPA 프론트엔드 (바닐라 JS, 빌드 불필요)
data/crm.db      # SQLite DB 파일 (자동 생성, git 제외)
```

## API 요약

| 메서드 | 경로 | 설명 |
|---|---|---|
| GET | `/api/dashboard` | 대시보드 통계 |
| GET/POST | `/api/companies` | 고객사 목록(`?q=`) / 생성 |
| GET/PUT/DELETE | `/api/companies/:id` | 고객사 조회 / 수정 / 삭제 |
| GET/POST | `/api/contacts` | 연락처 목록(`?q=`, `?company_id=`) / 생성 |
| GET/PUT/DELETE | `/api/contacts/:id` | 연락처 조회 / 수정 / 삭제 |
| GET/POST | `/api/deals` | 딜 목록(`?q=`, `?stage=`) / 생성 |
| GET/PUT/PATCH/DELETE | `/api/deals/:id` | 딜 조회 / 수정(단계 이동 포함) / 삭제 |
| GET/POST | `/api/activities` | 활동 목록(`?deal_id=`, `?company_id=`) / 기록 |
| DELETE | `/api/activities/:id` | 활동 삭제 |

딜 단계 값: `lead`, `contacted`, `proposal`, `negotiation`, `won`, `lost`
활동 유형 값: `call`, `meeting`, `email`, `note`
