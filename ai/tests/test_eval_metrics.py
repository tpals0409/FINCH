"""평가 지표 회귀 테스트.

통과만 하는 지표는 쓸모가 없다. 여기 절반은 "잡아야 정상"인 케이스다.
"""

from __future__ import annotations

import pytest

from app.core.enums import MetricSource, Unit
from app.core.schemas import Section, Segment
from eval.metrics import (
    evaluate_section,
    groundedness,
    numerical_accuracy,
    portfolio_accuracy,
)
from eval.run import _load_cases


def _sec(*segs: Segment) -> Section:
    return Section.from_segments(list(segs))


def _ratio(value: str, raw: float, src=MetricSource.RISK_ENGINE) -> Segment:
    return Segment.metric(value, raw, src, unit=Unit.RATIO)


# ── Numerical Accuracy ───────────────────────────────────
def test_치환된_수치는_통과한다() -> None:
    s = _sec(Segment.text("반도체 비중은 "), _ratio("42.3%", 0.423), Segment.text("입니다."))
    assert numerical_accuracy(s, {"42.3%": 0.423}).passed


@pytest.mark.parametrize(
    "text",
    [
        "반도체 비중이 42.3%입니다.",
        "평가금액은 1,200,000원입니다.",
        "보유 종목은 3종목입니다.",
        "주가가 2배 올랐습니다.",
    ],
)
def test_문장에_박힌_원시_수치를_잡는다(text: str) -> None:
    """LLM이 자리표시자를 쓰지 않고 숫자를 직접 적으면 잡아야 한다."""
    assert not numerical_accuracy(Section(text=text), {}).passed


@pytest.mark.parametrize(
    "text",
    ["2026년 실적입니다.", "3분기에 발표됩니다.", "첫 번째 항목입니다.", "종목코드는 005930입니다."],
)
def test_연도_분기_서수_종목코드는_통과한다(text: str) -> None:
    assert numerical_accuracy(Section(text=text), {}).passed


def test_엔진_값과_어긋나면_잡는다() -> None:
    """LLM은 주어진 값도 반올림한다. 문자열만 보면 그럴듯해 놓치기 쉽다."""
    r = numerical_accuracy(_sec(_ratio("42.3%", 0.999)), {"42.3%": 0.423})
    assert not r.passed
    assert any("불일치" in v for v in r.violations)


# ── Groundedness ─────────────────────────────────────────
def test_근거_없는_사실_주장을_잡는다() -> None:
    assert not groundedness(Section(text="회사는 신규 계약을 체결했습니다."), set()).passed


def test_근거가_붙으면_통과한다() -> None:
    s = Section(text="회사는 신규 계약을 체결했습니다.[^cit_1]")
    assert groundedness(s, {"cit_1"}).passed


def test_없는_근거를_참조하면_잡는다() -> None:
    s = Section(text="회사는 신규 계약을 체결했습니다.[^cit_9]")
    r = groundedness(s, {"cit_1"})
    assert not r.passed
    assert any("존재하지 않는" in v for v in r.violations)


def test_엔진_수치만_말하는_문장은_근거를_요구하지_않는다() -> None:
    """과탐을 막는다. 비중을 말하는 문장에 공시 근거를 붙일 수는 없다."""
    s = _sec(Segment.text("반도체 비중은 "), _ratio("42.3%", 0.423), Segment.text("입니다."))
    assert groundedness(s, set()).passed


# ── Portfolio Accuracy ───────────────────────────────────
def test_실제_보유_비중과_맞으면_통과한다() -> None:
    s = _sec(_ratio("41.7%", 0.417, MetricSource.PORTFOLIO_ENGINE))
    assert portfolio_accuracy(s, {"005930": 0.417}).passed


def test_보유하지_않은_비중을_말하면_잡는다() -> None:
    """개인화가 실제 포트폴리오를 반영하는지 보는 지표다."""
    s = _sec(_ratio("41.7%", 0.417, MetricSource.PORTFOLIO_ENGINE))
    assert not portfolio_accuracy(s, {"005930": 0.180}).passed


# ── 묶음 실행 ────────────────────────────────────────────
def test_입력이_없는_지표는_건너뛴다() -> None:
    s = _sec(Segment.text("관련 자료를 찾지 못했습니다."))
    assert [r.name for r in evaluate_section(s)] == ["numerical_accuracy"]
    names = [r.name for r in evaluate_section(s, citations=set(), holdings={})]
    assert names == ["numerical_accuracy", "groundedness", "portfolio_accuracy"]


# ── 평가셋 ───────────────────────────────────────────────
def test_검색_평가셋이_읽힌다() -> None:
    cases = _load_cases()
    assert len(cases) >= 8
    assert all(c.id and c.query for c in cases)
    assert any(c.expect_empty for c in cases), "오탐 관찰용 케이스가 있어야 한다"
    assert any(c.ticker for c in cases), "종목 한정 케이스가 있어야 한다"


def test_운영_검색_8개_질의_기준선이_고정된다() -> None:
    """운영에서 비교한 8개 질의의 입력과 기대값이 조용히 바뀌지 않게 한다."""
    cases = _load_cases()
    assert [(c.id, c.query, c.ticker, c.expect_title_contains, c.expect_empty) for c in cases] == [
        ("treasury-cancel", "자기주식을 소각하기로 한 곳이 있나요?", None, ["주식소각결정"], False),
        ("shareholder-holding", "대량보유 상황이 보고된 종목이 있나요?", None, ["주식등의대량보유상황보고서"], False),
        ("rumor-clarification", "시장에 돈 풍문에 대해 회사가 해명한 사례를 찾아줘", None, ["풍문또는보도에대한해명"], False),
        ("derivatives-loss", "파생상품 거래에서 손실이 발생한 공시가 있나요?", None, ["파생상품거래손실발생"], False),
        ("rights-issue", "유상증자를 결정한 종목은 어디야?", None, ["유상증자결정"], False),
        ("major-shareholder-change", "최대주주의 지분 변동이 신고된 종목이 있나요?", None, ["최대주주등소유주식변동신고서"], False),
        ("半期-사업내용", "반기보고서에서 회사의 주요 사업 내용을 설명한 부분", "005930", ["반기보고서"], False),
        ("absent-launch", "우주 발사체 사업에 진출한다는 공시가 있나요?", None, [], True),
    ]
