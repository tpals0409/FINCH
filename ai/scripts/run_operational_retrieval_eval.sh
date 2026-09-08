#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

namespace="finch-prod"
selector="app.kubernetes.io/name=ai"
run_id="$(date -u +%Y%m%dT%H%M%SZ)"
output_base="/tmp/finch-ai-retrieval-${run_id}"
remote_dir="/tmp/finch-retrieval-${run_id}"

pod_count="$(kubectl -n "$namespace" get pod -l "$selector" -o name | wc -l | tr -d ' ')"
if [[ "$pod_count" != "1" ]]; then
  echo "안정된 단일 AI Pod가 필요하다: 현재 ${pod_count}개" >&2
  exit 1
fi

pod="$(kubectl -n "$namespace" get pod -l "$selector" -o jsonpath='{.items[0].metadata.name}')"
ready="$(kubectl -n "$namespace" get pod "$pod" -o jsonpath='{.status.containerStatuses[0].ready}')"
if [[ "$ready" != "true" ]]; then
  echo "AI Pod가 Ready가 아니다: ${pod}" >&2
  exit 1
fi

if ! git diff --quiet -- eval/run.py eval/retrieval.yaml || \
  ! git diff --cached --quiet -- eval/run.py eval/retrieval.yaml; then
  echo "평가 코드 또는 질의 세트에 커밋되지 않은 변경이 있다" >&2
  exit 1
fi

image="$(kubectl -n "$namespace" get pod "$pod" -o jsonpath='{.spec.containers[0].image}')"
image_id="$(kubectl -n "$namespace" get pod "$pod" -o jsonpath='{.status.containerStatuses[0].imageID}')"
evaluator_head="$(git rev-parse HEAD)"
app_root="$(kubectl -n "$namespace" exec "$pod" -- python -c 'import app,pathlib; print(pathlib.Path(app.__file__).resolve().parent.parent)')"
corpus="$(kubectl -n "$namespace" exec postgres-ai-0 -- psql -U ai_invest -d ai_invest -Atc "SELECT (SELECT count(*) FROM documents)||(chr(124))||(SELECT count(*) FROM document_chunks)||(chr(124))||(SELECT count(*) FROM index_daily)||(chr(124))||(SELECT count(*) FROM instruments);")"

if [[ "$corpus" != "219|10198|271|2598" ]]; then
  echo "코퍼스 불일치: ${corpus}" >&2
  exit 1
fi

cleanup() {
  kubectl -n "$namespace" exec "$pod" -- rm -rf "$remote_dir" >/dev/null 2>&1 || true
}
trap cleanup EXIT

kubectl -n "$namespace" exec "$pod" -- mkdir -p "$remote_dir/eval"
kubectl -n "$namespace" exec -i "$pod" -- sh -c "cat > '$remote_dir/eval/run.py'" < eval/run.py
kubectl -n "$namespace" exec -i "$pod" -- sh -c "cat > '$remote_dir/eval/retrieval.yaml'" < eval/retrieval.yaml

environment_id="namespace=${namespace};pod=${pod};image=${image};image_id=${image_id};evaluator=${evaluator_head}"
kubectl -n "$namespace" exec "$pod" -- env PYTHONPATH="$app_root" \
  python "$remote_dir/eval/run.py" \
  --retrieval --top-k 5 --repeat 5 \
  --environment-id "$environment_id" \
  --raw-json "$remote_dir/raw.json" | tee "$output_base.log"
kubectl -n "$namespace" exec "$pod" -- cat "$remote_dir/raw.json" > "$output_base.json"

shasum -a 256 "$output_base.log" "$output_base.json"
echo "ENVIRONMENT_ID=${environment_id}"
echo "RAW_LOG=${output_base}.log"
echo "RAW_JSON=${output_base}.json"
