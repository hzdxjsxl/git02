export const formatNumber = (value: number, decimals: number = 1): string => {
  if (!isFinite(value) || isNaN(value)) return '0';
  return value.toFixed(decimals);
};

export const formatInt = (value: number): string => {
  if (!isFinite(value) || isNaN(value)) return '0';
  return Math.round(value).toString();
};

export const formatPercent = (value: number, decimals: number = 1): string => {
  if (!isFinite(value) || isNaN(value)) return '0%';
  return `${value.toFixed(decimals)}%`;
};

export const formatTime = (ms: number): string => {
  if (!isFinite(ms) || isNaN(ms) || ms <= 0) return '0s';
  if (ms < 1000) return `${Math.round(ms)}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 3600000) return `${(ms / 60000).toFixed(1)}m`;
  return `${(ms / 3600000).toFixed(1)}h`;
};

export const formatTimeShort = (ms: number): string => {
  if (!isFinite(ms) || isNaN(ms) || ms <= 0) return '0';
  if (ms < 1000) return '0';
  return (ms / 1000).toFixed(1);
};
