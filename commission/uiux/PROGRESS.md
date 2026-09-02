**판정: 통과** (2회차 — 높음 0, 중간 0, 낮음 3)

## 2회차 (2026-09-02)

- **대상:** http://localhost:3100 프로덕션 빌드, 새로 심은 시연 데이터. 사람 전환은 오른쪽 위 선택기(채점 제외). 1회차와 다른 눈으로 처음부터 다시 봄
- **방법:** Playwright(chromium, ko-KR) 폭 390·1280. 화면마다 제목 요소를 기다린 뒤 `fullPage` 캡처 + 확인 상자·오류 문구가 뜬 순간은 보이는 화면(`-view`) 도 따로 캡처. 그림을 전부 직접 열어 봄. DOM 에서 대비(작은 글자 4.5 / 굵은 18px+ 3.0)·누르는 요소 44px·가로 넘침·말줄임·확인 상자가 화면 안에 있는지를 잼. 스크립트 `scratchpad/grade2.mjs`, 원자료 `scratchpad/grade2/report.txt`
- **한 줄 결론:** 1회차 10건 중 9건이 고쳐졌고 1건(누르는 높이)은 두 곳이 남았다. 되돌릴 수 없는 수락·완료가 이제 실제 마감일·자리 수를 보여 준 뒤 한 번 더 묻고 "아니오" 로 돌아온다. 새로 찾은 것은 낮음 3건뿐 — 처음 온 사람이 멈추거나 헤매는 곳은 없었다.

### 1회차 발견 재확인

| # | 1회차 발견 | 결과 | 확인한 곳 |
|---|---|---|---|
| 1 | 수락 화면에 마감일·남은 자리 없음, 확인 없음 | **고쳐짐** | 수락 상자에 "마감일 2026년 9월 17일 (14일 뒤) / 남은 자리 2 → 1 / 3" 이 버튼 위에 있고, 누르면 "…마감일이 2026년 9월 17일로 정해지고 자리 하나를 차지합니다. 수락한 뒤에는 되돌릴 수 없습니다 — [수락 확정] [아니오, 돌아가기]". 아니오를 누르면 상자가 닫히고 70,000 입력값이 남는다 (14·15·16 캡처) |
| 2 | 완료 확정 확인 없음 | **고쳐짐** | "결과물 확인 · 완료" → "결과물을 확인했고 이 의뢰를 끝냅니다. 끝낸 뒤에는 되돌릴 수 없습니다 — [결과물 확인 · 완료] [아니오, 돌아가기]". 아니오로 돌아오면 "전달됨 · 확인 대기" 그대로 (23 캡처). 390 에서 두 확인 상자 모두 화면 안에 다 들어온다 (수락 405~660px, 완료 619~828px / 844) |
| 3 | 390 마이페이지 마감일 잘림 | **고쳐짐** | 마감이 셋째 줄 "마감 9월 17일 · 14일 남음" 로 내려왔다. 390·1280 전 화면에서 말줄임 0건 (13·20·21·25·26 캡처) |
| 4 | 390 에서 마이페이지 가는 길이 바닥 16px 링크뿐 | **고쳐짐** | 머리 아래 탭 줄 "커미션 둘러보기 · 마이페이지 · 커미션 열기" 각 130×44px. 눌러서 /me, /open 으로 간다 (01 캡처). 바닥글은 한 줄 문구만 남음 |
| 5 | "마감" 이 닫힘과 마감일 두 뜻 | **고쳐짐** | 닫은 커미션은 홈 카드·마이페이지·상세 모두 "닫힘", 버튼 "닫기 / 다시 열기", 404 "창작자가 닫은 커미션". "마감" 은 날짜에만 (33·35·38·39 캡처) |
| 6 | 작은 글자 대비 4.5 미만 여러 곳 | **고쳐짐** | 잰 결과 전 화면에서 실패 0건 (피치 버튼 위 흰 16px 굵은 글자 3.03 은 정해진 예외라 제외). 오류 문구·"2자리 남음"·번호 1·2·3 이 #c0361f(5.5) 로, 파란 띠·"수락 대기" 배지가 #0152cc 로 바뀜 |
| 7 | 기본 가격/기본가, 동시 진행 건수/자리/진행 | **고쳐짐** | 상세·열기 폼·의뢰 상세·마이페이지·수락 도움말 모두 "기본 가격". 상세 "동시 진행 2건", 마이페이지 "동시 진행 1/3", 열기 폼 "동시 진행 건수". 수락 전 의뢰 상세에 "창작자가 수락하며 최종가를 정합니다." |
| 8 | 자리 없는 상세가 언제·뭘 안 알려 줌 | **고쳐짐** | "…가장 이른 마감은 2026년 9월 24일입니다." + [다른 커미션 둘러보기] (12 캡처) |
| 9 | 의뢰인 마이페이지 첫 칸이 빈 "들어온 의뢰" | **고쳐짐** | 연 커미션이 없고 넣은 의뢰가 있으면 "내가 넣은 의뢰" 가 맨 위. 빈 "들어온 의뢰" 에 "커미션을 열면 의뢰가 여기로 들어옵니다." (09 캡처) |
| 10 | 누르는 요소 44px 미만 | **부분** | 닫기/다시 열기 알약 44, "← 마이페이지"·"← 커미션 둘러보기" 44, 1280 머리 메뉴 64, 참고 링크 44 로 됐다. **남은 것:** 의뢰 상세 제목 링크(커미션으로 가는 h1 안 링크) 30px, 마이페이지 "내 커미션" 제목 링크 23px → 아래 발견 2 |

### 본 것

