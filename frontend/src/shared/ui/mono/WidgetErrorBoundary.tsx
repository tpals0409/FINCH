// DIRECTION: mono (S15P21A101-95)

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
 * 위젯 단위 에러 경계.
 *
 * 경계를 앱 전역에 하나만 두면 어디서 터져도 화면 전체가 사라진다.
 * 차트 라이브러리 초기화가 실패했다고 주문 버튼까지 없어져서는 안 되고,
 * AI 서비스가 죽었다고 시세가 지워져서도 안 된다.
 *
 * 렌더 에러만 잡는다. 이벤트 핸들러와 비동기 콜백의 에러는 잡지 못한다.
 * 서버 원문과 스택은 콘솔에만 남기고 화면에는 사용자 언어로만 쓴다.
 *
 * **실패 자리에 캐릭터를 세우지 않는다.** 돈이 걸린 화면에서 실패를 캐릭터가
 * 대신 말하면 사과가 아니라 장난이 된다. 문장과 재시도 버튼만 둔다.
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
      `[mono/WidgetErrorBoundary:${this.props.label}]`,
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
        <div className="mono-center">
          <p className="mono-body mono-fg">
            {this.props.label}을 표시하지 못했습니다
          </p>
          <p className="mono-empty-note">
            나머지 정보는 그대로 볼 수 있습니다.
          </p>
          <div style={{ marginTop: '1rem' }}>
            <Button onClick={this.handleRetry}>다시 시도</Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
