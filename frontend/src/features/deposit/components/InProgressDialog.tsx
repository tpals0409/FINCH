import * as Dialog from '@radix-ui/react-dialog';

import { Button } from '@/shared/ui/Button';

/**
 * `IDEMPOTENCY_IN_PROGRESS` (와이어프레임 아트보드 9 · apiSpec §1.4).
 *
 * **이 화면이 중복 충전을 만드는 자리다.** 서버 문구는 "잠시 후 다시 시도해 주세요" 인데
 * 화면에 재시도 버튼이 없으면 사용자는 원래 충전 버튼을 다시 누른다. 그건 **새 멱등성 키**가
 * 되어 **두 번째 충전**이 된다.
 *
 * 그래서 셋을 함께 건다.
 * 1. **재시도 버튼을 시트 안에 둔다** — 같은 키로 재요청하므로 서버가 최초 결과를 그대로 준다
 * 2. **딤으로 원래 CTA 를 덮는다** — 시각적 차단
 * 3. **포커스를 시트 안에 가둔다** — 입력 차단. 딤만 하면 키보드·스크린리더로 뚫린다
 *
 * radix `Dialog` 를 쓰는 이유가 3번이다. 직접 만들면 포커스 트랩·`aria-modal`·ESC 처리를
 * 손으로 짜야 하고, 그중 하나만 빠져도 뚫리는 경로가 남는다.
 *
 * **닫기 버튼을 두지 않는다.** 닫으면 사용자가 뒤의 충전 버튼으로 돌아가는데 그 경로가
 * 정확히 막으려던 것이다. 나갈 길은 재시도뿐이다.
 *
 * 문구는 새로 만들지 않았다 — `GeneralErrorCode.IDEMPOTENCY_IN_PROGRESS` 의 `message`
 * ("같은 요청을 처리하고 있습니다. 잠시 후 다시 시도해 주세요")를 제목과 본문으로 쪼갠 것이다.
 */
type Props = {
  open: boolean;
  isRetrying: boolean;
  onRetry: () => void;
};

export function InProgressDialog({ open, isRetrying, onRetry }: Props) {
  return (
    <Dialog.Root open={open}>
      <Dialog.Portal>
        <Dialog.Overlay className="z-overlay fixed inset-0 bg-bg-overlay" />
        <Dialog.Content
          // 바깥 클릭·ESC 로 닫히지 않게 한다. 닫히면 뒤 CTA 로 돌아가는 경로가 열린다.
          onEscapeKeyDown={(event) => event.preventDefault()}
          onPointerDownOutside={(event) => event.preventDefault()}
          onInteractOutside={(event) => event.preventDefault()}
          className="z-overlay fixed inset-x-0 bottom-0 mx-auto w-full max-w-md rounded-t-sheet bg-bg-layer-default p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]"
        >
          <Dialog.Title className="text-title-3 text-fg-neutral">
            같은 요청을 처리하고 있습니다
          </Dialog.Title>
          <Dialog.Description className="mt-2 text-body-2 text-fg-neutral-subtle">
            잠시 후 다시 시도해 주세요. 충전은 한 번만 처리됩니다.
          </Dialog.Description>

          <Button onClick={onRetry} disabled={isRetrying} className="mt-5">
            {isRetrying ? '처리 중…' : '다시 시도'}
          </Button>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
