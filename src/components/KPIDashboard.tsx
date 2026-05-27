import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';
import { useElevatorStore } from '../store/elevatorStore';
import { COLORS } from '../constants/config';
import { formatTime, formatPercent, formatNumber, formatInt } from '../utils/format';
import { Users, Clock, AlertTriangle, Zap, TrendingUp } from 'lucide-react';

export const KPIDashboard = () => {
  const { metrics, metricsHistory, totalCallsReceived, totalCallsCompleted, elevators } =
    useElevatorStore();

  const chartData = metricsHistory.slice(-30).map((h) => ({
    time: new Date(h.timestamp).toLocaleTimeString(),
    avgWaitTime: Number((h.avgWaitTime / 1000).toFixed(1)),
    pendingCalls: h.pendingCalls,
    throughput: h.throughput,
    congestion: Number(h.congestionIndex.toFixed(0)),
  }));

  const getScoreColor = (value: number, max: number, invert = false) => {
    const ratio = value / max;
    const effectiveRatio = invert ? 1 - ratio : ratio;
    if (effectiveRatio > 0.7) return COLORS.danger;
    if (effectiveRatio > 0.4) return COLORS.warning;
    return COLORS.success;
  };

  const completionRate = totalCallsReceived > 0
    ? (totalCallsCompleted / totalCallsReceived) * 100
    : 0;

  const avgUtilization =
    metrics.elevatorUtilization.length > 0
      ? metrics.elevatorUtilization.reduce((a, b) => a + b, 0) / metrics.elevatorUtilization.length
      : 0;

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
            <TrendingUp size={16} style={{ color: COLORS.secondary }} />
            <span
              className="text-xs"
              style={{ color: COLORS.textMuted, fontFamily: 'JetBrains Mono, monospace' }}
            >
              平均行程
            </span>
          </div>
          <div
            className="text-2xl font-bold"
            style={{
              color: COLORS.secondary,
              fontFamily: 'JetBrains Mono, monospace',
            }}
          >
            {formatTime(metrics.avgRideTime)}
          </div>
        </div>

        <div className="p-4 rounded-xl" style={{ backgroundColor: COLORS.darkLight }}>
          <div className="flex items-center gap-2 mb-2">
            <Users size={16} style={{ color: COLORS.warning }} />
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
            {formatInt(metrics.pendingCalls)}
          </div>
        </div>

        <div className="p-4 rounded-xl" style={{ backgroundColor: COLORS.darkLight }}>
          <div className="flex items-center gap-2 mb-2">
            <Zap size={16} style={{ color: COLORS.success }} />
            <span
              className="text-xs"
              style={{ color: COLORS.textMuted, fontFamily: 'JetBrains Mono, monospace' }}
            >
              已完成
            </span>
          </div>
          <div
            className="text-2xl font-bold"
            style={{ color: COLORS.success, fontFamily: 'JetBrains Mono, monospace' }}
          >
            {formatInt(totalCallsCompleted)}
          </div>
        </div>

        <div className="p-4 rounded-xl" style={{ backgroundColor: COLORS.darkLight }}>
          <div className="flex items-center gap-2 mb-2">
            <Users size={16} style={{ color: COLORS.primary }} />
            <span
              className="text-xs"
              style={{ color: COLORS.textMuted, fontFamily: 'JetBrains Mono, monospace' }}
            >
              平均负载
            </span>
          </div>
          <div
            className="text-2xl font-bold"
            style={{
              color: getScoreColor(avgUtilization, 100),
              fontFamily: 'JetBrains Mono, monospace',
            }}
          >
            {formatPercent(avgUtilization, 0)}
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
          {formatPercent(metrics.congestionIndex, 0)}
        </div>
      </div>

      <div className="p-4 rounded-xl" style={{ backgroundColor: COLORS.darkLight }}>
        <h4
          className="text-xs font-bold mb-3"
          style={{ color: COLORS.textMuted, fontFamily: 'JetBrains Mono, monospace' }}
        >
          电梯状态
        </h4>
        <div className="space-y-1.5">
          {elevators.map((elevator) => {
            const utilization = (elevator.passengers / elevator.capacity) * 100;
            const isMoving = elevator.state === 'moving';
            const isDoorOpen = elevator.state === 'door-open';
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
                <span
                  className="w-6 text-[10px] text-center"
                  style={{
                    color: isMoving ? COLORS.primary : isDoorOpen ? COLORS.success : COLORS.textMuted,
                    fontFamily: 'JetBrains Mono, monospace',
                  }}
                >
                  {formatInt(elevator.currentFloor)}
                </span>
                <span
                  className="w-4 text-[10px]"
                  style={{
                    color: elevator.direction === 'up' ? COLORS.primary : elevator.direction === 'down' ? COLORS.secondary : COLORS.textMuted,
                  }}
                >
                  {elevator.direction === 'up' ? '↑' : elevator.direction === 'down' ? '↓' : '○'}
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
                  className="w-12 text-right text-[10px]"
                  style={{
                    color: COLORS.textMuted,
                    fontFamily: 'JetBrains Mono, monospace',
                  }}
                >
                  {elevator.passengers}/{elevator.capacity}
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
            等待时间趋势 (秒)
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
              <YAxis
                hide
                tick={{ fill: COLORS.textMuted, fontSize: 10 }}
                domain={['auto', 'auto']}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: COLORS.dark,
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: '8px',
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: '12px',
                }}
                labelStyle={{ color: COLORS.text }}
                formatter={(value: number) => [`${value.toFixed(1)}s`, '等待时间']}
              />
              <Area
                type="monotone"
                dataKey="avgWaitTime"
                stroke={COLORS.primary}
                fillOpacity={1}
                fill="url(#colorWait)"
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {chartData.length > 2 && (
        <div className="p-4 rounded-xl" style={{ backgroundColor: COLORS.darkLight }}>
          <h4
            className="text-xs font-bold mb-3"
            style={{ color: COLORS.textMuted, fontFamily: 'JetBrains Mono, monospace' }}
          >
            吞吐量趋势
          </h4>
          <ResponsiveContainer width="100%" height={100}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorThroughput" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS.success} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={COLORS.success} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="time" hide />
              <YAxis hide />
              <Tooltip
                contentStyle={{
                  backgroundColor: COLORS.dark,
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: '8px',
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: '12px',
                }}
                formatter={(value: number) => [formatInt(value), '完成数']}
              />
              <Area
                type="monotone"
                dataKey="throughput"
                stroke={COLORS.success}
                fillOpacity={1}
                fill="url(#colorThroughput)"
                isAnimationActive={false}
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
              {formatInt(totalCallsReceived)}
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
              style={{
                color: getScoreColor(completionRate, 100, true),
                fontFamily: 'JetBrains Mono, monospace',
              }}
            >
              {formatPercent(completionRate, 1)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
