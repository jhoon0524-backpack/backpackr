---
type: meta
title: "Guide"
created: 2026-09-28
updated: 2026-09-28
tags:
  - system/meta
class: 000_Meta
description: "Vault 전체의 메타데이터 필드, 태그 체계, 분류 규칙 정의서"
---

# Guide — 규칙 및 메타데이터 정의서

## 1. Frontmatter 필드

| 필드 | 필수 | 설명 | 예시 |
|---|---|---|---|
| `type` | ✅ | 문서 종류 (아래 2장) | `wiki_card` |
| `description` | ✅ | 핵심 요약 1~2문장. AI 가 문서를 고를 때 이것만 읽는다 | `"원자적 노트의 정의와 장점"` |
| `created` | ✅ | 만든 날짜 `YYYY-MM-DD` | `2026-09-28` |
| `tags` | ✅ | 태그 목록 (아래 3장) | `- topic/ai` |
| `title` |  | 문서 제목 | `"Atomic Notes"` |
| `updated` |  | 마지막 수정 날짜 | `2026-09-28` |
| `class` |  | 분류 폴더 (아래 4장) | `100_Research` |
| `session_link` |  | 출처 원문 링크 | `"[[2026-09-28_회의_전사본]]"` |

## 2. type 값

| 값 | 뜻 | 위치 |
|---|---|---|
| `source` | 가공 전 원문 (전사본·아티클·메모) | `LLM_Wiki_Vault/00_Inbox/` |
| `wiki_card` | AI 가 만든 개념 카드 | `LLM_Wiki_Vault/LLM_Wiki/` |
| `note` | 사람이 승인한 확정 지식 | `Main_Vault/100~900_*/` |
| `meta` | 시스템 파일 (목차·규칙) | `000_Meta/` |

## 3. 태그 체계

- 형식: `분류/값` (Obsidian 중첩 태그). **숫자로 시작하지 않는다.**
- 새 분류가 필요하면 이 표에 먼저 추가한다.

| 분류 | 값 예시 | 용도 |
|---|---|---|
| `status/` | `draft`, `approved` | 검수 상태. 모든 카드에 하나만 |
| `topic/` | `ai`, `business`, `crowdfunding` | 주제 |
| `source/` | `voice`, `article`, `memo` | 인풋 종류 |
| `system/` | `meta` | 시스템 파일 |

## 4. 분류 체계 (DDC 기반 class)

| class | 내용 |
|---|---|
| `000_Meta` | 시스템 파일, 템플릿, 규칙 |
| `100_Research` | 학술, 리서치, 스터디 |
| `200_Projects` | 실행 중인 프로젝트 |
| `600_Resources` | 자산 및 참조 자료 |
| `900_Personas` | 역할별 페르소나/전담 서브 에이전트 |
