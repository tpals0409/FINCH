from __future__ import annotations

import shlex
import subprocess
from pathlib import Path

SCRIPT = Path(__file__).parents[1] / "scripts" / "run_operational_retrieval_eval.sh"


def _select_pod(fake_kubectl: str) -> subprocess.CompletedProcess[str]:
    command = f"""
kubectl() {{
{fake_kubectl}
}}
source {shlex.quote(str(SCRIPT))}
require_single_serving_pod
"""
    return subprocess.run(
        ["bash", "-c", command],
        check=False,
        capture_output=True,
        text=True,
    )


def test_running_serving_pod_하나면_게이트를_통과한다() -> None:
    result = _select_pod('printf "ai-serving\\n"')

    assert result.returncode == 0
    assert result.stdout == "ai-serving\n"


def test_completed_cronjob_pod가_있어도_serving_pod만_센다() -> None:
    result = _select_pod(
        """
case "$*" in
  *"app.kubernetes.io/component!=cronjob"*"--field-selector=status.phase=Running"*)
    printf "ai-serving\\n"
    ;;
  *)
    printf "ai-serving\\nai-price-snapshots-completed\\n"
    ;;
esac
"""
    )

    assert result.returncode == 0
    assert result.stdout == "ai-serving\n"