여정 7개 전부, 각 화면 390 과 1280. 확인 상자가 뜬 순간은 390 보이는 화면도 따로.

| 여정 | 사람 | 화면 |
|---|---|---|
| 1 | 아무도 안 고름 | 홈 → 로고 상세 → 마이페이지 → 커미션 열기. 390 머리 탭으로 /me, /open 이동 |
| 2 | 최의뢰 | 홈 → 로고 상세 → 3글자 오류 → 정상 제출 → 보낸 뒤 → 마이페이지 → 의뢰 상세 → 취소. 전신(자리 없음) 상세 |
| 3 | 김창작 | 마이페이지 → 수채에 온 최의뢰 대기 의뢰 → 70,000 → 확인 상자 → 아니오 → 다시 → 수락 확정 → 빈 전달 오류 → 메모 전달 → 마이페이지 |
| 4 | 최의뢰 | 마이페이지(전달됨) → 의뢰 상세 → 확인 상자 → 아니오 → 완료 → 마이페이지. 김창작 마이페이지에서 자리 돌아온 것 |
| 5 | 박덕후 | 열기 빈 제출 → 가격 500 → 정상 → 마이페이지 → 홈 → 닫기 → 홈 → 닫힌 상세(주인) → 다시 열기. 최의뢰가 본 새 커미션 상세 |
| 5' | 이글꼴·최의뢰 | 이글꼴 마이페이지(열린 것 + 닫힌 SNS 로고), 닫힌 SNS 로고 상세를 주인과 의뢰인이 볼 때 |
| 6 | 최의뢰 | `/commissions/abc`, `/requests/0000…` |
| 7 | — | 낱말: "기본 가격"·"동시 진행"·"닫힘/닫기" 화면마다 대조 |

**잘 되어 있던 것**
- 잰 것 전부 통과: 가로 넘침 0, 말줄임 0, 작은 글자 대비 실패 0(예외 제외), 확인 상자가 390 화면 안에 다 보임. 한국어만 나온다.
- 수락 전에 "이 결정이 무엇을 바꾸는지" 를 숫자로 보여 준다 — 마감 날짜·며칠 뒤·자리 2 → 1. 확인 문구가 같은 숫자를 다시 말해 준다.
- 두 확인 상자가 같은 모양(검정 테두리, 피치 확정 + 흰 "아니오, 돌아가기")이라 한 번 배우면 다음에 안다. "아니오" 뒤에 입력값이 남는다.
- 흐름의 각 단계가 다음 할 일을 말한다 — 보낸 뒤 "창작자가 수락하면 여기서 최종가와 마감일을…", 수락 뒤 창작자 화면에 바로 "완성물 전달" 폼, 전달 뒤 창작자 "의뢰인이 확인하면 완료됩니다", 의뢰인 "결과물 확인 · 완료" + "확인을 누르면 의뢰가 끝나고 창작자의 자리가 하나 빕니다".
- 완료 뒤 창작자 마이페이지가 "1자리 남음 · 동시 진행 2/3" → "2자리 남음 · 동시 진행 1/3" 으로 돌아온다. 상세 "동시 진행 3건" 과 마이페이지 "동시 진행 1/3" 이 같은 말이다.
- 오류 문구가 버튼 바로 위에 뜨고(390 에서 화면 안: 709~773px, 695~739px) 입력값이 남는다. 열기 폼 "기본 가격은 1,000원 이상이어야 합니다.", 의뢰 폼 "의뢰 내용을 10자 이상…", 전달 폼 "결과물 주소나 전달 메모 중 하나는…".
- 자리 없는 상세: 왜(다 참) · 언제(가장 이른 마감 9월 24일) · 그럼 뭘([다른 커미션 둘러보기]) 세 가지가 다 있다.
- 닫힌 커미션은 홈에서 즉시 사라지고, 주인이 열면 "내 커미션입니다 … [마이페이지로]", 404 문구가 "창작자가 닫은 커미션일 수 있습니다" 로 그 상황을 짚어 준다.
- 사람을 안 골랐을 때 상세·마이페이지·열기 세 화면이 같은 문장 "먼저 오른쪽 위에서 사용자를 골라 주세요." — 390 에서도 선택기는 오른쪽 위에 있다.

**본 것 중 발견으로는 안 세운 것 (4장 근거에 안 걸림 — 기록만)**
- 9번을 고친 결과: 의뢰도 넣고 커미션도 연 사람(박덕후)은 커미션을 여는 순간 "내가 넣은 의뢰" 가 맨 위에서 맨 아래로 내려간다 (27 → 31 캡처, 칸 순서 로그). 위치가 바뀌는 것이지 못 찾는 것은 아니라 근거 4 는 아니다.
- 390 탭 줄에 지금 어느 탭인지 표시가 없다. 제목(h1)으로 알 수 있다.
- "의뢰 취소" 는 확인 없이 한 번에 된다. SPEC 5장의 되돌릴 수 없는 지점(수락·완료)이 아니고 돈이 걸리지 않아 근거 3 이 아니다.
- 이글꼴 "들어온 의뢰 ①" 배지의 1 은 수락 대기 건수이고 목록에는 취소됨까지 2줄이다. 배지가 "할 일 수" 로 읽혀 무리 없다.
- 홈 카드 "60,000원~" 과 상세 "60,000원 부터" — 같은 뜻의 관용 표기라 근거 5 로 세지 않았다.

### 발견 (세기순)

