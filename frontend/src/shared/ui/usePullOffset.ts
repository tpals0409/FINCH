import { useContext } from 'react';

import { PullOffsetContext } from './pullOffsetContext';

export function usePullOffset() {
  return useContext(PullOffsetContext);
}
