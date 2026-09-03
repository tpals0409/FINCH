#!/usr/bin/env bash
#
# 원본 TTF → 서브셋 WOFF2 변환. 산출물은 public/fonts/*.woff2 다.
#
#   ./fonts-src/build.sh
#
# 선행 조건: pyftsubset (fonttools) + brotli.
#   시스템 파이썬이 PEP 668 로 pip install 을 막으면 venv 로:
#     python3 -m venv fonts-src/.venv && fonts-src/.venv/bin/pip install fonttools brotli
#   build.sh 는 fonts-src/.venv/bin/pyftsubset 이 있으면 그걸 먼저 쓴다.
#
# 왜 원본을 그대로 서빙하지 않나 — Gmarket Sans TTF 는 한 굵기에 2.3MB 다. public/ 에 그대로 두면
# Vite 가 dist 로 통째로 복사해 모바일에서 7MB 를 받게 된다. 원본은 서빙되지 않는 이 디렉터리에
# 보관하고, 필요한 글자만 뽑아 WOFF2 로 압축한 것만 public/fonts/ 로 내보낸다.
#
# 원본: 핀로그 front/fonts-src/build.sh 를 Gmarket Sans 3종에 맞게 옮긴 것.
set -euo pipefail

cd "$(dirname "$0")/.."
SRC=fonts-src
OUT=public/fonts
CHARSET="$(mktemp)"
trap 'rm -f "$CHARSET"' EXIT

PYFT="${PYFTSUBSET:-}"
[ -z "$PYFT" ] && [ -x "$SRC/.venv/bin/pyftsubset" ] && PYFT="$SRC/.venv/bin/pyftsubset"
[ -z "$PYFT" ] && PYFT="$(command -v pyftsubset || true)"
[ -n "$PYFT" ] || {
  echo "pyftsubset 이 없다. 위 선행 조건 참고." >&2
  exit 1
}

python3 "$SRC/charset.py" > "$CHARSET"
mkdir -p "$OUT"

subset() {
  # $1 원본 파일명, $2 산출 파일명
  #
  # --name-IDs: 저작권(0)·폰트명(1,4)·버전(5)·상표(7)·제작자(8,9)·라이선스(13,14)를 남긴다.
  #   서브셋은 "수정본"이라 라이선스 고지가 결과물에도 따라가야 한다. 기본값은 대부분 버린다.
  # --layout-features: 커닝·합자만. 나머지 OpenType 기능은 이 앱에서 쓰지 않는다.
  # --no-hinting / --desubroutinize: 파일 크기를 줄인다. 웹에서는 힌팅을 거의 쓰지 않는다.
  "$PYFT" "$SRC/$1" \
    --text-file="$CHARSET" \
    --output-file="$OUT/$2" \
    --flavor=woff2 \
    --layout-features='kern,liga,calt' \
    --no-hinting \
    --desubroutinize \
    --name-IDs='0,1,2,3,4,5,6,7,8,9,11,13,14' \
    --notdef-outline \
    --drop-tables+=DSIG
  printf '  %-28s %s\n' "$2" "$(du -h "$OUT/$2" | cut -f1)"
}

echo "서브셋 생성 중…"
subset GmarketSansTTFLight.ttf   gmarket-sans-light.woff2
subset GmarketSansTTFMedium.ttf  gmarket-sans-medium.woff2
subset GmarketSansTTFBold.ttf    gmarket-sans-bold.woff2

echo "완료. 합계: $(du -ch "$OUT"/*.woff2 | tail -1 | cut -f1)"