#### 1. 닫힌 커미션 상세가 의뢰인에게 "지금은 의뢰를 받지 않습니다" 로 끝난다 · 낮음 · 근거 4
```
어디서   — 커미션 상세 "SNS 프로필 로고"(닫힘), 의뢰인 최의뢰가 주소로 직접 들어갔을 때. 390·1280 동일 (40 캡처)
무엇을   — 이 창작자에게 뭔가 맡기려다 닫힌 것을 알고 다음으로 가기
막힌 곳  — 오른쪽 패널이 "지금은 의뢰를 받지 않습니다." 한 줄로 끝. 같은 자리의 '자리 없음' 화면(12 캡처)에는 [다른 커미션 둘러보기] 버튼이 있는데 여기에는 없다.
           위의 "← 커미션 둘러보기" 와 머리 탭이 있어 갇히지는 않는다
왜       — 근거 4 다음 할 일을 화면이 안 알려 준다. 같은 패널의 다른 막힘(자리 없음)과 짝이 안 맞는다
대신     — 자리 없음 화면과 같이 [다른 커미션 둘러보기] 한 줄. 이 창작자의 열린 다른 커미션이 있으면 그것을 앞세운다
```

#### 2. 제목 링크 두 곳이 44px 에 못 미친다 (1회차 10 의 남은 것) · 낮음 · 근거 2
```
어디서   — 의뢰 상세 제목(h1 안의 커미션으로 가는 링크) 305×30px — 390·1280 모두. 마이페이지 "내 커미션" 제목 링크 255×23px (13·20·33·38 캡처)
무엇을   — 손가락으로 눌러 커미션 상세로 가기
막힌 곳  — 위 두 링크. 글자 위만 눌린다. 의뢰 상세에서 커미션으로 돌아가는 길은 이 링크뿐이다
왜       — 근거 2 누르는 요소 44px 미만. 1회차 10 에서 같은 지적을 받은 알약·뒤로 링크는 44 로 고쳐졌는데 이 둘은 빠졌다
대신     — 글자 크기는 두고 `min-h-11` 로 위아래를 채운다 (BACK·LINK 와 같은 방식)
```

#### 3. 390 에서 날짜·낱말이 줄 사이에서 갈라진다 · 낮음 · 근거 2
```
어디서   — 390 전용. 수락 상자 "마감일 2026년 9월 17 / 일 (14일 뒤)" (14·15 캡처), 의뢰 상세 머리 "2026년 9월 3일 오 / 전 12:52 의뢰" (08·14·22·24 캡처),
           홈 카드 제목 "독립출판 표지 로고·타이 / 틀", "전신 일러스트 + 간단 배 / 경" (01·32 캡처), 열기 폼 "3자리 남음 · 30,000원~ · 동시 진행 0/3" 은 온전
무엇을   — 마감일과 시각을 한눈에 읽기, 카드 제목을 읽기
막힌 곳  — "17" 과 "일", "오" 와 "전" 이 다른 줄에 있어 날짜 단위가 둘로 보인다. 잘리지는 않고 다 읽힌다
왜       — 근거 2 글자 잘림에 준함 — 글자는 안 잘렸지만 한 단위(17일, 오전)가 둘로 갈라진다. 브라우저가 한글을 글자 단위로 꺾기 때문 (`word-break: keep-all` 없음).
           경계선에 있는 지적이라 낮음으로 둔다
대신     — 본문에 `word-break: keep-all`(텀블벅과 같음) 을 주고, 수락 상자의 마감일 칸은 날짜와 "(14일 뒤)" 를 두 줄로 나눈다
```

### 못 본 것
- 거절 흐름(사유 입력 → 의뢰인이 "거절됨" 과 사유를 읽는 화면). 이번 여정에 없어 누르지 않았다. 사유 칸이 비면 브라우저 풍선이 뜰 텐데(`required`) 그 문구도 못 봤다
- 커미션 열기 폼을 완전히 빈 채 냈을 때의 문구 — 브라우저 기본 풍선(아래 도구 한계). 서버 쪽 문구는 안 나온다
- 참고 링크·결과물 주소에 `https://` 아닌 값을 넣었을 때 (`type=url` 풍선)
- 마감일이 지난 의뢰의 "N일 지남" 붉은 글자 — 시연 데이터에 없음
- 어두운 테마 — `color-scheme: only light` 로 고정돼 있어 1회차와 같이 따로 안 봤다
- 느린 연결의 로딩 뼈대 화면

### 도구 한계
- 헤드리스 크로미엄이 ko-KR 에서도 `required` 빈 칸 풍선을 영어("Please fill out this field.")로 낸다. 캡처에 안 찍힌다 (29 캡처는 제목 칸에 초점만 간 상태)
- `fullPage` 캡처에서 고정 머리가 화면 중간에 한 번 더 찍힌다 (07, 16, 17, 18, 19, 24, 29, 30, 31 캡처). 실제 화면 문제가 아니다
- 31 캡처(커미션 연 직후 마이페이지 390)가 100px 쯤 내려간 채 찍혀 제목이 머리에 가렸다. 따로 다시 재니(`grade2b.mjs`, 43 캡처) 주소가 바뀐 직후 scrollY 0, 제목이 머리 아래 142px 에 온전히 있었다. 도구의 순간 문제로 보고 발견에 넣지 않았다
- 상태를 바꾸는 여정이라 DB 가 바뀌었다 — 로고 커미션에 최의뢰의 취소된 의뢰 1건, 수채에 최의뢰의 완료된 의뢰 1건(70,000원, 수락·전달·완료 시각 09-03 00:52~00:53), 박덕후의 "픽셀아트 아이콘 세트"(다시 열린 상태)와 "확인용 임시 커미션"(닫힌 상태, 43 캡처용) 이 남아 있다. 다음 회차 전 다시 심어야 한다
- 채점 지시에 따라 커밋하지 않았다. `uiux/TASKS.md` 는 여전히 없다

