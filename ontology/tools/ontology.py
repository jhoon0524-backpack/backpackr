#!/usr/bin/env python3
"""온톨로지 병합/렌더 도구.

사용법:
  python3 ontology/tools/ontology.py merge ontology/daily/2026-09-03.json
  python3 ontology/tools/ontology.py render
  python3 ontology/tools/ontology.py stats

merge 는 하루치 델타(delta)를 누적 그래프(ontology.json)에 합치고,
확신도(confidence)를 갱신하고, 오래된 항목을 stale 로 표시하고,
채널별 마지막 스캔 지점(state.json)을 기록합니다.
"""
import json
import sys
from datetime import date, datetime, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CONFIG = ROOT / "config.json"
GRAPH = ROOT / "ontology.json"
STATE = ROOT / "state.json"
VIEWS = ROOT / "views"

ENTITY_TYPE_ORDER = ["person", "team", "project", "product", "term",
                     "metric", "system", "policy", "partner", "decision", "issue"]
ENTITY_TYPES = set(ENTITY_TYPE_ORDER)
RELATION_TYPES = {"member_of", "leads", "owns", "part_of", "works_on", "uses",
                  "measures", "decided_by", "decided_in", "resolves",
                  "affects", "caused_by", "defines", "related_to"}

LEARN_RATE = 0.25
INITIAL_CONFIDENCE = 0.40


def load(path, default):
    if path.exists():
        return json.loads(path.read_text(encoding="utf-8"))
    return default


def save(path, data):
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def empty_graph():
    return {"version": 1, "updated_at": None, "entities": {},
            "relations": {}, "open_questions": []}


def rel_key(r):
    return f"{r['from']}|{r['type']}|{r['to']}"


def bump(conf):
    return round(conf + (1.0 - conf) * LEARN_RATE, 4)


def merge_evidence(existing, incoming, cap):
    seen = {(e.get("channel"), e.get("ts"), e.get("quote")) for e in existing}
    out = list(existing)
    for e in incoming:
        k = (e.get("channel"), e.get("ts"), e.get("quote"))
        if k not in seen:
            seen.add(k)
            out.append(e)
    # 최신 근거를 우선 보존
    out.sort(key=lambda e: e.get("date", ""), reverse=True)
    return out[:cap]


def validate_delta(delta, known_ids):
    errors = []
    if not delta.get("date"):
        errors.append("date 누락")
    for i, e in enumerate(delta.get("entities", [])):
        for f in ("id", "type", "name"):
            if not e.get(f):
                errors.append(f"entities[{i}]: {f} 누락")
        if e.get("type") not in ENTITY_TYPES:
            errors.append(f"entities[{i}]: 알 수 없는 type '{e.get('type')}'")
        if e.get("id") and not str(e["id"]).startswith(f"{e.get('type')}:"):
            errors.append(f"entities[{i}]: id 는 '{e.get('type')}:이름' 형태여야 합니다 ({e.get('id')})")
    ids = known_ids | {e["id"] for e in delta.get("entities", []) if e.get("id")}
    for i, r in enumerate(delta.get("relations", [])):
        for f in ("from", "type", "to"):
            if not r.get(f):
                errors.append(f"relations[{i}]: {f} 누락")
        if r.get("type") not in RELATION_TYPES:
            errors.append(f"relations[{i}]: 알 수 없는 type '{r.get('type')}'")
        for side in ("from", "to"):
            if r.get(side) and r[side] not in ids:
                errors.append(f"relations[{i}]: '{r[side]}' 는 아직 없는 엔티티입니다. "
                              f"entities 에 먼저 넣으세요.")
    return errors


