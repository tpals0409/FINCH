#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

namespace="finch-prod"
selector="app.kubernetes.io/name=ai,app.kubernetes.io/component!=cronjob"
field_selector="status.phase=Running"
cleanup_pod=""
cleanup_remote_dir=""

serving_pods() {
  kubectl -n "$namespace" get pod \
    -l "$selector" \
    --field-selector="$field_selector" \
    -o jsonpath='{range .items[*]}{.metadata.name}{"\n"}{end}'
}

require_single_serving_pod() {
  local pods pod_count
  pods="$(serving_pods)"
  pod_count="$(printf '%s\n' "$pods" | sed '/^$/d' | wc -l | tr -d ' ')"
  if [[ "$pod_count" != "1" ]]; then
    echo "안정된 단일 AI 서빙 Pod가 필요하다: 현재 ${pod_count}개" >&2
    return 1
  fi
  printf '%s\n' "$pods"
}

cleanup() {
  if [[ -n "$cleanup_pod" && -n "$cleanup_remote_dir" ]]; then
    kubectl -n "$namespace" exec "$cleanup_pod" -- rm -rf "$cleanup_remote_dir" \
      >/dev/null 2>&1 || true
  fi
}

main() {
  local run_id output_base remote_dir pod ready image image_id evaluator_head app_root corpus
  local environment_id
  run_id="$(date -u +%Y%m%dT%H%M%SZ)"
  output_base="/tmp/finch-ai-retrieval-${run_id}"
  remote_dir="/tmp/finch-retrieval-${run_id}"
  pod="$(require_single_serving_pod)"
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

  cleanup_pod="$pod"
  cleanup_remote_dir="$remote_dir"
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
}

if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then
  main "$@"
fi