### 스크린샷
경로 앞 `scratchpad/` = `/tmp/claude-0/-home-user-backpackr/94e8917a-f629-5bad-a051-8b598ca8996f/scratchpad/`. `-m390` 폭 390 전체, `-m390-view` 폭 390 보이는 화면만, `-d1280` 폭 1280. 스크립트 `scratchpad/grade2.mjs`·`grade2b.mjs`, 측정 원자료 `scratchpad/grade2/report.txt`.

- scratchpad/grade2/01-anon-home-d1280.png
- scratchpad/grade2/01-anon-home-m390-view.png
- scratchpad/grade2/01-anon-home-m390.png
- scratchpad/grade2/02-anon-detail-d1280.png
- scratchpad/grade2/02-anon-detail-m390.png
- scratchpad/grade2/03-anon-me-d1280.png
- scratchpad/grade2/03-anon-me-m390.png
- scratchpad/grade2/04-anon-open-d1280.png
- scratchpad/grade2/04-anon-open-m390.png
- scratchpad/grade2/05-client-home-d1280.png
- scratchpad/grade2/05-client-home-m390.png
- scratchpad/grade2/06-client-logo-detail-d1280.png
- scratchpad/grade2/06-client-logo-detail-m390.png
- scratchpad/grade2/07-client-short-brief-error-m390.png
- scratchpad/grade2/08-client-request-sent-d1280.png
- scratchpad/grade2/08-client-request-sent-m390-view.png
- scratchpad/grade2/08-client-request-sent-m390.png
- scratchpad/grade2/09-client-me-d1280.png
- scratchpad/grade2/09-client-me-m390-view.png
- scratchpad/grade2/09-client-me-m390.png
- scratchpad/grade2/10-client-request-before-cancel-d1280.png
- scratchpad/grade2/10-client-request-before-cancel-m390.png
- scratchpad/grade2/11-client-request-cancelled-d1280.png
- scratchpad/grade2/11-client-request-cancelled-m390.png
- scratchpad/grade2/12-client-full-detail-d1280.png
- scratchpad/grade2/12-client-full-detail-m390.png
- scratchpad/grade2/13-creator-me-d1280.png
- scratchpad/grade2/13-creator-me-m390.png
- scratchpad/grade2/14-creator-decision-d1280.png
- scratchpad/grade2/14-creator-decision-m390-view.png
- scratchpad/grade2/14-creator-decision-m390.png
- scratchpad/grade2/15-creator-accept-confirm-d1280.png
- scratchpad/grade2/15-creator-accept-confirm-m390-view.png
- scratchpad/grade2/15-creator-accept-confirm-m390.png
- scratchpad/grade2/16-creator-after-no-m390.png
- scratchpad/grade2/17-creator-accepted-d1280.png
- scratchpad/grade2/17-creator-accepted-m390-view.png
- scratchpad/grade2/17-creator-accepted-m390.png
- scratchpad/grade2/18-creator-deliver-empty-error-m390.png
- scratchpad/grade2/19-creator-delivered-d1280.png
- scratchpad/grade2/19-creator-delivered-m390.png
- scratchpad/grade2/20-creator-me-after-d1280.png
- scratchpad/grade2/20-creator-me-after-m390.png
- scratchpad/grade2/21-client-me-delivered-d1280.png
- scratchpad/grade2/21-client-me-delivered-m390-view.png
- scratchpad/grade2/21-client-me-delivered-m390.png
- scratchpad/grade2/22-client-request-delivered-d1280.png
- scratchpad/grade2/22-client-request-delivered-m390-view.png
- scratchpad/grade2/22-client-request-delivered-m390.png
- scratchpad/grade2/23-client-complete-confirm-d1280.png
- scratchpad/grade2/23-client-complete-confirm-m390-view.png
- scratchpad/grade2/23-client-complete-confirm-m390.png
- scratchpad/grade2/24-client-request-completed-d1280.png
- scratchpad/grade2/24-client-request-completed-m390.png
- scratchpad/grade2/25-client-me-completed-m390.png
- scratchpad/grade2/26-creator-me-completed-m390.png
- scratchpad/grade2/27-client2-me-before-m390.png
- scratchpad/grade2/28-open-form-d1280.png
- scratchpad/grade2/28-open-form-m390.png
- scratchpad/grade2/29-open-empty-error-m390.png
- scratchpad/grade2/30-open-price-error-m390.png
- scratchpad/grade2/31-open-done-me-d1280.png
- scratchpad/grade2/31-open-done-me-m390-view.png
- scratchpad/grade2/31-open-done-me-m390.png
- scratchpad/grade2/32-home-with-new-m390.png
- scratchpad/grade2/33-me-closed-d1280.png
- scratchpad/grade2/33-me-closed-m390.png
- scratchpad/grade2/34-home-after-close-m390.png
- scratchpad/grade2/35-closed-detail-as-owner-m390.png
- scratchpad/grade2/36-me-reopened-m390.png
- scratchpad/grade2/37-client-new-detail-m390.png
- scratchpad/grade2/38-creator2-me-d1280.png
- scratchpad/grade2/38-creator2-me-m390.png
- scratchpad/grade2/39-closed-sns-detail-owner-m390.png
- scratchpad/grade2/40-closed-sns-detail-client-m390.png
- scratchpad/grade2/41-404-commission-d1280.png
- scratchpad/grade2/41-404-commission-m390.png
- scratchpad/grade2/42-404-request-m390.png
- scratchpad/grade2/43-open-done-landing-m390-view.png

---

## 1회차 (2026-09-02)

