---
type: entity
title: Obsidian
updated: 2026-08-01
sources:
  - 00_raw/karpathy-llm-wiki.md
related:
  - "[[LLM 위키]]"
  - "[[Andrej Karpathy]]"
  - "[[Karpathy LLM Wiki gist]]"
---

마크다운 파일을 읽고 링크를 따라다니는 앱. [[LLM 위키]] 패턴에서 사람이 위키를 **보는** 쪽 도구다. LLM이 쓰고, 사람은 여기서 읽는다.

> Obsidian is the IDE; the LLM is the programmer; the wiki is the codebase.
> — 00_raw/karpathy-llm-wiki.md

## 그래프뷰

원문은 그래프뷰를 **위키의 모양을 보는 가장 좋은 방법**으로 꼽는다. 무엇이 무엇과 연결됐는지, 어떤 페이지가 허브인지, 어떤 페이지가 고아인지 드러난다. `/lint`의 고아 페이지 점검과 같은 걸 눈으로 보는 셈이다.

## Web Clipper

웹 문서를 마크다운으로 변환하는 브라우저 확장. 원본 컬렉션에 소스를 빠르게 넣는 용도로 원문이 권한다. 이 저장소에서는 `00_raw/`에 저장하게 된다.

## 이미지 로컬 저장

원문이 적은 절차:

1. 설정 → Files and links → "Attachment folder path"를 고정 디렉토리로 지정 (원문 예시는 `raw/assets/`, 이 저장소는 `00_raw/assets/`).
2. 설정 → Hotkeys에서 "Download"를 검색해 **"Download attachments for current file"**을 찾아 단축키를 건다 (원문 예시 `Ctrl+Shift+D`).
3. 문서를 클리핑한 뒤 단축키를 누르면 이미지가 전부 로컬 디스크로 받아진다.

선택 사항이지만, LLM이 깨질 수 있는 URL에 의존하지 않고 이미지를 직접 보고 참조할 수 있게 된다.

**주의**: 원문에 따르면 LLM은 인라인 이미지가 있는 마크다운을 한 번에 읽지 못한다. 우회는 **텍스트를 먼저 읽고, 참조된 이미지를 따로 열어보는 것**이다. 원문 표현으로 "약간 투박하지만 충분히 잘 작동한다".

## 플러그인

- **Marp** — 마크다운 기반 슬라이드 덱 형식. Obsidian 플러그인이 있다. 위키 내용에서 바로 발표자료를 뽑는 용도.
- **Dataview** — 페이지 frontmatter에 질의를 돌리는 플러그인. LLM이 태그·날짜·소스 수 같은 YAML frontmatter를 붙여두면 동적 표와 목록을 생성할 수 있다.

이 저장소는 둘 다 쓰지 않기로 했다 (`CLAUDE.md`).

## 위키는 그냥 git 저장소다

원문의 마지막 팁: 위키는 마크다운 파일의 git 저장소일 뿐이라, 버전 히스토리·브랜치·협업이 공짜로 딸려온다.
