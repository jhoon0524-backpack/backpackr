# 접속 확인 결과 및 스킵 목록

접속 확인(curl -I, 2026-09-20): reddit.com=실패(프록시 CONNECT 403) / cafe.naver.com=실패(프록시 CONNECT 403) / gall.dcinside.com=실패(프록시 CONNECT 403) / youtube.com=실패(프록시 CONNECT 403)

## 추가 확인한 곳 (모두 동일하게 프록시 403 차단)
- fmkorea.com, theqoo.net, clien.net, blog.naver.com, brunch.co.kr, forums.sherdog.com, boxingforum24.com, old.reddit.com
- WebFetch 도구로도 동일 도메인 + m.dcinside.com, slrclub.com, mania.kr, search.naver.com, web.archive.org 모두 차단(EGRESS_BLOCKED)
- 유일하게 통과한 곳: github.com (수집 대상 아님)

## 그래서 어떻게 수집했나
- 동작하는 도구는 WebSearch(검색 엔진 결과) 하나뿐. 검색 결과는 게시글 **제목**과 URL만 원문 그대로 돌려줌.
- 게시글 본문·댓글은 단 한 건도 읽지 못함. 따라서 raw.jsonl의 quote는 전부 **게시글 제목 원문**이다(quote_scope 필드 = "제목만").
- 검색 결과에 딸려 오는 요약문은 검색 도구가 생성한 문장이라 원문 여부를 확인할 수 없어 quote로 쓰지 않았다.

## 스킵한 커뮤니티와 이유
- 유튜브 댓글: 영상 페이지 자체가 차단. 검색으로 얻는 건 영상 제목(강사가 쓴 것)뿐이라 수련자 원문이 아니므로 0건.
- 네이버 카페 "회원수 상위 3개" 선정: 카페 목록 페이지 접속 불가로 회원수 확인 불가. 검색에 잡히는 카페 글은 카페명 구분 없이 "네이버 카페"로 묶음.

## 스킵한 커뮤니티 (최종)
| 커뮤니티 | 결과 | 이유 |
|---|---|---|
| reddit r/amateur_boxing, r/Boxing, r/kickboxing, r/Muaythai | 0건 | 사이트 차단(프록시 403). site:reddit.com 검색도 결과 0 |
| 네이버 카페 (회원수 상위 3개) | 0건 | 사이트 차단. site:cafe.naver.com / m.cafe.naver.com 검색 결과 0. 회원수 확인 불가 |
| 네이버 블로그 | 0건 | 사이트 차단. site:blog.naver.com 검색 결과 0 |
| 유튜브 댓글 (조회수 상위 10개) | 0건 | 사이트 차단. 검색으로 얻는 건 영상 제목뿐(강사 작성)이라 수련자 원문 아님 |
| 디시 격투기 갤러리 | 사실상 0건 | 격투 갤러리(board/fight) 검색 결과가 복싱갤 글로 대체됨. 대신 무에타이 마이너갤 6건, MMA 마이너갤 1건 수집 |

## 추가로 넣은 소스 (원래 목록에 없음)
- 블라인드(teamblind.com/kr) 24건: 직장인 커뮤니티로 클리앙과 성격이 비슷하고 검색이 잘 되어 포함. 별도 source로 표시해 뒀으니 제외하려면 필터하면 됨.
- SLR클럽 1건, NBA매니아 1건: 첫 검색에서 우연히 잡힌 글. 각 1건이라 영향 없음.

## 2차 수집

접속 확인(2026-09-20, curl -I 및 WebFetch): reddit.com=실패(프록시 CONNECT 403) / cafe.naver.com=실패(프록시 CONNECT 403) / gall.dcinside.com=실패(프록시 CONNECT 403) / youtube.com=실패(프록시 CONNECT 403)

목표: raw.jsonl의 URL 348개를 열어 본문·댓글 원문을 quote로 재수집.
결과: **348개 전부 읽지 못함. 0건 수집.** 이 세션의 네트워크 정책(egress proxy)이 대상 도메인 11곳을 모두 차단했다.

### 시도한 경로와 결과
- curl (브라우저 UA 포함): 11개 도메인 모두 프록시가 CONNECT에 403 응답 → HTTP 코드 000
- WebFetch 도구: 11개 도메인 모두 EGRESS_BLOCKED
- web.archive.org 경유: 차단
- 프록시 상태 로그(`__agentproxy/status`)에 "gateway answered 403 to CONNECT (policy denial)"로 기록됨 → 사이트 측 차단이 아니라 세션 환경의 정책 차단

### 못 읽은 URL (도메인별, 사유 동일)
| 도메인 | URL 수 | 이유 | 해당 id |
|---|---|---|---|
| m.dcinside.com | 103 | 프록시 CONNECT 403 (curl·WebFetch 모두) | r001~r016, r020~r021, r023~r050, r081~r083, r161~r172, r175~r211, r216~r218, r347~r348 |
| forums.sherdog.com | 94 | 프록시 CONNECT 403 (curl·WebFetch 모두) | r066~r071, r091~r127, r252~r302 |
| www.boxingforum24.com | 70 | 프록시 CONNECT 403 (curl·WebFetch 모두) | r072~r080, r128~r152, r303~r338 |
| www.teamblind.com | 24 | 프록시 CONNECT 403 (curl·WebFetch 모두) | r084~r090, r228~r244 |
| www.clien.net | 21 | 프록시 CONNECT 403 (curl·WebFetch 모두) | r018, r051~r055, r157~r160, r219~r225, r339~r342 |
| www.fmkorea.com | 11 | 프록시 CONNECT 403 (curl·WebFetch 모두) | r056~r062, r153, r226, r343~r344 |
| brunch.co.kr | 9 | 프록시 CONNECT 403 (curl·WebFetch 모두) | r065, r245~r251, r345 |
| gall.dcinside.com | 8 | 프록시 CONNECT 403 (curl·WebFetch 모두) | r022, r173~r174, r212~r215, r346 |
| theqoo.net | 6 | 프록시 CONNECT 403 (curl·WebFetch 모두) | r063~r064, r154~r156, r227 |
| www.slrclub.com | 1 | 프록시 CONNECT 403 (curl·WebFetch 모두) | r017 |
| mania.kr | 1 | 프록시 CONNECT 403 (curl·WebFetch 모두) | r019 |

합계 348개. 개별 URL은 data/raw.jsonl의 해당 id 행에서 확인.

### 그래서 어떻게 했나
- 본문을 읽지 못했으므로 data/raw_v2.jsonl, summary_v2.md는 **만들지 않았다**(빈 파일이나 제목 재탕은 "접속 실패를 수집했다로 처리"에 해당).
- 진행 상태는 progress_v2.md에 기록.
- 재시도 조건: Claude Code 환경 설정의 네트워크 정책에서 위 11개 도메인(최소한 m.dcinside.com, gall.dcinside.com, forums.sherdog.com, www.boxingforum24.com, www.teamblind.com, www.clien.net, www.fmkorea.com, brunch.co.kr, theqoo.net)을 허용하면 같은 지시로 바로 이어서 수집 가능.