- **대상:** http://localhost:3100 프로덕션 빌드, 시연 데이터. 사람 전환은 오른쪽 위 "로그인 대신 고르기" (이 장치 자체는 채점 제외)
- **방법:** Playwright(chromium, ko-KR) 로 폭 390·1280 두 벌. 화면마다 제목 요소를 기다린 뒤 `fullPage` 캡처, 그림을 직접 열어 봄. DOM 에서 대비(작은 글자 4.5 / 굵은 18px+ 3.0)·누르는 요소 44px·가로 넘침·글자 잘림을 잼
- **한 줄 결론:** 의뢰 → 수락 → 전달 → 완료가 막히는 곳 없이 끝나고 다음 할 일도 대체로 화면에 있다. 다만 **되돌릴 수 없는 두 버튼(수락·완료)이 확인 없이 한 번에 눌리고**, 휴대폰 폭에서 마감일이 잘리고 마이페이지 가는 길이 맨 아래 16px 링크뿐이며, 스스로 정한 색 규칙을 작은 글자에서 여러 곳 어겼다.

## 본 것

여정 6개 전부, 각 화면 390 과 1280.

| 여정 | 사람 | 화면 |
|---|---|---|
| 1 | 아무도 안 고름 | 홈 → 로고 커미션 상세 → 마이페이지 → 커미션 열기 |
| 2 | 최의뢰 | 홈 → 로고 상세 → 3글자 오류 → 정상 제출 → 보낸 뒤 화면 → 마이페이지 → 의뢰 상세 → 취소. 전신(자리 없음) 상세 |
| 3 | 김창작 | 마이페이지 → 수채에 온 최의뢰 대기 의뢰 → 70,000 으로 수락 → 빈 전달 오류 → 메모 전달 → 마이페이지 |
| 4 | 최의뢰 | 마이페이지(전달됨) → 의뢰 상세 → 완료 확정 → 마이페이지 |
| 5 | 박덕후 | 커미션 열기 빈 제출 → 가격 500 오류 → 정상 제출 → 마이페이지 → 홈 확인 → 닫기 → 홈에서 사라짐 → 닫힌 상세 → 다시 열기 |
| 6 | 최의뢰 | `/commissions/abc`, `/requests/0000…`, `/nothing-here` |

**잘 되어 있던 것**
- 가로 넘침 없음(390·1280 모든 화면). 한국어만 나온다. 밝은 화면 한 벌로 고정돼 어두운 테마에서 뒤집히지 않는다(`color-scheme: only light` 확인).
- 처음 온 사람 안내가 있다 — 사람을 안 고르면 상세 패널·마이페이지·커미션 열기 모두 "먼저 오른쪽 위에서 사용자를 골라 주세요". 없는 주소는 한국어 404 와 "커미션 둘러보기" 버튼.
- 상세의 "진행 방식" 1·2·3 이 의뢰 전에 흐름을 미리 알려 준다. 작업 기간이 실제 일수("10일 안에")로 박혀 있다.
- 의뢰 폼: 3글자 제출 → "의뢰 내용을 10자 이상 적어 주세요. 창작자가 판단할 수 있어야 합니다." 입력값 유지. 버튼 아래 "보내는 것은 무료입니다. 수락 전까지 취소할 수 있습니다."
- 보낸 뒤: "의뢰를 보냈습니다. 창작자가 수락하면 여기서 최종가와 마감일을 볼 수 있습니다." + 상태 배지 "수락 대기" + "의뢰 취소" 버튼과 "창작자가 수락하기 전까지만" 설명. 다음에 무슨 일이 나는지 안다.
- 창작자 수락 뒤 같은 자리에 "완성물 전달" 폼이 뜨고, 최종가 70,000원·마감일 2026년 9월 17일 (14일 남음) 이 크게 보인다. 빈 전달 → "결과물 주소나 전달 메모 중 하나는 있어야 합니다."
- 전달 뒤 창작자에겐 "의뢰인이 확인하면 완료됩니다", 의뢰인에겐 "결과물 확인 · 완료" 버튼과 "되돌릴 수 없습니다" 문구. 완료 뒤 "기록" 에 의뢰·수락·전달·완료 시각이 쌓인다.
- 커미션 열기: 가격 500 → "기본 가격은 1,000원 이상이어야 합니다." 입력값 유지. 연 뒤 "커미션을 열었습니다. 둘러보기 목록에 바로 보입니다." 닫으면 홈에서 즉시 사라지고 "다시 열기" 로 돌아온다.
- 금액 칸이 `50,000 원` 처럼 자릿수를 찍어 준다. 가격이 화면에서 가장 큰 글자다(원칙 [금액]).

## 발견 (세기순)

### 1. 수락 화면에 마감일 날짜와 남은 자리가 없고, 되돌릴 수 없는 수락이 확인 없이 눌린다 · 중간 · 근거 3, 4
```
어디서   — 의뢰 상세(창작자 김창작), /requests/… "수락하기" 상자. 390·1280 동일
무엇을   — 최종가를 정해 수락하면 언제까지, 몇 자리 중 몇 자리를 쓰게 되는지 알고 누르기
막힌 곳  — 도움말 "수락하면 오늘부터 작업 기간만큼의 마감일이 정해지고 자리 하나를 차지합니다".
           "작업 기간" 이 며칠인지, 그래서 마감일이 며칠인지, 남은 자리가 몇인지 이 화면 어디에도 없다.
           마감일(9월 17일)은 수락 버튼을 누른 뒤에야 나타난다. 확인 단계 없음
왜       — SPEC 5장이 수락을 "되돌릴 수 없는 지점" 으로 못박았는데(최종가·마감일 박히고 자리 차지) 확인을 안 받는다(근거 3).
           결정에 필요한 숫자(마감 날짜·남은 자리)를 화면이 안 알려 준다(근거 4). 커미션 상세와 마이페이지에는 있는 값이다
대신     — 도움말을 "수락하면 마감일이 2026년 9월 17일(14일) 로 정해지고 남은 자리 2 → 1 이 됩니다. 되돌릴 수 없습니다" 처럼 실제 값으로 적고, 버튼은 한 번 더 확인받는다
```

