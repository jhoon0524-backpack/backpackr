# 온톨로지 스키마

이 문서는 온톨로지에 "무엇을" 담을지 정한 규칙입니다.
매일 도는 학습 에이전트는 이 규칙만 따릅니다. 규칙을 바꾸면 학습 결과가 바뀝니다.

## 1. 엔티티(Entity) — 지식의 '점'

| type | 뜻 | id 예시 |
|---|---|---|
| `person` | 구성원 | `person:김민수` |
| `team` | 그룹/유닛/셀/TF | `team:텀블벅-마케팅셀` |
| `project` | 프로젝트·TF성 과제 | `project:소상공인지원사업` |
| `product` | 서비스·제품·기능 | `product:텀블벅-프리오더` |
| `term` | 사내 용어·약어 | `term:BOC` |
| `metric` | 지표 | `metric:GMV` |
| `system` | 시스템·툴 | `system:Jira` |
| `policy` | 정책·규정·프로세스 | `policy:계약검토-프로세스` |
| `partner` | 외부 파트너·업체 | `partner:텐바이텐` |
| `decision` | 의사결정 (날짜가 핵심) | `decision:2026-09-01-프리오더-정책변경` |
| `issue` | 이슈·장애·반복되는 문제 | `issue:결제실패-급증` |

### 엔티티 필드

```json
{
  "id": "project:소상공인지원사업",
  "type": "project",
  "name": "텀블벅 소상공인 지원사업",
  "aliases": ["소상공인 지원", "소공인 프로젝트"],
  "summary": "한 문단 이하. 무엇이고 왜 하는지.",
  "attributes": { "status": "진행중", "period": "2026 H2" },
  "confidence": 0.4,
  "mentions": 1,
  "first_seen": "2026-09-03",
  "last_seen": "2026-09-03",
  "state": "active",
  "evidence": [
    { "channel": "g_cell_tbb_outreach", "ts": "1756...", "date": "2026-09-02",
      "permalink": "https://...", "quote": "근거가 된 발언 한 줄" }
  ]
}
```

- `id`는 `type:이름` 형태. **한 번 정해지면 바꾸지 않습니다.** 이름이 바뀌면 `aliases`에 옛 이름을 넣습니다.
- `decision` / `issue`는 `attributes`에 아래를 넣습니다.
  - `decision`: `date`(결정일), `status`(`decided`|`reversed`|`superseded`), `rationale`(왜)
  - `issue`: `first_reported`, `status`(`open`|`resolved`|`recurring`), `severity`(`high`|`mid`|`low`)

## 2. 관계(Relation) — 지식의 '선'

| type | from → to | 뜻 |
|---|---|---|
| `member_of` | person → team | 소속 |
| `leads` | person → team\|project | 총괄/리드 |
| `owns` | person\|team → project\|product\|metric\|system | 담당·오너십 |
| `part_of` | team → team, product → product | 상위-하위 |
| `works_on` | person → project | 참여 |
| `uses` | team\|project → system | 사용 |
| `measures` | metric → product\|project | 무엇을 재는 지표인지 |
| `decided_by` | decision → person\|team | 누가 결정 |
| `decided_in` | decision → project\|team\|product | 무엇에 대한 결정 |
| `resolves` | decision → issue | 이 결정이 이 이슈를 해결 |
| `affects` | decision\|issue → any | 영향 범위 |
| `caused_by` | issue → any | 원인 |
| `defines` | term → any | 이 용어가 가리키는 대상 |
| `related_to` | any → any | 위에 안 맞을 때만 (남발 금지) |

```json
{
  "from": "person:김민수", "type": "leads", "to": "project:소상공인지원사업",
  "confidence": 0.4, "mentions": 1,
  "first_seen": "2026-09-03", "last_seen": "2026-09-03", "state": "active",
  "evidence": [ { "channel": "...", "date": "...", "quote": "..." } ]
}
```

## 3. 확신도(confidence) — '스스로 학습'의 핵심

숫자를 사람이 손댈 필요는 없습니다. 병합 도구가 자동 계산합니다.

- 처음 발견: `0.40`
- 다른 날/다른 채널에서 또 확인될 때마다: `c ← c + (1 - c) × 0.25`
  (1회 0.40 → 2회 0.55 → 3회 0.66 → 5회 0.81 → 8회 0.92)
- `0.75` 이상 = **확정(confirmed)**. Q&A에서 근거로 써도 되는 수준.
- `0.75` 미만 = **추정(tentative)**. 답변 시 "추정"이라고 밝혀야 합니다.
- 90일 넘게 언급이 없으면 `state: "stale"`. **삭제하지 않습니다** (과거 사실도 지식입니다).

## 4. 하지 말 것

- 원문 메시지 전체를 복사해 저장하지 않습니다. `quote`는 한 줄(120자 이내)까지만.
- 개인 평가·인사·급여·건강 등 민감 정보는 엔티티로 만들지 않습니다.
- 확실하지 않은 것을 단정해 적지 않습니다. 모르면 `open_questions`에 질문으로 남깁니다.
- 잡담에서 나온 농담·별명을 `term`으로 만들지 않습니다.
