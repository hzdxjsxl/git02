import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { useElevatorStore } from '../store/elevatorStore';
import { COLORS } from '../constants/config';
import { Users, Clock, AlertTriangle, Zap } from 'lucide-react';

const formatTime = (ms: number): string => {
  if (ms < 1000) return `${ms.toFixed(0)}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
};

export const KPIDashboard = () => {
  const { metrics, metricsHistory, totalCallsReceived, totalCallsCompleted, elevators } =
    useElevatorStore();

  const chartData = metricsHistory.slice(-30).map((h) => ({
    time: new Date(h.timestamp).toLocaleTimeString(),
    avgWaitTime: h.avgWaitTime / 1000,
    pendingCalls: h.pendingCalls,
    throughput: h.throughput,
    congestion: h.congestionIndex,
  }));

  const avgUtilization =
    metrics.elevatorUtilization.reduce((a, b) => a + b, 0) /
    Math.max(metrics.elevatorUtilization.length, 1);

  const getScoreColor = (value: number, max: number) => {
    const ratio = value / max;
    if (ratio > 0.7) return COLORS.danger;
    if (ratio > 0.4) return COLORS.warning;
    return COLORS.success;
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="p-4 rounded-xl" style={{ backgroundColor: COLORS.darkLight }}>
          <div className="flex items-center gap-2 mb-2">
            <Clock size={16} style={{ color: COLORS.primary }} />
            <span
              className="text-xs"
              style={{ color: COLORS.textMuted, fontFamily: 'JetBrains Mono, monospace' }}
            >
              平均等待
            </span>
          </div>
          <div
            className="text-2xl font-bold"
            style={{
              color: getScoreColor(metrics.avgWaitTime, 30000),
              fontFamily: 'JetBrains Mono, monospace',
            }}
          >
            {formatTime(metrics.avgWaitTime)}
          </div>
        </div>

        <div className="p-4 rounded-xl" style={{ backgroundColor: COLORS.darkLight }}>
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={16} style={{ color: COLORS.warning }} />
            <span
              className="text-xs"
              style={{ color: COLORS.textMuted, fontFamily: 'JetBrains Mono, monospace' }}
            >
              最长等待
            </span>
          </div>
          <div
            className="text-2xl font-bold"
            style={{
              color: getScoreColor(metrics.maxWaitTime, 60000),
              fontFamily: 'JetBrains Mono, monospace',
            }}
          >
            {formatTime(metrics.maxWaitTime)}
          </div>
        </div>

        <div className="p-4 rounded-xl" style={{ backgroundColor: COLORS.darkLight }}>
          <div className="flex items-center gap-2 mb-2">
            <Users size={16} style={{ color: COLORS.secondary }} />
            <span
              className="text-xs"
              style={{ color: COLORS.textMuted, fontFamily: 'JetBrains Mono, monospace' }}
            >
              待处理
            </span>
          </div>
          <div
            className="text-2xl font-bold"
            style={{
              color: getScoreColor(metrics.pendingCalls, 200),
              fontFamily: 'JetBrains Mono, monospace',
            }}
          >
            {metrics.pendingCalls}
          </div>
        </div>

        <div className="p-4 rounded-xl" style={{ backgroundColor: COLORS.darkLight }}>
          <div className="flex items-center gap-2 mb-2">
            <Zap size={16} style={{ color: COLORS.success }} />
            <span
              className="text-xs"
              style={{ color: COLORS.textMuted, fontFamily: 'JetBrains Mono, monospace' }}
            >
              吞吐量
            </span>
          </div>
          <div
            className="text-2xl font-bold"
            style={{ color: COLORS.success, fontFamily: 'JetBrains Mono, monospace' }}
          >
            {totalCallsCompleted}
          </div>
        </div>
      </div>

      <div className="p-4 rounded-xl" style={{ backgroundColor: COLORS.darkLight }}>
        <h4
          className="text-xs font-bold mb-3"
          style={{ color: COLORS.textMuted, fontFamily: 'JetBrains Mono, monospace' }}
        >
          拥堵指数
        </h4>
        <div className="relative h-4 rounded-full overflow-hidden" style={{ backgroundColor: COLORS.dark }}>
          <div
            className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
            style={{
              width: `${metrics.congestionIndex}%`,
              backgroundColor: getScoreColor(metrics.congestionIndex, 100),
            }}
          />
        </div>
        <div
          className="text-right text-xs mt-1"
          style={{ color: COLORS.textMuted, fontFamily: 'JetBrains Mono, monospace' }}
        >
          {metrics.congestionIndex.toFixed(0)}%
        </div>
      </div>

      <div className="p-4 rounded-xl" style={{ backgroundColor: COLORS.darkLight }}>
        <h4
          className="text-xs font-bold mb-3"
          style={{ color: COLORS.textMuted, fontFamily: 'JetBrains Mono, monospace' }}
        >
          电梯利用率
        </h4>
        <div className="space-y-1">
          {elevators.map((elevator) => {
            const utilization = (elevator.passengers / elevator.capacity) * 100;
            return (
              <div key={elevator.id} className="flex items-center gap-2">
                <span
                  className="w-8 text-[10px]"
                  style={{
                    color: COLORS.textMuted,
                    fontFamily: 'JetBrains Mono, monospace',
                  }}
                >
                  E{elevator.id + 1}
                </span>
                <div
                  className="flex-1 h-2 rounded-full overflow-hidden"
                  style={{ backgroundColor: COLORS.dark }}
                >
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${utilization}%`,
                      backgroundColor: getScoreColor(utilization, 100),
                    }}
                  />
                </div>
                <span
                  className="w-10 text-right text-[10px]"
                  style={{
                    color: COLORS.textMuted,
                    fontFamily: 'JetBrains Mono, monospace',
                  }}
                >
                  {utilization.toFixed(0)}%
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {chartData.length > 2 && (
        <div className="p-4 rounded-xl" style={{ backgroundColor: COLORS.darkLight }}>
          <h4
            className="text-xs font-bold mb-3"
            style={{ color: COLORS.textMuted, fontFamily: 'JetBrains Mono, monospace' }}
          >
            等待时间趋势
          </h4>
          <ResponsiveContainer width="100%" height={120}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorWait" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="time"
                hide
                tick={{ fill: COLORS.textMuted, fontSize: 10 }}
              />
              <YAxis hide tick={{ fill: COLORS.textMuted, fontSize: 10 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: COLORS.dark,
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: '8px',
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: '12px',
                }}
                labelStyle={{ color: COLORS.text }}
              />
              <Area
                type="monotone"
                dataKey="avgWaitTime"
                stroke={COLORS.primary}
                fillOpacity={1}
                fill="url(#colorWait)"
                name="等待时间(s)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="p-4 rounded-xl" style={{ backgroundColor: COLORS.darkLight }}>
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <div
              className="text-xs"
              style={{ color: COLORS.textMuted, fontFamily: 'JetBrains Mono, monospace' }}
            >
              总接收请求
            </div>
            <div
              className="text-xl font-bold"
              style={{ color: COLORS.text, fontFamily: 'JetBrains Mono, monospace' }}
            >
              {totalCallsReceived}
            </div>
          </div>
          <div>
            <div
              className="text-xs"
              style={{ color: COLORS.textMuted, fontFamily: 'JetBrains Mono, monospace' }}
            >
              完成率
            </div>
            <div
              className="text-xl font-bold"
              style={{ color: COLORS.success, fontFamily: 'JetBrains Mono, monospace' }}
            >
              {totalCallsReceived > 0
                ? ((totalCallsCompleted / totalCallsReceived) * 100).toFixed(1)
                : 0}
              %
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