### 2. 완료 확정이 한 번 누르면 끝인데 확인이 없다 · 중간 · 근거 3
```
어디서   — 의뢰 상세(의뢰인 최의뢰), 상태 "전달됨 · 확인 대기", 오른쪽 패널의 "결과물 확인 · 완료" 피치 버튼
무엇을   — 결과물을 보고 나서 끝내기
막힌 곳  — 버튼 한 번에 바로 "완료" 가 되고 "끝난 의뢰입니다" 로 바뀐다. 아래 작은 글자에 "되돌릴 수 없습니다" 라고 적혀 있지만 멈춰 세우는 단계가 없다.
           390 에서는 이 버튼이 패널 안에서 가장 큰 요소라 스크롤하다 닿기 쉽다
왜       — SPEC 5장: 완료 확정은 정산 의무가 생기는 되돌릴 수 없는 행동. 근거 3 "돈이 걸린 행동인데 확인을 안 받는다"
대신     — 누르면 "결과물을 확인했고 의뢰를 끝냅니다. 되돌릴 수 없습니다 — [끝내기] [아니오]" 한 번 더 묻는다
```

### 3. 폭 390 마이페이지 목록에서 마감일이 잘려 보이지 않는다 · 중간 · 근거 2
```
어디서   — 마이페이지 "들어온 의뢰"·"내가 넣은 의뢰" 줄, 390. 창작자(김창작)·의뢰인(최의뢰) 둘 다
무엇을   — 목록만 보고 어느 건이 언제 마감인지 알기
막힌 곳  — 둘째 줄 "최의뢰 · 160,000원 · 마감 2026년 9월 2…", "김창작 · 70,000원 · 마감 2026…" 로 날짜와 "(14일 남음)" 이 말줄임표로 사라진다.
           390 에서 진행 중 5건 전부 잘렸다(09, 13, 18, 19, 26 캡처). 1280 에서는 온전히 보인다
왜       — 근거 2 글자 잘림(`truncate`). 원칙 [금액] "놓치면 손해 보는 것" — 창작자에게 마감일은 놓치면 손해다
대신     — 마감을 셋째 줄로 내리거나 "9/17 (14일 남음)" 처럼 짧게 적어 390 에서도 끝까지 보이게 한다
```

### 4. 폭 390 에서 마이페이지·커미션 열기로 가는 길이 화면 맨 아래 16px 링크뿐이다 · 중간 · 근거 2, 4
```
어디서   — 모든 화면의 머리(header), 390. 특히 홈·커미션 상세
무엇을   — 창작자가 "들어온 의뢰 보러 가기", 누구나 "커미션 열기"
막힌 곳  — 390 머리에는 로고와 사용자 전환기만 있다. "커미션 둘러보기 · 마이페이지 · 커미션 열기" 는 1280 에만 뜨고,
           390 에서는 바닥글(footer)의 12px 글자·높이 16px 링크 세 개가 유일한 길이다. 상세 화면에서는 1,200px 넘게 내려가야 나온다.
           의뢰 상세에만 "← 마이페이지" 가 있고 홈·커미션 상세·커미션 열기에는 없다
왜       — 근거 2 누르는 요소 44px 미만(16px). 근거 4 다음 할 일(내 의뢰 확인)로 가는 길을 화면이 안 보여 준다
대신     — 390 머리에 마이페이지(또는 메뉴) 하나를 44px 이상으로 두거나, 바닥글 링크를 탭 막대처럼 키운다
```

### 5. "마감" 이 닫힌 커미션과 마감일 두 뜻으로 같은 화면에 있다 · 중간 · 근거 5
```
어디서   — 마이페이지(창작자 박덕후) 커미션을 닫은 뒤, 390·1280. 홈 카드도 같음
무엇을   — 내 커미션이 지금 어떤 상태인지 읽기
막힌 곳  — "내 커미션" 줄: "마감 · 30,000원~ · 진행 0/3". 바로 아래 "내가 넣은 의뢰" 줄: "김창작 · 60,000원 · 마감 2026년 9월 17…".
           위 "마감" 은 '닫음', 아래 "마감" 은 '기한'. 그런데 버튼은 "닫기 / 다시 열기", 404 문구는 "창작자가 닫은 커미션" 이라 닫은 것을 "닫기" 와 "마감" 두 이름으로 부른다
왜       — 근거 5 같은 것을 두 이름으로(닫기·마감), 다른 것을 한 이름으로(마감·마감일)
대신     — 닫힌 커미션은 "닫힘" 으로 통일하고 "마감" 은 마감일에만 쓴다
```

