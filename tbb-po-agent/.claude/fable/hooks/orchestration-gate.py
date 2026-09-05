#!/usr/bin/env python3
"""fable 강제 게이트 (PreToolUse) — tbb-po-agent 맞춤판.

1. 보호 경로 (fable on/off 무관, 서브에이전트 포함 항상 차단):
   - sources/      회사 repo 로컬 클론 심링크 — 읽기 전용. 파일 내용 수정 금지
                   (git pull 등 repo 동기화 명령은 허용)
   - .credentials/ 시크릿 — 읽기만 허용, 쓰기 금지
2. 오케스트레이션 게이트 (fable on일 때, 메인 에이전트만):
   - 한 턴(prompt_id)에 코드 파일 2개까지만 직접 수정 허용, 3개째부터 차단·위임 지시
   - Bash를 통한 코드 파일 수정(sed -i, 리다이렉트 등)은 항상 차단
   - 서브에이전트(payload에 agent_id/agent_type 존재)는 통과 — 위임이 실행 경로다
   - 마크다운·JSON·YAML 등 문서/설정 파일은 제한하지 않음 (PO 산출물)

오류 시 fail-open(통과) — 게이트 버그가 세션을 마비시키지 않게 한다.
"""

import fcntl
import json
import os
import re
import sys
import time

LIMIT = 2  # 메인 에이전트가 턴당 직접 수정할 수 있는 코드 파일 수

CODE_EXTENSIONS = (
    ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs",
    ".py", ".sh", ".zsh", ".bash",
    ".swift", ".kt", ".java", ".c", ".cpp", ".h", ".hpp",
    ".rs", ".go", ".rb",
)

WRITE_TOOLS = {"Write", "Edit", "MultiEdit", "NotebookEdit"}

HOOK_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.abspath(os.path.join(HOOK_DIR, "..", "..", ".."))
STATE_DIR = os.path.join(HOOK_DIR, "..", "state")
STATE_TTL_SECONDS = 24 * 60 * 60

# 읽기 전용 보호 경로 (repo 루트 기준 상대 경로, 항상 차단)
PROTECTED_DIRS = ("sources", ".credentials")

# Bash 우회 경로: sed -i / perl -i / 리다이렉트(> >>) / tee 가 코드 파일을 향하는 경우
_ext_pattern = "|".join(ext.lstrip(".") for ext in CODE_EXTENSIONS)
BASH_WRITE_PATTERNS = [
    re.compile(r"\bsed\b[^|;&]*-i[^|;&]*\.(%s)\b" % _ext_pattern),
    re.compile(r"\bperl\b[^|;&]*-i[^|;&]*\.(%s)\b" % _ext_pattern),
    re.compile(r">{1,2}\s*\S+\.(%s)\b" % _ext_pattern),
    re.compile(r"\btee\b(\s+-a)?\s+\S+\.(%s)\b" % _ext_pattern),
]

# Bash로 보호 경로 내용을 변경하는 패턴 (rm / mv·cp 목적지 / in-place 편집 / 리다이렉트·tee)
# `.credentials`는 `.`으로 시작해 \b가 성립하지 않으므로 zero-width lookbehind로 경계를 잡는다
_prot = r"(?<![\w.-])(?:sources|\.credentials)/"
BASH_PROTECTED_PATTERNS = [
    re.compile(r"\brm\b[^|;&]*" + _prot),
    re.compile(r"\bsed\b[^|;&]*-i[^|;&]*" + _prot),
    re.compile(r"\bperl\b[^|;&]*-i[^|;&]*" + _prot),
    re.compile(r">{1,2}\s*\S*" + _prot),
    re.compile(r"\btee\b(\s+-a)?\s+\S*" + _prot),
    # mv/cp는 마지막 인자(목적지)가 보호 경로인 경우만
    re.compile(r"\b(?:mv|cp)\b[^|;&]+\s\S*" + _prot + r"\S*\s*(?:$|[|;&])"),
]


def allow():
    sys.exit(0)


def deny(message):
    sys.stderr.write(message)
    sys.exit(2)


def gate_state():
    path = os.path.join(STATE_DIR, "fable-state")
    try:
        with open(path) as f:
            return f.read().strip()
    except OSError:
        return "on"  # 상태 파일이 없으면 켜진 것으로 본다 (설치 = 옵트인)


def is_code_file(path):
    return path.lower().endswith(CODE_EXTENSIONS)


def is_protected_path(file_path, cwd):
    """file_path가 repo의 sources/ 또는 .credentials/ 하위인지 (심링크 해석 전, 문자열 기준)."""
    if not file_path:
        return False
    if not os.path.isabs(file_path):
        file_path = os.path.join(cwd or REPO_ROOT, file_path)
    file_path = os.path.normpath(file_path)
    for name in PROTECTED_DIRS:
        root = os.path.join(REPO_ROOT, name)
        if file_path == root or file_path.startswith(root + os.sep):
            return True
    return False


