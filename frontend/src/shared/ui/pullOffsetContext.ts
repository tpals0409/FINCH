import { createContext } from 'react';

export type PullOffset = {
  distance: number;
  dragging: boolean;
};

export const PullOffsetContext = createContext<PullOffset>({
  distance: 0,
  dragging: false,
});
