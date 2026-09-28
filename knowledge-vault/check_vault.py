"""Vault 규칙 검사기. CLAUDE.md 1장의 규칙 1~4 를 기계적으로 확인한다.

    python3 check_vault.py

오류가 있으면 종료 코드 1. 경고는 종료 코드에 영향을 주지 않는다.
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
VAULTS = ["Main_Vault", "LLM_Wiki_Vault"]
REQUIRED = ["type", "description", "created", "tags"]
LINK = re.compile(r"\[\[([^\]|#]+)(?:[#|][^\]]*)?\]\]")


def parse(text):
    """(frontmatter dict, 본문) 을 돌려준다. frontmatter 가 없으면 None."""
    lines = text.split("\n")
    if not lines or lines[0].strip() != "---":
        return None, text
    try:
        end = lines[1:].index("---") + 1
    except ValueError:
        return None, text
    fm, key = {}, None
    for line in lines[1:end]:
        m = re.match(r"^([A-Za-z_]+):\s*(.*)$", line)
        if m:
            key, value = m.group(1), m.group(2).strip()
            if value.startswith("[") and value.endswith("]"):
                fm[key] = [v.strip().strip("\"'") for v in value[1:-1].split(",") if v.strip()]
            else:
                fm[key] = value.strip("\"'")
        elif key and re.match(r"^\s+-\s+", line):
            if not isinstance(fm.get(key), list):
                fm[key] = []
            fm[key].append(re.sub(r"^\s+-\s+", "", line).strip().strip("\"'"))
    return fm, "\n".join(lines[end + 1:])


def load(vault):
    docs = {}
    for path in sorted(vault.rglob("*.md")):
        parts = path.relative_to(vault).parts
        if "Templates" in parts or any(p.startswith(".") for p in parts):
            continue
        fm, body = parse(path.read_text(encoding="utf-8"))
        body = re.sub(r"`[^`\n]*`", "", body)  # 코드 표기 안의 예시 링크는 세지 않는다
        docs[path.stem] = (path, fm, {l.strip() for l in LINK.findall(body)})
    return docs


def check_vault(docs, all_docs):
    """docs: 이 Vault 문서. all_docs: 두 Vault 전체 (승인으로 옮겨 간 카드도 링크 수에 센다)."""
    errors, warnings = [], []

    for name, (path, fm, links) in docs.items():
        rel = path.relative_to(ROOT)
        if fm is None:
            errors.append(f"{rel}: frontmatter 가 없다")
            continue
        for key in REQUIRED:
            if not fm.get(key):
                errors.append(f"{rel}: 필수 필드 '{key}' 가 비어 있다")
        tags = fm.get("tags") if isinstance(fm.get("tags"), list) else []
        for tag in tags:
            if tag.lstrip("#")[:1].isdigit():
                errors.append(f"{rel}: 태그 '{tag}' 가 숫자로 시작한다")

        for target in sorted(links - docs.keys()):
            warnings.append(f"{rel}: [[{target}]] 문서가 이 Vault 에 없다")

        if fm.get("type") == "wiki_card":
            cards = [t for t in links if t != name and (all_docs.get(t, (0, None))[1] or {}).get("type") in ("wiki_card", "note")]
            if len(cards) < 2:
                errors.append(f"{rel}: 다른 카드로 가는 링크가 {len(cards)}개다 (2개 이상 필요)")
            for t in cards:
                if name not in all_docs[t][2]:
                    warnings.append(f"{rel} → [[{t}]]: 상대 문서에 되돌아오는 링크가 없다")
    return len(docs), errors, warnings


def main():
    loaded = {v: load(ROOT / v) for v in VAULTS}
    all_docs = {k: d for docs in loaded.values() for k, d in docs.items()}
    total_errors = 0
    for v in VAULTS:
        count, errors, warnings = check_vault(loaded[v], all_docs)
        print(f"[{v}] 문서 {count}개 · 오류 {len(errors)} · 경고 {len(warnings)}")
        for e in errors:
            print(f"  오류  {e}")
        for w in warnings:
            print(f"  경고  {w}")
        total_errors += len(errors)
    sys.exit(1 if total_errors else 0)


if __name__ == "__main__":
    main()
