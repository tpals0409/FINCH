#!/usr/bin/env bash
# 로컬 compose 스택의 DB 2종(backend·ai) pg_dump 백업.
# 수동 실행: infra/scripts/backup-db.sh
#
# 예전에는 setup-server.sh 가 cron 에 등록했지만 그 스크립트는 Sprint 3 에서 지웠다.
# 지금 이 파일을 자동으로 부르는 것은 없다. 운영 DB 백업은 k8s 쪽에서 따로 정한다.
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/var/backups/a101}"
KEEP_DAYS="${KEEP_DAYS:-7}"
STAMP="$(date +%Y%m%d-%H%M%S)"

# infra/.env 에서 DB 계정을 읽는다
ENV_FILE="$(dirname "$0")/../.env"
if [ -f "$ENV_FILE" ]; then
  set -a
  # shellcheck disable=SC1090
  . "$ENV_FILE"
  set +a
fi
: "${BACKEND_DB_USER:?infra/.env 에 BACKEND_DB_USER 가 없습니다}"
: "${AI_DB_USER:?infra/.env 에 AI_DB_USER 가 없습니다}"

mkdir -p "$BACKUP_DIR"

echo "▶ backend DB 백업"
docker exec a101-postgres-backend pg_dump -U "$BACKEND_DB_USER" "$BACKEND_DB_NAME" \
  | gzip > "$BACKUP_DIR/backend-$STAMP.sql.gz"

echo "▶ ai DB 백업"
docker exec a101-postgres-ai pg_dump -U "$AI_DB_USER" "$AI_DB_NAME" \
  | gzip > "$BACKUP_DIR/ai-$STAMP.sql.gz"

echo "▶ ${KEEP_DAYS}일 지난 백업 삭제"
find "$BACKUP_DIR" -name '*.sql.gz' -mtime +"$KEEP_DAYS" -delete

echo "✓ 완료: $BACKUP_DIR"
ls -lh "$BACKUP_DIR" | tail -5