### 6. 작은 글자 대비가 스스로 정한 규칙과 4.5 를 어긴다 · 중간 · 근거 1, 2
```
어디서   — 여러 화면. 잰 값(글자색/배경, 크기, 대비):
           · 오류 문구(ALERT) "의뢰 내용을 10자 이상…", "결과물 주소나…", "기본 가격은 1,000원…" — #eb4b38 / #fff4f2, 14px, 3.48
           · 홈 카드·마이페이지 "2자리 남음" — #eb4b38 / 흰색, 14px 굵게, 3.75
           · 상세 "진행 방식" 번호 1·2·3 — #eb4b38 / 흰색, 15px 굵게, 3.75
           · 상태 배지 "수락 대기" — #1593f3 / #f3faff, 12px, 3.07 · "작업 중" — #eb4b38 / #fff4f2, 12px, 3.48
           · 파란 안내 띠 "의뢰를 보냈습니다…", "커미션을 열었습니다…" — #1593f3 / #f3faff, 14px, 3.07
           · "들어온 의뢰" 개수 배지 "1" — 흰색 / #f86453, 12px 굵게, 3.03
           · 참고 링크 파란 글자 — #1593f3 / 흰색, 14px, 3.23
무엇을   — 오류·상태·남은 자리처럼 진행에 필요한 짧은 글자 읽기
막힌 곳  — 위 요소들. 특히 오류 문구는 그걸 읽어야 다음으로 갈 수 있는데 옅은 분홍 위 붉은 14px 글자다
왜       — 근거 1: `app/globals.css` 가 "urgent #EB4B38 → 3.75. 큰 글자와 테두리·배경에만", "흰 글자는 굵은 16px 이상에서만" 이라고 정해 뒀는데
           ALERT(`app/ui.ts`)·카드·배지·개수 배지가 작은 글자에 쓴다. 근거 2: 작은 글자 4.5 미만
           (피치 버튼의 흰 16px 굵은 글자 3.03 은 globals.css 가 예외로 정해 둔 것이라 세지 않았다)
대신     — 작은 글자는 `--color-good`(#0152cc, 6.8)·`--color-muted` 계열로 바꾸고, 붉은색·하늘색은 배경·테두리·20px 이상에만 쓴다
```

### 7. 같은 값을 화면마다 다른 이름으로 부른다 (기본 가격·기본가, 동시 진행 건수·자리·진행) · 낮음 · 근거 5
```
어디서   — 커미션 상세·열기 폼("기본 가격") ↔ 의뢰 상세·마이페이지·수락 도움말("기본가").
           열기 폼("동시 진행 건수") ↔ 마이페이지("3자리 남음 · 진행 0/3") ↔ 상세("남은 자리 / 3")
무엇을   — 창작자가 폼에 넣은 숫자가 어디에 어떻게 나타났는지 맞추기, 의뢰인이 "기본가" 가 상세의 "기본 가격 부터" 와 같은 것인지 알기
막힌 곳  — 위 낱말들. 의뢰 상세 패널은 "기본가 150,000원" 만 있고 "부터" 가 없어 확정가처럼 읽힌다
왜       — 근거 5
대신     — "기본 가격"·"동시 진행" 으로 통일하고 의뢰 상세의 수락 전 금액에는 "(창작자가 수락하며 정합니다)" 를 붙인다
```

### 8. 자리가 없는 커미션 상세가 "언제" 와 "다음에 뭘" 을 안 알려 준다 · 낮음 · 근거 4
```
어디서   — 커미션 상세 "전신 일러스트 + 간단 배경"(의뢰인 최의뢰), 오른쪽 패널
무엇을   — 왜 못 하는지, 언제 되는지 알고 나가기
막힌 곳  — "진행 가능한 자리가 모두 찼습니다. 작업이 하나 끝나면 다시 열립니다." 여기서 끝. 언제쯤인지(가장 이른 마감 9월 24일은 시스템이 안다),
           그동안 할 수 있는 일(같은 창작자의 다른 커미션, 둘러보기)로 가는 길이 없다
왜       — 근거 4 막다른 곳. "왜" 는 알겠지만 "언제·그럼 뭘" 이 없다
대신     — "가장 이른 마감은 9월 24일입니다" 와 "이 창작자의 다른 커미션 보기" 링크 하나
```

### 9. 의뢰인 마이페이지 첫 칸이 빈 "들어온 의뢰" 인데 나가는 길이 없다 · 낮음 · 근거 4
```
어디서   — 마이페이지(의뢰인 최의뢰·박덕후), 맨 위 구역
무엇을   — 내가 넣은 의뢰가 어떻게 됐는지 보기
막힌 곳  — 제목 바로 아래 "들어온 의뢰 — 아직 들어온 의뢰가 없습니다." 그다음 "내 커미션 — 연 커미션이 없습니다 [커미션 열기]".
           의뢰인은 두 빈 칸을 지나 셋째 칸 "내가 넣은 의뢰" 에서야 자기 것을 본다. 빈 "들어온 의뢰" 에는 그게 누구를 위한 칸인지, 뭘 하면 채워지는지 없다
왜       — 근거 4, 원칙 [빈 화면] "빈 화면에 나가는 길이 있다"
대신     — "커미션을 열면 의뢰가 여기로 들어옵니다" 한 줄을 붙이거나, 넣은 의뢰가 있고 연 커미션이 없으면 "내가 넣은 의뢰" 를 위로 올린다
```

### 10. 누르는 요소가 44px 에 못 미친다 · 낮음 · 근거 2
```
어디서   — 마이페이지 "닫기 / 다시 열기" 알약 36px(`BTN_PILL` 이 h-9). 의뢰 상세 "← 마이페이지" 16px.
           1280 머리 메뉴 "커미션 둘러보기·마이페이지·커미션 열기" 23px. 로고 "커미션" 33px. 참고 링크 16px. (390 바닥글 링크 16px 은 4번에)
무엇을   — 손가락으로 누르기
막힌 곳  — 위 요소들
왜       — 근거 2 44px 미만
대신     — 글자 크기는 두고 위아래 여백으로 44px 을 채운다
```

