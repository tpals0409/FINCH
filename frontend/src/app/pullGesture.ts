const MAX_PULL_PX = 72;
const REFRESH_PULL_PX = 56;
const RESISTANCE = 0.5;

export function pullDistance(deltaY: number): number {
  return Math.min(MAX_PULL_PX, Math.max(0, deltaY * RESISTANCE));
}

export function shouldRefresh(distance: number): boolean {
  return distance >= REFRESH_PULL_PX;
}
