const DEFAULT_DURATION_MS = 260;

export function parseCssDuration(
  value: string,
  fallback = DEFAULT_DURATION_MS,
): number {
  const match = /^([+-]?(?:\d+\.?\d*|\.\d+))(ms|s)$/i.exec(value.trim());
  if (match === null) {
    return fallback;
  }

  const amount = Number(match[1]);
  if (!Number.isFinite(amount)) {
    return fallback;
  }

  const unit = match[2];
  return unit?.toLowerCase() === 's' ? amount * 1000 : amount;
}
