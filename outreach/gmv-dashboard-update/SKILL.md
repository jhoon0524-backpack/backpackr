---
name: gmv-dashboard-update
description: |
  텀블벅 GMV 지표트리 HTML 대시보드를 새 데이터 시트로 업데이트한다.
  사용자가 새 데이터 파일(Excel/CSV/표)을 제공하면 SDATA·MDATA·PDATA 상수를
  교체해 동일한 대시보드 형태를 유지한 채 최신 숫자로 갱신한다.
  
  다음 상황에서 반드시 사용:
  - "데이터 업데이트해줘", "새 시트 줄게", "숫자 바꿔줘" 등 대시보드 수치 갱신 요청
  - 텀블벅_GMV_지표트리.html 파일과 데이터 파일을 함께 제공할 때
  - 특정 섹션(게임/리빙/만화 등)이나 지표(GMV/후원자수 등)의 수치를 수정할 때
---

# 텀블벅 GMV 지표트리 대시보드 업데이트

## 파일 위치

```
C:\Users\신장훈\Documents\claude\전략\텀블벅_GMV_지표트리.html
```

파일 크기 약 100KB. JS 데이터 상수는 파일 상단 `<script>` 블록에 있다.

---

## 대시보드 구조 한눈에 보기

```
HTML 파일
├── <style>  CSS (라이트 테마)
├── <body>   헤더(탭/기간 선택) + 노드 캔버스
└── <script>
    ├── SDATA   ← 섹션별 지표 집계 (H1 누적)
    ├── MDATA   ← 월별 주요 지표 (신규/기존 후원자, GMV)
    ├── PDATA   ← 스파크라인용 다년도 월별 데이터
    ├── PB      ← 기간 선택 상태 {base, comp, months}
    └── 렌더링 함수들
```

노드 레이아웃 상수: `const NW=200,NH=118,PX=32,PY=24,GX=50,GY=24`  
스파크라인 노드: `SPARK_IDS = Set(['gmv','lp','bc','apv'])`

---

## 데이터 상수 스키마

### 1. SDATA — 섹션별 집계

섹션별 × 지표별 집계값. 기간 선택 버튼으로 연도를 바꿔도 이 데이터는 고정 H1 기준이다.

```js
const SDATA = {
  "전체": {
    "GMV":          { v26:"195.3억", v25:"237.1억", yoy:-17.6, ic:"dn" },
    "성사프로젝트": { v26:"2,590개", v25:"2,943개", yoy:-12.0, ic:"dn" },
    "성사율":       { v26:"75.5%",   v25:"77.3%",   yoy:-1.8,  ic:"nt", pp:true },
    // ...
  },
  "게임": { ... },
  // 리빙/만화/문구·굿즈/엔터테인먼트/예술/출판/패션/푸드
}
```

**필드 규칙:**
- `v26`, `v25`: 문자열 (단위 포함) — `"195.3억"`, `"2,590개"`, `"82,700원"`, `"75.5%"`
- `yoy`: 숫자 (퍼센트포인트 또는 % 변화율)
- `ic`: `"up"` / `"dn"` / `"nt"` (색상 배지)
- `pp:true`: yoy가 %p 단위(절대 차이)임을 표시 — 비율 지표(성사율, 신규율 등)에만 붙임

**SDATA 지표 목록 (순서 중요):**
GMV, 성사프로젝트, 론치프로젝트, 성사율, 프당성사액, 후원자수, 신규후원자, 기존후원자, 신규율, ARPPU, 신규ARPPU, 기존ARPPU, 후원빈도, 론치창작자, 신규창작자, 기존창작자, 신규창작자율, 창작자당론치, 론치창작자_plan

---

### 2. MDATA — 월별 주요 지표

신규/기존 후원자, GMV의 월별 수치. 섹션별로 v25(전년)·v26(당년) 배열 각 5개 값 (1~5월).

```js
const MDATA = {
  gmv: {
    '전체': { v25:[37.1,42.3,50.8,57.9,49.0], v26:[35.6,32.4,47.9,41.4,38.0] },
    '게임': { ... },
    // 9개 섹션
  },
  fst: {  // 신규 후원자 (명)
    '전체': { v25:[358,246,236,245,231], v26:[335,276,198,262,294] },
    // ...
  },
  ret: {  // 기존(재방문) 후원자 (명)
    '전체': { v25:[392,325,402,455,520], v26:[500,380,321,418,383] },
    // ...
  },
}
```

배열 인덱스 0=1월, 1=2월 … 4=5월. 현재 5개 값(1~5월).

---

### 3. PDATA — 스파크라인 다년도 월별 데이터

노드 카드에 그려지는 스파크라인 소스. gmv, lp(론치), bc(후원자), apv(ARPPU) 4개 지표.

