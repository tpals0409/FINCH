import * as Dialog from '@radix-ui/react-dialog';
import { useState } from 'react';

export type BottomSheetSelectOption<Value extends string> = {
  value: Value;
  label: string;
};

type BottomSheetSelectProps<Value extends string> = {
  value: Value;
  options: readonly BottomSheetSelectOption<Value>[];
  label: string;
  onChange: (value: Value) => void;
};

/** OS 기본 피커 대신 FINCH 시트로 선택하는 공용 단일 선택 컨트롤. */
export function BottomSheetSelect<Value extends string>({
  value,
  options,
  label,
  onChange,
}: BottomSheetSelectProps<Value>) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find((option) => option.value === value);

  return (
    <Dialog.Root open={isOpen} onOpenChange={setIsOpen}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          className="rounded-md border border-stroke-neutral-weak bg-bg-layer-default px-3 py-2 text-label text-fg-neutral"
        >
          {selectedOption?.label ?? label}
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="finch-sheet-overlay fixed inset-0 z-(--z-overlay) bg-bg-overlay" />
        <Dialog.Content className="finch-sheet-content fixed inset-x-0 bottom-0 z-(--z-overlay) mx-auto w-full max-w-md rounded-t-sheet bg-bg-layer-default p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
          <div className="flex items-center justify-between gap-3">
            <Dialog.Title className="text-title-3 text-fg-neutral">
              {label}
            </Dialog.Title>
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="닫기"
                className="flex size-11 items-center justify-center rounded-md text-title-3 text-fg-neutral"
              >
                <span aria-hidden="true">×</span>
              </button>
            </Dialog.Close>
          </div>

          <div
            role="listbox"
            aria-label={label}
            aria-activedescendant={`bottom-sheet-option-${value}`}
            className="mt-3"
          >
            {options.map((option) => (
              <button
                key={option.value}
                id={`bottom-sheet-option-${option.value}`}
                type="button"
                role="option"
                aria-selected={option.value === value}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className="flex min-h-touch-min w-full items-center justify-between border-t border-stroke-neutral-subtle py-3 text-body-1 text-fg-neutral"
              >
                {option.label}
                {option.value === value ? (
                  <span aria-hidden="true" className="text-title-3">
                    ✓
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
