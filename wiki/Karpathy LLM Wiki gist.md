---
type: source
title: Karpathy LLM Wiki gist
updated: 2026-08-01
sources:
  - 00_raw/karpathy-llm-wiki.md
related:
  - "[[LLM 위키]]"
  - "[[RAG]]"
  - "[[Memex]]"
  - "[[Obsidian]]"
  - "[[Andrej Karpathy]]"
---

[[Andrej Karpathy]]가 공개한 gist "LLM Wiki". LLM으로 개인 지식베이스를 만드는 패턴을 서술한다. 이 저장소의 구조가 여기서 나왔다.

- 원문: `00_raw/karpathy-llm-wiki.md`
- 출처: https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f
- 클리핑: 2026-08-01

## 문서의 성격

저자가 명시하는 바로, 이건 **"아이디어 파일"**이다. 각자의 LLM 에이전트(Codex, Claude Code, OpenCode/Pi 등)에 붙여넣도록 설계됐다. 고수준 아이디어를 전달하는 게 목적이고, 구체는 에이전트와 사람이 협업해서 만들어낸다.

문서 말미에서 저자는 이 문서가 **의도적으로 추상적**이라고 다시 못박는다. 정확한 디렉토리 구조, 스키마 규약, 페이지 형식, 툴링은 전부 도메인·취향·LLM 선택에 달렸다. 언급된 모든 것은 선택적·모듈식이며, 쓸 만한 것만 고르고 나머지는 무시하라고 한다. "The document's only job is to communicate the pattern."

## 내용 구성

| 절 | 내용 | 페이지 |
|---|---|---|
| The core idea | [[RAG]]와의 대비, 누적되는 산출물로서의 위키 | [[LLM 위키]], [[RAG]] |
| Architecture | 원본 / 위키 / 스키마 3레이어 | [[LLM 위키]] |
| Operations | ingest / query / lint | [[LLM 위키]] |
| Indexing and logging | index.md는 내용 지향, log.md는 시간 지향 | [[LLM 위키]] |
| Optional: CLI tools | qmd 등 위키 검색 엔진 | [[LLM 위키]] |
| Tips and tricks | Web Clipper, 이미지 로컬 저장, 그래프뷰, Marp, Dataview, git | [[Obsidian]] |
| Why this works | 병목은 읽기·사고가 아니라 부기 | [[LLM 위키]] |
| Note | 부시의 Memex와의 계보 | [[Memex]] |

## 인용해둘 문장

> The tedious part of maintaining a knowledge base is not the reading or the thinking — it's the bookkeeping.

> Humans abandon wikis because the maintenance burden grows faster than the value.

> The human's job is to curate sources, direct the analysis, ask good questions, and think about what it all means. The LLM's job is everything else.

## 원문 취득에 관한 단서

`00_raw/karpathy-llm-wiki.md`는 gist **페이지**를 마크다운으로 변환해 저장한 것이다. raw URL(`gist.githubusercontent.com`)과 GitHub API가 이 환경의 프록시에서 차단돼 원본 파일을 직접 받지 못했다. 본문·링크·구조는 보존됐지만 원본과 바이트 단위로 동일하지는 않다.
