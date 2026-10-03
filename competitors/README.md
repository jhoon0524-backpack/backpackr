# 경쟁사 변화 수집

와디즈·게임파운드·킥스타터·마쿠아케·캠프파이어의 공개 정보를 '변화 1건 = 1행'으로 기록한다. 해석·요약·시사점은 쓰지 않는다.
분석은 이 기록(raw.md)을 재료로 별도로 한다. 분석 시 우선 관심사: **전략**, **프로덕트 기능**.

## 폴더
- `<경쟁사>/raw.md` — 변화 기록. 맨 아래에만 추가, 기존 행 수정·삭제 금지
- `<경쟁사>/baseline.md` — 소스별 마지막 확인 ID/날짜
- `<경쟁사>/snapshots/YYYY-MM.md` — 매월 1일 스냅샷(수수료표, 카테고리, GNB, 메인 섹션·배너, 채용 목록)

## 행 형식
`ID | 날짜 | 출처URL | 원문발췌 | 태그 | 확실도`
- ID: WZ-/GF-/KS-/MK-/CF- + YYYYMMDD-NN
- 날짜: 사실이 공개·발생한 날짜(수집일 아님)
- 원문발췌: 요약 금지, 원문 그대로 150자 이내, 숫자 포함. 영어는 번역하지 않음
- 태그: 공급 / 수요 / 수익 / 조직 / 정책 중 하나
- 확실도: 공식 / 관찰 / 외부

## 전략·프로덕트 소스 (읽는 방법)
| 경쟁사 | 소스 | 읽는 방법 |
|---|---|---|
| 와디즈 | 공식 블로그 전 카테고리(와디즈 뉴스·와디즈 소식·서비스 이야기·기획노트·기술 이야기·일하는 법) | `blog.wadiz.io/wp-json/wp/v2/posts` (헤드리스 브라우저) |
| 와디즈 | 도움말센터 최근 수정 문서 | `helpcenter.wadiz.io/api/v2/help_center/ko/articles.json?sort_by=updated_at&sort_order=desc` |
| 킥스타터 | **블로그 News·Product Updates 태그 (전략·기능 우선)** | `updates.kickstarter.com/tag/news/rss/`, `updates.kickstarter.com/tag/product-updates/rss/` |
| 킥스타터 | 공식 블로그 전체 | `updates.kickstarter.com/rss/` |
| 킥스타터 | 기능 소개 페이지(출시·Coming Soon 목록) | `features.kickstarter.com` (헤드리스 브라우저) |
| 킥스타터 | 유튜브 | `youtube.com/feeds/videos.xml?channel_id=UCPV33YGEVLwtOotz9ZG0XQw` |
| 게임파운드 | 블로그 [What's new] 시리즈 | 사이트 차단 → 웹검색 `site:gamefound.com/en/blog "What's new"` |
| 게임파운드 | 도움말센터 수정 문서 | `help.gamefound.com/sitemap.xml` lastmod |
| 마쿠아케 | 회사 뉴스·마쿠아케 스토리(전략·사례)·IR | `makuake.co.jp/news/`, `/makuake_story/`, `/ir/` |
| 마쿠아케 | 도움말센터 | `mkhelp.makuake.com/api/v2/help_center/ja/articles.json?sort_by=edited_at&sort_order=desc` |
| 캠프파이어 | 회사 뉴스·PR TIMES·서비스 뉴스 | `campfire.co.jp/press/`, `prtimes.jp/companyrdf.php?company_id=19299`, `camp-fire.jp/news/feed.xml` |
| 캠프파이어 | 도움말센터 | `help.camp-fire.jp/sitemap.xml` lastmod |
| 공통 | 앱스토어 리뷰 (최신순 50건) | `itunes.apple.com/{kr|us}/rss/customerreviews/page=1/id={앱ID}/sortby=mostrecent/json` — 와디즈 1107828621, 킥스타터 596961532, 게임파운드 6504344271, 마쿠아케 1274816320(jp), 캠프파이어 1496301418(jp) |
| 공통 | 구글플레이 리뷰 (최신순) | `pip install google-play-scraper` → `reviews(앱, sort=Sort.NEWEST)` — com.markmount.wadiz, com.kickstarter.kickstarter, com.gamefound.app, com.ca_crowdfunding.makuake_android |
| 공통 | 앱 릴리즈노트, 채용, 외부 뉴스(최근 2일) | 각 baseline.md 참고 |

앱스토어 RSS가 0건을 돌려주는 날이 있다(애플 쪽 일시 현상, 2026-10-03 확인). 그날은 baseline을 그대로 두고 실패로 보고한다. RSS는 최신 50건을 주므로 다음 날 정상화되면 밀린 리뷰를 함께 잡는다. 앱스토어 웹 페이지는 최신순이 아니라 대체 소스로 쓰지 않는다.

리뷰 기록 규칙: 리뷰 1건 = 1행, 태그 수요, 확실도 외부. 원문발췌는 `[iOS|Android ★별점 v버전] 제목 — 본문` 150자 이내.

사이트 봇 차단으로 읽을 수 없는 곳: 와디즈 공지·메이커센터·메인, 킥스타터 메인·프레스, 게임파운드 메인·블로그 직접 접속.

## 매일 실행 순서
1. `bash competitors/tools/setup.sh` (헤드리스 브라우저 인증서 등록, 구글플레이 리뷰 도구 설치)
2. 회사별 `baseline.md`를 읽고, 위 소스 표의 방법으로 baseline 이후 새 항목만 찾는다. 차단된 사이트는 우회하지 않는다.
3. 사실 1개 = 1행으로 쪼개 각 `raw.md` 맨 아래에 추가한다. 기존 행은 수정·삭제하지 않는다. `history.md`는 건드리지 않는다.
4. `baseline.md`의 소스별 마지막 확인 ID/날짜를 갱신한다.
5. 매월 1일이면 `snapshots/YYYY-MM.md` 스냅샷도 저장한다.
6. 커밋 후 푸시한다.
7. 종료 메시지: 회사별 추가 행 수와 태그별 개수, 추가된 행 전체, 변화 없으면 "변화 없음 — baseline 그대로", 실패한 소스와 이유.