def prune_stale_state(now):
    try:
        for name in os.listdir(STATE_DIR):
            if not name.startswith("turn-"):
                continue
            full = os.path.join(STATE_DIR, name)
            if now - os.path.getmtime(full) > STATE_TTL_SECONDS:
                os.remove(full)
    except OSError:
        pass


def load_turn(session_id):
    path = os.path.join(STATE_DIR, "turn-%s.json" % session_id)
    try:
        with open(path) as f:
            return json.load(f), path
    except (OSError, ValueError):
        return {"prompt_id": None, "files": []}, path


def save_turn(path, turn):
    os.makedirs(STATE_DIR, exist_ok=True)
    tmp = path + ".tmp"
    with open(tmp, "w") as f:
        json.dump(turn, f)
    os.replace(tmp, path)


def main():
    data = json.load(sys.stdin)

    tool_name = data.get("tool_name", "")
    tool_input = data.get("tool_input") or {}
    cwd = data.get("cwd", "")

    # ── 1. 보호 경로 — fable on/off·에이전트 종류와 무관하게 항상 차단 ──
    if tool_name in WRITE_TOOLS:
        file_path = tool_input.get("file_path") or tool_input.get("notebook_path") or ""
        if is_protected_path(file_path, cwd):
            deny(
                "BLOCKED: [fable 게이트] sources/(회사 repo 로컬 클론)와 .credentials/는 "
                "읽기 전용입니다. 코드 변경 제안은 tbb-po-agent 문서(PRD·code-map)에 "
                "기록하고, repo 갱신은 git pull로 하세요."
            )
    if tool_name == "Bash":
        command = tool_input.get("command", "")
        for pattern in BASH_PROTECTED_PATTERNS:
            if pattern.search(command):
                deny(
                    "BLOCKED: [fable 게이트] Bash로 sources/ 또는 .credentials/ 하위를 "
                    "변경하는 명령은 차단됩니다. 두 경로는 읽기 전용입니다 "
                    "(git pull 등 repo 동기화는 허용)."
                )

    # ── 2. 오케스트레이션 게이트 (fable on, 메인 에이전트만) ──
    if gate_state() != "on":
        allow()

    # 서브에이전트는 게이트 대상이 아님 — 위임이 실행 경로다
    if data.get("agent_id") or data.get("agent_type"):
        allow()

    if tool_name == "Bash":
        command = tool_input.get("command", "")
        for pattern in BASH_WRITE_PATTERNS:
            if pattern.search(command):
                deny(
                    "BLOCKED: [fable 게이트] Bash로 코드 파일을 수정하는 우회 경로는 "
                    "차단됩니다. 코드 수정은 서브에이전트(executor/deep-reasoner)에 "
                    "위임하세요."
                )
        allow()

    if tool_name not in WRITE_TOOLS:
        allow()

    file_path = tool_input.get("file_path") or tool_input.get("notebook_path") or ""
    if not is_code_file(file_path):
        allow()  # 마크다운·JSON·YAML 등 설정/문서 파일은 제한하지 않음

    prompt_id = data.get("prompt_id")
    session_id = data.get("session_id")
    if not prompt_id or not session_id:
        allow()  # 턴 경계를 알 수 없으면 통과 (fail-open)

    now = time.time()
    prune_stale_state(now)

    # 한 응답의 병렬 도구 호출이 카운터를 동시에 읽고 전부 통과하지 않도록
    # read-modify-write 구간을 flock으로 직렬화한다
    os.makedirs(STATE_DIR, exist_ok=True)
    with open(os.path.join(STATE_DIR, "lock"), "w") as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)

        turn, path = load_turn(session_id)
        if turn.get("prompt_id") != prompt_id:
            turn = {"prompt_id": prompt_id, "files": []}  # 새 턴 — 카운터 리셋

        if file_path in turn["files"]:
            allow()  # 같은 파일 재수정은 개수에 세지 않음

        if len(turn["files"]) >= LIMIT:
            deny(
                "BLOCKED: [fable 게이트] 이번 턴에 메인 에이전트가 직접 수정한 코드 "
                "파일이 이미 %d개입니다. 추가 코드 수정은 서브에이전트"
                "(executor/deep-reasoner)에 위임하세요." % LIMIT
            )

        turn["files"].append(file_path)
        save_turn(path, turn)
    allow()


if __name__ == "__main__":
    try:
        main()
    except SystemExit:
        raise
    except Exception:
        sys.exit(0)  # fail-open