def merge(delta_path):
    cfg = load(CONFIG, {})
    cap = cfg.get("max_evidence_per_item", 5)
    stale_days = cfg.get("stale_after_days", 90)

    graph = load(GRAPH, empty_graph())
    delta = json.loads(Path(delta_path).read_text(encoding="utf-8"))
    errors = validate_delta(delta, set(graph["entities"]))
    if errors:
        print("델타 검증 실패:")
        for e in errors:
            print("  -", e)
        return 1

    today = delta["date"]
    added_e = updated_e = added_r = updated_r = 0

    for e in delta.get("entities", []):
        cur = graph["entities"].get(e["id"])
        if cur is None:
            graph["entities"][e["id"]] = {
                "id": e["id"], "type": e["type"], "name": e["name"],
                "aliases": e.get("aliases", []),
                "summary": e.get("summary", ""),
                "attributes": e.get("attributes", {}),
                "confidence": INITIAL_CONFIDENCE,
                "mentions": 1,
                "first_seen": today, "last_seen": today, "state": "active",
                "evidence": merge_evidence([], e.get("evidence", []), cap),
            }
            added_e += 1
        else:
            if cur["last_seen"] != today:
                cur["confidence"] = bump(cur["confidence"])
            cur["mentions"] += 1
            cur["last_seen"] = today
            cur["state"] = "active"
            if e.get("summary"):
                cur["summary"] = e["summary"]
            for a in e.get("aliases", []):
                if a not in cur["aliases"] and a != cur["name"]:
                    cur["aliases"].append(a)
            cur["attributes"].update(e.get("attributes", {}))
            cur["evidence"] = merge_evidence(cur["evidence"], e.get("evidence", []), cap)
            updated_e += 1

    for r in delta.get("relations", []):
        k = rel_key(r)
        cur = graph["relations"].get(k)
        if cur is None:
            graph["relations"][k] = {
                "from": r["from"], "type": r["type"], "to": r["to"],
                "confidence": INITIAL_CONFIDENCE, "mentions": 1,
                "first_seen": today, "last_seen": today, "state": "active",
                "evidence": merge_evidence([], r.get("evidence", []), cap),
            }
            added_r += 1
        else:
            if cur["last_seen"] != today:
                cur["confidence"] = bump(cur["confidence"])
            cur["mentions"] += 1
            cur["last_seen"] = today
            cur["state"] = "active"
            cur["evidence"] = merge_evidence(cur["evidence"], r.get("evidence", []), cap)
            updated_r += 1

    # 오래 언급 없는 항목은 지우지 않고 stale 로만 표시
    cutoff = (datetime.strptime(today, "%Y-%m-%d") - timedelta(days=stale_days)).strftime("%Y-%m-%d")
    staled = 0
    for item in list(graph["entities"].values()) + list(graph["relations"].values()):
        if item["last_seen"] < cutoff and item["state"] != "stale":
            item["state"] = "stale"
            staled += 1

    # 미해결 질문: 답이 나온 것은 delta.resolved_questions 로 닫는다
    resolved = set(delta.get("resolved_questions", []))
    graph["open_questions"] = [q for q in graph["open_questions"] if q["q"] not in resolved]
    known = {q["q"] for q in graph["open_questions"]}
    for q in delta.get("open_questions", []):
        if q not in known:
            graph["open_questions"].append({"q": q, "asked_on": today})

    graph["updated_at"] = today
    save(GRAPH, graph)

    state = load(STATE, {"last_run": None, "channels": {}})
    for s in delta.get("scanned", []):
        state["channels"][s["channel_id"]] = {
            "name": s.get("channel"), "last_ts": s.get("last_ts"),
            "last_run": today, "messages": s.get("message_count", 0),
        }
    state["last_run"] = today
    save(STATE, state)

    print(f"[{today}] 엔티티 신규 {added_e} / 갱신 {updated_e}, "
          f"관계 신규 {added_r} / 갱신 {updated_r}, stale 처리 {staled}")
    print(f"누적: 엔티티 {len(graph['entities'])}개, 관계 {len(graph['relations'])}개, "
          f"미해결 질문 {len(graph['open_questions'])}개")
    return 0


TYPE_LABEL = {
    "person": "사람", "team": "조직", "project": "프로젝트", "product": "제품·기능",
    "term": "용어", "metric": "지표", "system": "시스템·툴", "policy": "정책·프로세스",
    "partner": "파트너", "decision": "의사결정", "issue": "이슈",
}
REL_LABEL = {
    "member_of": "소속", "leads": "리드", "owns": "담당", "part_of": "상위",
    "works_on": "참여", "uses": "사용", "measures": "측정", "decided_by": "결정자",
    "decided_in": "대상", "resolves": "해결", "affects": "영향", "caused_by": "원인",
    "defines": "정의", "related_to": "관련",
}


def badge(item, threshold):
    if item["state"] == "stale":
        return "🕸️ 오래됨"
    return "✅ 확정" if item["confidence"] >= threshold else "🟡 추정"


