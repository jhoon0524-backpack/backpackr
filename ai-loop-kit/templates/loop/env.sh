# =========================================
# 자율 루프 설정 (loop/env.sh)
# 루프를 켜기 전에 여기 숫자만 바꾸면 됩니다.
# (실행할 때 환경변수로 잠깐 바꿔 끼울 수도 있습니다.
#  예: MAX_LOOPS=2 bash loop/loop.sh)
# =========================================

# 사용할 모델 (작업자. 채점자는 .claude/agents/design-critic.md 에서 fable 로 지정)
MODEL="${MODEL:-claude-opus-5}"

# 한 바퀴(세션 하나)에서 허용하는 최대 턴 수
MAX_TURNS="${MAX_TURNS:-40}"

# 바퀴 사이 대기 시간 (초)
SLEEP_BETWEEN="${SLEEP_BETWEEN:-30}"

# 최대 바퀴 수 (0 = 무제한)
MAX_LOOPS="${MAX_LOOPS:-0}"

# 1 이면 클로드를 실제로 부르지 않고 루프 구조만 점검 (테스트용)
DRY_RUN="${DRY_RUN:-0}"

# 헤드리스 세션의 권한 모드
# acceptEdits = 파일 수정은 자동 허용, 위험한 명령은 건너뜀 (권장 기본값)
# 완전 무인 실행이 필요하면 claude 문서의 다른 권한 모드를 확인 후 본인 판단으로 변경
PERMISSION_MODE="${PERMISSION_MODE:-acceptEdits}"
