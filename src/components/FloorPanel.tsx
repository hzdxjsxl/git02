import { useFloorCallStatus } from '../store/elevatorStore';
import { COLORS } from '../constants/config';

export const FloorPanel = () => {
  const floorStatuses = useFloorCallStatus();
  const reversedStatuses = [...floorStatuses].reverse();

  const getHeatColor = (count: number, maxCount: number) => {
    if (count === 0) return COLORS.darkLighter;
    const intensity = Math.min(1, count / Math.max(maxCount, 1));
    if (intensity > 0.7) return COLORS.danger;
    if (intensity > 0.4) return COLORS.warning;
    return COLORS.primary;
  };

  const maxCalls = Math.max(...floorStatuses.map((s) => s.upCalls + s.downCalls), 1);

  return (
    <div className="p-4 rounded-xl" style={{ backgroundColor: COLORS.darkLight }}>
      <h3
        className="text-sm font-bold mb-4"
        style={{ color: COLORS.primary, fontFamily: 'JetBrains Mono, monospace' }}
      >
        楼层呼叫状态
      </h3>
      <div className="space-y-0.5 overflow-y-auto" style={{ maxHeight: '720px' }}>
        {reversedStatuses.map((status) => (
          <div
            key={status.floor}
            className="flex items-center gap-2 py-1 px-2 rounded text-xs"
            style={{
              backgroundColor:
                status.upCalls + status.downCalls > 0
                  ? getHeatColor(status.upCalls + status.downCalls, maxCalls) + '20'
                  : 'transparent',
            }}
          >
            <span
              className="w-6 text-right font-bold"
              style={{
                color: COLORS.textMuted,
                fontFamily: 'JetBrains Mono, monospace',
              }}
            >
              {status.floor}
            </span>
            <div className="flex-1 flex gap-1">
              {status.upCalls > 0 && (
                <span
                  className="px-1.5 py-0.5 rounded text-[10px] font-bold"
                  style={{
                    backgroundColor: COLORS.primary + '30',
                    color: COLORS.primary,
                  }}
                >
                  ↑{status.upCalls}
                </span>
              )}
              {status.downCalls > 0 && (
                <span
                  className="px-1.5 py-0.5 rounded text-[10px] font-bold"
                  style={{
                    backgroundColor: COLORS.secondary + '30',
                    color: COLORS.secondary,
                  }}
                >
                  ↓{status.downCalls}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
