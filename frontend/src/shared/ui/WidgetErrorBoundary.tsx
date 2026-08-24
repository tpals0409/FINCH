import { Component, type ErrorInfo, type ReactNode } from 'react';

type WidgetErrorBoundaryProps = {
  /** 무엇이 안 되는지 문장에 넣을 이름. `도판`, `소견` 처럼 화면에 보이는 말로 쓴다. */
  label: string;
  children: ReactNode;
};

type WidgetErrorBoundaryState = {
  hasError: boolean;
};

/**
 * 위젯 단위 에러 경계 (컨벤션 §7).
 *
 * 경계를 앱 전역에 하나만 두면 어디서 터져도 화면 전체가 사라진다.
 * 차트 라이브러리 초기화가 실패했다고 주문 버튼까지 없어져서는 안 되고,
 * AI 서비스가 죽었다고 시세가 지워져서도 안 된다.
 *
 * 렌더 에러만 잡는다. 이벤트 핸들러와 비동기 콜백의 에러는 잡지 못한다.
 * 서버 원문과 스택은 콘솔에만 남기고 화면에는 사용자 언어로만 쓴다.
 */
export class WidgetErrorBoundary extends Component<
  WidgetErrorBoundaryProps,
  WidgetErrorBoundaryState
> {
  state: WidgetErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): WidgetErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(
      `[WidgetErrorBoundary:${this.props.label}]`,
      error,
      info.componentStack,
    );
  }

  handleRetry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="px-4 py-6">
          <p className="text-[0.9375rem] text-ink">
            {this.props.label}을 표시할 수 없습니다
          </p>
          <button
            type="button"
            onClick={this.handleRetry}
            className="mt-3 min-h-11 border border-ink px-4 font-display text-[0.8125rem] font-semibold tracking-[0.04em] text-ink"
          >
            다시 시도
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
