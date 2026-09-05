# 텀블벅 PO 팀 정보

PO팀 멤버의 Jira / Slack 정보. 담당자 멘션·티켓 어사인·커뮤니케이션 자동화 시 참조.

> 업데이트 시점: 2026-07-08
> 현재 PO 공석. 신장훈·승민석 공동 담당.

## 멤버

| 이름 | 역할 | Jira Account ID | Slack User ID |
|------|------|-----------------|---------------|
| 신장훈 | 텀블벅 PO(공동 담당) | 712020:80658260-c243-48c0-afdd-a6624d4ad927 | [확인 필요] |
| 승민석 | 텀블벅 PO(공동 담당) | 712020:82c2b852-11bc-48ff-aa32-42db0790beb3 | [확인 필요] |

> PO 정규 배치 전까지 두 명이 공동 담당. 정식 PO 합류 시 본 표 갱신.

## 팀 Slack 채널

| 채널 | 용도 | 비고 |
|------|------|------|
| `#g_tbb_product` | **PO팀 공식 팀 채널** (= "우리 채널" / "팀 채널") | Channel ID·webhook은 `.credentials/`(gitignore) |

> "우리 채널"·"팀 채널" = `#g_tbb_product`. Slack 발송 webhook은 `.credentials/slack-webhook.txt`.

## Jira

| 항목 | 값 |
|------|------|
| 사이트 | https://backpackr.atlassian.net |
| Cloud ID | `15d8ed5f-0a79-4a4e-9f77-92675c8ad157` |
| 프로젝트 | **TBB** (id 10100, "텀블벅", 레거시·현행 에픽 키) / **TBB2** (id 10218, "Tumblbug", 신규) |

> ⚠️ 신규 티켓/에픽을 TBB2 기준으로 낼지 TBB 유지인지는 담당자 확인 후 확정(현행 로드맵 에픽 키는 TBB).

## 로드맵 시트

| 항목 | 값 |
|------|------|
| 시트 ID | `1342-_IWlY18pnUgX-W8geU8nzWIgWsthfeKyuZNk37U` (gid 437073290) |
| 데이터 도구 | Superset `superset.tumblbug.com` |

## 사용 가이드

- **Jira 어사인/멘션**: `accountId` 사용 (`assignee`, `[~accountid:...]`)
- **Slack 멘션**: `<@USER_ID>` 형식
- **PRD `팀 구성원` 섹션**: 이름 + Jira accountId·Slack ID 병기해 자동화 가능하게 유지
