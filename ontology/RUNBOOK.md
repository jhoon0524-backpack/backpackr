# 데일리 학습 런북

매일 아침 자동으로 도는 에이전트가 **이 문서 그대로** 실행합니다.
사람이 손으로 돌릴 때도 이 순서를 따르면 됩니다.

---

## 0. 준비

```bash
cd <저장소 루트>
git fetch origin claude/ontology-auto-learning-ol70ac
git checkout claude/ontology-auto-learning-ol70ac
git pull origin claude/ontology-auto-learning-ol70ac
cat ontology/SCHEMA.md            # 규칙 (반드시 먼저 읽는다)
cat ontology/config.json          # 스캔 대상 채널
cat ontology/state.json           # 채널별 마지막 스캔 지점 (없으면 첫 실행)
cat ontology/corrections.md       # 사람이 남긴 정정 지시
python3 ontology/tools/ontology.py stats
```

## 1. 사람이 남긴 정정 먼저 반영

`ontology/corrections.md` 에 처리되지 않은 항목이 있으면 **그것부터** 델타에 반영합니다.
반영한 항목은 `- [x]` 로 체크하고 처리한 날짜를 적습니다.
사람의 정정은 슬랙에서 추론한 내용보다 **항상 우선**합니다. 정정으로 만든 엔티티는
델타에서 `"attributes": {"source": "human-correction"}` 을 붙입니다.

## 2. 슬랙 스캔

`config.json` 의 `enabled: true` 채널을 모두 훑습니다.

- 각 채널마다 `slack_read_channel(channel_id, oldest=<state.json의 last_ts, 없으면 lookback_days 전>, limit=<max_messages_per_channel>)`
- 의미 있는 스레드는 `slack_read_thread` 로 결론까지 확인합니다.
  (특히 `talk_red_light`, `tbb_119`, `ts_topic-data` 는 스레드에 결론이 있습니다)
- 봇 메시지·단순 알림·이모지 반응만 있는 메시지는 건너뜁니다.
- 채널을 다 읽었으면 그 채널에서 **가장 최근 메시지의 ts** 를 기록해 둡니다 (다음 실행의 시작점).

읽기 실패한 채널은 무시하고 넘어가되, 어떤 채널이 실패했는지 기록합니다.

## 3. 엔티티·관계 추출

`SCHEMA.md` 의 타입만 사용합니다. 판단 기준:

**엔티티로 만든다**
- 두 사람 이상이 이름을 언급하며 이야기한 프로젝트·제품·지표·용어
- 결론이 난 의사결정 (누가, 언제, 무엇을, 왜)
- 두 번 이상 나온 문제, 또는 한 번이라도 나온 장애·사고

**엔티티로 만들지 않는다**
- 잡담, 농담, 인사, 점심 메뉴
- 개인 평가·인사·급여·건강 정보
- 한 번 스쳐 지나간 고유명사

**id 규칙이 가장 중요합니다.** 이미 `ontology.json` 에 있는 대상이면
**반드시 기존 id 를 그대로 씁니다.** 표기가 달라도(텀블벅/tbb/TBB) 같은 대상이면
기존 id 를 쓰고 새 표기는 `aliases` 에 넣습니다. 이것이 지식이 쌓이는 유일한 방법입니다.

확실하지 않으면 엔티티를 만들지 말고 `open_questions` 에 질문으로 남깁니다.
지난 `open_questions` 중 이번에 답을 찾은 것은 `resolved_questions` 에 넣습니다.

## 4. 델타 파일 작성

`ontology/daily/YYYY-MM-DD.json` 으로 저장합니다.

```json
{
  "date": "2026-09-03",
  "scanned": [
    { "channel_id": "C05BXDGPKUZ", "channel": "g_cell_tbb_marketing",
      "last_ts": "1756900000.123456", "message_count": 24 }
  ],
  "entities": [ /* SCHEMA.md 형식. confidence/mentions/state 는 쓰지 않습니다 (도구가 계산) */ ],
  "relations": [ /* from/type/to/evidence 만 */ ],
  "open_questions": ["..."],
  "resolved_questions": ["..."],
  "notes": "그날의 흐름을 3~6줄로. 사업총괄이 읽을 요약."
}
```

## 5. 병합 + 렌더

```bash
python3 ontology/tools/ontology.py merge ontology/daily/$(date +%F).json
python3 ontology/tools/ontology.py render
```

검증 실패가 나오면 델타를 고쳐서 다시 돌립니다. **실패한 채로 커밋하지 않습니다.**

## 6. 사람용 일일 요약 작성

`ontology/daily/YYYY-MM-DD.md` 에 한국어로 씁니다. 형식:

```markdown
# 2026-09-03 학습 요약

## 오늘의 흐름
(3~6줄. 사업총괄 관점에서 무슨 일이 벌어졌는지)

## 새로 알게 된 것
- (엔티티/관계 신규 항목 중 의미 있는 것만 5개 이내)

## 결정된 것
- (decision 엔티티. 없으면 "없음")

## 지켜볼 이슈
- (issue 엔티티 중 open/recurring)

## 확인 필요
- (open_questions)
```

## 7. 커밋 & 푸시

```bash
git add ontology/
git commit -m "chore(ontology): $(date +%F) 슬랙 학습 반영"
git push -u origin claude/ontology-auto-learning-ol70ac
```

커밋 메시지에 슬랙 원문을 넣지 않습니다.

## 8. 마무리 보고

한국어로 3줄 이내 요약: 스캔한 채널 수 / 신규 엔티티·관계 수 / 확인 필요한 질문.
새 엔티티도 없고 결정도 없으면 "특이사항 없음" 한 줄이면 충분합니다.
