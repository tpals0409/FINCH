#!/usr/bin/env bash
# 프론트 파트 검사. CI 와 로컬이 같은 목록을 쓰도록 여기 한 곳에만 정의한다.
# 사용법: frontend/scripts/check.sh
set -euo pipefail

# 어디서 실행해도 frontend/ 를 기준으로 돌게 한다.
cd "$(dirname "$0")/.."

# 의존성이 없으면 각 도구가 command not found 로 죽는다. 먼저 알려주고 끝낸다.
if [ ! -d node_modules ]; then
  echo "✗ node_modules 가 없습니다." >&2
  echo "  먼저 실행하세요:" >&2
  echo "    cd frontend && npm ci" >&2
  exit 1
fi

# 싼 것부터 돌리고 첫 실패에서 멈춘다.
# 포맷이 깨진 채로 몇 분짜리 빌드까지 가는 것은 낭비다.
step() {
  local name=$1
  shift
  printf '\n▶ %s\n' "$name"
  if "$@"; then
    printf '  ✓ %s\n' "$name"
  else
    printf '\n✗ 실패: %s\n' "$name" >&2
    exit 1
  fi
}

step "포맷"     npm run format:check
step "린트"     npm run lint
step "타입"     npm run typecheck
step "빌드"     npm run build

printf '\n✓ 전체 통과\n'