def render():
    cfg = load(CONFIG, {})
    threshold = cfg.get("confirmed_threshold", 0.75)
    graph = load(GRAPH, empty_graph())
    VIEWS.mkdir(exist_ok=True)
    ents = graph["entities"]
    rels = list(graph["relations"].values())

    def name_of(eid):
        return ents.get(eid, {}).get("name", eid.split(":", 1)[-1])

    by_type = {}
    for e in ents.values():
        by_type.setdefault(e["type"], []).append(e)

    # index.md
    lines = ["# 텀블벅 온톨로지 — 한눈에 보기", "",
             f"마지막 학습: **{graph.get('updated_at') or '아직 없음'}**  ",
             f"엔티티 {len(ents)}개 · 관계 {len(rels)}개", "",
             "> ✅ 확정 = 여러 번 확인됨 / 🟡 추정 = 아직 근거 부족 / 🕸️ 오래됨 = 90일 넘게 언급 없음", "",
             "## 종류별 개수", "", "| 종류 | 개수 | 확정 |", "|---|---:|---:|"]
    for t in ENTITY_TYPE_ORDER:
        items = by_type.get(t, [])
        if not items:
            continue
        conf = sum(1 for i in items if i["confidence"] >= threshold)
        lines.append(f"| {TYPE_LABEL[t]} | {len(items)} | {conf} |")
    lines += ["", "## 아직 모르는 것 (사람 확인 필요)", ""]
    if graph["open_questions"]:
        for q in graph["open_questions"][:30]:
            lines.append(f"- ({q['asked_on']}) {q['q']}")
    else:
        lines.append("- 없음")
    lines += ["", "## 상세 보기", "",
              "- [사람·조직](people.md)", "- [프로젝트·제품](projects.md)",
              "- [용어·지표](terms.md)", "- [의사결정 타임라인](decisions.md)",
              "- [이슈](issues.md)", ""]
    (VIEWS / "index.md").write_text("\n".join(lines), encoding="utf-8")

    def entity_block(e, out):
        out.append(f"### {e['name']}  <sub>{badge(e, threshold)} · {e['confidence']:.2f} · {e['mentions']}회</sub>")
        if e["aliases"]:
            out.append(f"- 다른 이름: {', '.join(e['aliases'])}")
        if e["summary"]:
            out.append(f"- {e['summary']}")
        for k, v in e["attributes"].items():
            out.append(f"- {k}: {v}")
        outgoing = [r for r in rels if r["from"] == e["id"]]
        incoming = [r for r in rels if r["to"] == e["id"]]
        for r in outgoing:
            out.append(f"- {REL_LABEL[r['type']]} → {name_of(r['to'])}")
        for r in incoming:
            out.append(f"- {name_of(r['from'])} ← {REL_LABEL[r['type']]}")
        for ev in e["evidence"][:2]:
            out.append(f"  - 근거: `#{ev.get('channel')}` {ev.get('date','')} \"{ev.get('quote','')}\"")
        out.append(f"- 최근 언급: {e['last_seen']} (처음: {e['first_seen']})")
        out.append("")

    def page(path, title, types, sort_key=None, reverse=False):
        out = [f"# {title}", ""]
        for t in types:
            items = by_type.get(t, [])
            if not items:
                continue
            out.append(f"## {TYPE_LABEL[t]} ({len(items)})")
            out.append("")
            items = sorted(items, key=sort_key or (lambda x: (-x["confidence"], x["name"])),
                           reverse=reverse)
            for e in items:
                entity_block(e, out)
        if len(out) == 2:
            out.append("_아직 학습된 내용이 없습니다._")
        (VIEWS / path).write_text("\n".join(out), encoding="utf-8")

    page("people.md", "사람 · 조직", ["person", "team"])
    page("projects.md", "프로젝트 · 제품 · 파트너", ["project", "product", "partner"])
    page("terms.md", "용어 · 지표 · 시스템 · 정책", ["term", "metric", "system", "policy"])
    page("decisions.md", "의사결정 타임라인",
         ["decision"], sort_key=lambda x: x["attributes"].get("date", x["first_seen"]), reverse=True)
    page("issues.md", "이슈",
         ["issue"], sort_key=lambda x: x["attributes"].get("first_reported", x["first_seen"]), reverse=True)

    print(f"뷰 생성 완료: {VIEWS}/index.md 외 5개")
    return 0


def stats():
    cfg = load(CONFIG, {})
    threshold = cfg.get("confirmed_threshold", 0.75)
    graph = load(GRAPH, empty_graph())
    ents = graph["entities"].values()
    print(f"마지막 학습: {graph.get('updated_at')}")
    print(f"엔티티 {len(graph['entities'])} (확정 {sum(1 for e in ents if e['confidence'] >= threshold)})")
    print(f"관계 {len(graph['relations'])}")
    print(f"미해결 질문 {len(graph['open_questions'])}")
    return 0


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        return 1
    cmd = sys.argv[1]
    if cmd == "merge":
        if len(sys.argv) < 3:
            print("사용법: ontology.py merge <델타파일.json>")
            return 1
        return merge(sys.argv[2])
    if cmd == "render":
        return render()
    if cmd == "stats":
        return stats()
    print(f"알 수 없는 명령: {cmd}")
    return 1


if __name__ == "__main__":
    sys.exit(main())