## 못 본 것
- 어두운 테마(원칙 [기기]) — `color-scheme: only light` 로 고정돼 있어 뒤집힐 여지가 없다고 판단하고 따로 안 봤다
- 느린 연결에서의 로딩 뼈대 화면
- 거절하기 흐름(사유 입력 → 의뢰인이 거절 사유 읽기). 이번 여정에 없어 누르지 않았다
- 참고 링크에 잘못된 주소를 넣었을 때의 문구
- 동시 진행 건수가 다 찬 창작자의 마이페이지에서 "자리 없음" 이 어떻게 읽히는지 (전신 커미션은 봤지만 그 뒤 한 건을 완료해서 자리가 돌아오는 것까지는 안 봤다)
- 커미션 열기 폼을 완전히 빈 채 냈을 때 사용자에게 보이는 문구 — 브라우저 기본 풍선(아래 도구 한계)

## 도구 한계
- 헤드리스 크로미엄이 ko-KR 로켈에서도 `required` 빈 칸의 브라우저 풍선을 영어("Please fill out this field.")로 낸다. 실제 한국어 브라우저에서는 한국어 풍선이 뜬다. 풍선은 캡처에 안 찍힌다
- `fullPage` 캡처에서 고정 머리(sticky header)가 화면 중간에 한 번 더 찍힌다 (07, 15, 16, 17, 21, 24, 25 캡처). 실제 화면의 문제가 아니다
- 상태를 바꾸는 여정이라 DB 가 바뀌었다 — 로고 커미션에 최의뢰의 취소된 의뢰 1건, 수채에 최의뢰의 완료된 의뢰 1건(70,000원), 박덕후의 "픽셀아트 아이콘 세트" 커미션(다시 열린 상태) 이 남아 있다. 다음 회차 전 다시 심어야 한다
- `uiux/TASKS.md` 가 없어 체크할 항목이 없었다. 채점 지시에 따라 커밋하지 않았다

## 스크린샷
경로 앞 `scratchpad/` = `/tmp/claude-0/-home-user-backpackr/94e8917a-f629-5bad-a051-8b598ca8996f/scratchpad/`. 이름 끝 `-m390` 은 폭 390, `-d1280` 은 1280. 측정 원자료는 `scratchpad/grade1/report.txt`, 스크립트는 `scratchpad/grade1.mjs`.

- scratchpad/grade1/01-anon-home-d1280.png
- scratchpad/grade1/01-anon-home-m390.png
- scratchpad/grade1/02-anon-detail-d1280.png
- scratchpad/grade1/02-anon-detail-m390.png
- scratchpad/grade1/03-anon-me-d1280.png
- scratchpad/grade1/03-anon-me-m390.png
- scratchpad/grade1/04-anon-open-d1280.png
- scratchpad/grade1/04-anon-open-m390.png
- scratchpad/grade1/05-client-home-d1280.png
- scratchpad/grade1/05-client-home-m390.png
- scratchpad/grade1/06-client-logo-detail-d1280.png
- scratchpad/grade1/06-client-logo-detail-m390.png
- scratchpad/grade1/07-client-short-brief-error-m390.png
- scratchpad/grade1/08-client-request-sent-d1280.png
- scratchpad/grade1/08-client-request-sent-m390.png
- scratchpad/grade1/09-client-me-d1280.png
- scratchpad/grade1/09-client-me-m390.png
- scratchpad/grade1/10-client-request-before-cancel-d1280.png
- scratchpad/grade1/10-client-request-before-cancel-m390.png
- scratchpad/grade1/11-client-request-cancelled-d1280.png
- scratchpad/grade1/11-client-request-cancelled-m390.png
- scratchpad/grade1/12-client-full-detail-d1280.png
- scratchpad/grade1/12-client-full-detail-m390.png
- scratchpad/grade1/13-creator-me-d1280.png
- scratchpad/grade1/13-creator-me-m390.png
- scratchpad/grade1/14-creator-decision-d1280.png
- scratchpad/grade1/14-creator-decision-m390.png
- scratchpad/grade1/15-creator-accepted-d1280.png
- scratchpad/grade1/15-creator-accepted-m390.png
- scratchpad/grade1/16-creator-deliver-empty-error-m390.png
- scratchpad/grade1/17-creator-delivered-d1280.png
- scratchpad/grade1/17-creator-delivered-m390.png
- scratchpad/grade1/18-creator-me-after-m390.png
- scratchpad/grade1/19-client-me-delivered-d1280.png
- scratchpad/grade1/19-client-me-delivered-m390.png
- scratchpad/grade1/20-client-request-delivered-d1280.png
- scratchpad/grade1/20-client-request-delivered-m390.png
- scratchpad/grade1/21-client-request-completed-d1280.png
- scratchpad/grade1/21-client-request-completed-m390.png
- scratchpad/grade1/22-client-me-completed-m390.png
- scratchpad/grade1/23-open-form-d1280.png
- scratchpad/grade1/23-open-form-m390.png
- scratchpad/grade1/24-open-empty-error-m390.png
- scratchpad/grade1/25-open-price-error-m390.png
- scratchpad/grade1/26-open-done-me-d1280.png
- scratchpad/grade1/26-open-done-me-m390.png
- scratchpad/grade1/27-home-with-new-m390.png
- scratchpad/grade1/28-me-closed-d1280.png
- scratchpad/grade1/28-me-closed-m390.png
- scratchpad/grade1/29-home-after-close-m390.png
- scratchpad/grade1/30-closed-detail-as-owner-m390.png
- scratchpad/grade1/31-me-reopened-m390.png
- scratchpad/grade1/32-client-new-detail-m390.png
- scratchpad/grade1/33-404-commission-d1280.png
- scratchpad/grade1/33-404-commission-m390.png
- scratchpad/grade1/34-404-request-m390.png
- scratchpad/grade1/35-404-any-m390.png