```js
const PDATA = {
  gmv: {
    '전체': {
      "2023": [44.7,38.7,51.5,63.9,48.5,50.5,40.8,48.1,41.8,57.8,63.3,75.9], // 12개
      "2024": [57.7,41.8,53.2,45.1,44.8,41.8,39.9,64.5,44.2,117.0,64.4,39.4],
      "2025": [37.1,42.3,50.8,57.9,49.0,33.0,36.5,41.3,40.3,38.0,48.2,47.9],
      "2026": [35.6,32.4,47.9,41.4,38.0]  // 당해연도: 실적 개월수만큼만
    },
    // 섹션별 동일 구조
  },
  lp:  { ... },  // 론치프로젝트 수
  bc:  { ... },  // 후원자 수
  apv: { ... },  // 평균 후원액
}
```

---

## 업데이트 워크플로

### Step 1 — 파일 읽기

```python
with open(r'C:\Users\신장훈\Documents\claude\전략\텀블벅_GMV_지표트리.html', encoding='utf-8') as f:
    html = f.read()
```

### Step 2 — 데이터 파일 파싱

사용자가 제공하는 파일 형식에 따라 다르다:

| 형식 | 처리 방법 |
|------|-----------|
| Excel (.xlsx) | `openpyxl` 또는 `pandas` 로 읽기 |
| CSV | `csv.DictReader` |
| 직접 붙여넣기 | 텍스트 파싱 |

파싱 후 반드시 **SDATA / MDATA / PDATA 각 구조에 맞게 딕셔너리로 변환**한다.

### Step 3 — 상수 교체 (Python)

Edit 도구로는 큰 JSON 블록을 교체하기 어렵다. Python str.replace를 사용한다:

```python
import json

# 새 데이터로 딕셔너리 구성 후
new_sdata_str = 'const SDATA=' + json.dumps(new_sdata, ensure_ascii=False) + ';'

# 기존 상수 라인 찾아 교체
# SDATA는 한 줄로 되어 있음 (파일에서 'const SDATA={' 로 시작하는 줄)
import re
html = re.sub(r'const SDATA=\{.*?\};', new_sdata_str, html, flags=re.DOTALL)

with open(r'C:\Users\신장훈\Documents\claude\전략\텀블벅_GMV_지표트리.html', 'w', encoding='utf-8') as f:
    f.write(html)
```

MDATA, PDATA도 동일 패턴으로 교체한다.

### Step 4 — JS 문법 검증

```bash
node --check "C:\Users\신장훈\Documents\claude\전략\텀블벅_GMV_지표트리.html"
```

오류 없으면 OK. 오류 시 JSON 직렬화 문제(쉼표, 따옴표, 특수문자) 확인.

---

## 주의사항 / 흔한 실수

### ⚠️ 한국어 유니코드 이스케이프
`json.dumps(..., ensure_ascii=False)` 를 반드시 사용. `ensure_ascii=True`(기본값)이면
한글이 `후원` 형태로 저장되어 Edit 도구로 찾을 수 없게 된다.

### ⚠️ Edit 도구 한계
파일 내 한글이 `\uXXXX` 이스케이프로 저장된 경우 Edit 도구의 `old_string`이 매칭되지 않는다.
→ 대용량 JSON 교체는 항상 Python `str.replace` / `re.sub`을 사용한다.

### ⚠️ SDATA yoy 계산
- 일반 지표: `yoy = (v26_raw - v25_raw) / v25_raw * 100` (소수 1자리 반올림)
- 비율 지표 (`pp:true`인 것): `yoy = v26_pct - v25_pct` (퍼센트포인트 차이)

### ⚠️ ic 배지 결정
- `yoy > 0` → `"up"` (단, 부정 지표는 역전 — 파일 내 `NT_IDS` 참조)
- `yoy < 0` → `"dn"`
- `-0.5 < yoy < 0.5` → `"nt"` (보통 ±0.5% 미만)

### ⚠️ PDATA 당해연도 배열 길이
2026년처럼 중간에 잘리는 연도는 실적 월수만큼만 넣는다 (현재 5개). 12개로 채우지 말 것.

### ⚠️ MDATA 섹션 키
`'문구/굿즈'` — 슬래시 포함. JSON 직렬화 시 자동 처리되나, 수동 작성 시 따옴표 안에 정확히 입력.

---

## 부분 업데이트 패턴

특정 섹션만 바꿀 때:

```python
import json, re

with open(filepath, encoding='utf-8') as f:
    html = f.read()

# SDATA만 추출 후 파이썬 딕셔너리로 변환
match = re.search(r'const SDATA=(\{.*?\});', html, re.DOTALL)
sdata = json.loads(match.group(1))

# 수정
sdata['게임']['GMV'] = {"v26": "58.2억", "v25": "37.2억", "yoy": 56.5, "ic": "up"}

# 재삽입
new_block = 'const SDATA=' + json.dumps(sdata, ensure_ascii=False) + ';'
html = html[:match.start()] + new_block + html[match.end():]

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(html)
```

---

## 완료 체크리스트

- [ ] `node --check` 통과
- [ ] 브라우저에서 열어 노드 카드 숫자 확인
- [ ] 기간 선택 버튼(25↔26, 24↔25) 클릭 시 스파크라인 변화 확인
- [ ] 섹션 탭 전환 시 SDATA 수치 반영 확인
