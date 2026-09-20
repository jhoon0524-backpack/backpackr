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
