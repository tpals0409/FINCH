// DIRECTION: character (S15P21A101-93)

import { Component, type ErrorInfo, type ReactNode } from 'react';

import { Button } from './Button';

type WidgetErrorBoundaryProps = {
  /** 무엇이 안 되는지 문장에 넣을 이름. `차트`, `AI 소견` 처럼 화면에 보이는 말로 쓴다. */
  label: string;
  children: ReactNode;
};

type WidgetErrorBoundaryState = {
  hasError: boolean;
};

/**
 * 위젯 단위 에러 경계 (컨벤션 §7). props 는 애플 방향과 같다.
 *
 * 경계를 앱 전역에 하나만 두면 어디서 터져도 화면 전체가 사라진다.
 * 차트 초기화가 실패했다고 주문 버튼까지 없어져서는 안 된다.
 *
 * 여기에는 캐릭터를 두지 않는다. 무언가 고장 난 자리에서 새가 웃고 있으면
 * 제품이 상황을 모르는 것처럼 보인다.
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
        <div className="py-8 text-center">
          <p className="text-[1.0625rem] text-[var(--character-text)]">
            {this.props.label}을 표시할 수 없습니다
          </p>
          <div className="mt-4">
            <Button onClick={this.handleRetry}>다시 시도</Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
