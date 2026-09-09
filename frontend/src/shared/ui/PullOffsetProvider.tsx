import type { ReactNode } from 'react';

import { PullOffsetContext, type PullOffset } from './pullOffsetContext';

export function PullOffsetProvider({
  value,
  children,
}: {
  value: PullOffset;
  children: ReactNode;
}) {
  return (
    <PullOffsetContext.Provider value={value}>
      {children}
    </PullOffsetContext.Provider>
  );
}
