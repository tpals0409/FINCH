import { Component, type ErrorInfo, type ReactNode } from 'react';

type AppErrorBoundaryProps = {
  children: ReactNode;
};

type AppErrorBoundaryState = {
  hasError: boolean;
};

/**
 * 앱 전역 에러 경계 (컨벤션 §8).
 * 렌더 에러만 잡는다. 이벤트 핸들러와 비동기 콜백의 에러는 잡지 못한다.
 * 서버 원문은 콘솔에만 남기고 화면에는 사용자 언어로 보여준다.
 */
export class AppErrorBoundary extends Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[AppErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="mx-auto flex w-full max-w-md flex-col items-center px-4 py-16">
          <p className="text-base font-medium text-slate-900">
            화면을 표시할 수 없습니다
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-4 min-h-11 w-full rounded-lg bg-slate-900 px-4 text-sm font-medium text-white"
          >
            새로고침
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
