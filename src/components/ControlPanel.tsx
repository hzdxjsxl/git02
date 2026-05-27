import { SchedulerType, TrafficPattern } from '../types';
import { useElevatorStore } from '../store/elevatorStore';
import { SCHEDULER_NAMES, COLORS } from '../constants/config';
import { Play, Pause, RotateCcw } from 'lucide-react';

interface ControlPanelProps {
  onTrafficPatternChange: (pattern: TrafficPattern) => void;
}

export const ControlPanel = ({ onTrafficPatternChange }: ControlPanelProps) => {
  const {
    schedulerType,
    trafficPattern,
    isRunning,
    speedMultiplier,
    setSchedulerType,
    setSpeedMultiplier,
    setTrafficPattern,
    toggleSimulation,
    resetSimulation,
  } = useElevatorStore();

  const handlePatternChange = (pattern: TrafficPattern) => {
    setTrafficPattern(pattern);
    onTrafficPatternChange(pattern);
  };

  const handleToggle = () => {
    toggleSimulation();
  };

  const handleReset = () => {
    resetSimulation();
  };

  return (
    <div className="p-4 rounded-xl space-y-4" style={{ backgroundColor: COLORS.darkLight }}>
      <h3
        className="text-sm font-bold"
        style={{ color: COLORS.primary, fontFamily: 'JetBrains Mono, monospace' }}
      >
        控制面板
      </h3>

      <div className="space-y-3">
        <div>
          <label
            className="block text-xs mb-2"
            style={{ color: COLORS.textMuted, fontFamily: 'JetBrains Mono, monospace' }}
          >
            调度算法
          </label>
          <select
            value={schedulerType}
            onChange={(e) => setSchedulerType(e.target.value as SchedulerType)}
            className="w-full px-3 py-2 rounded-lg text-sm"
            style={{
              backgroundColor: COLORS.dark,
              color: COLORS.text,
              border: `1px solid ${COLORS.border}`,
              fontFamily: 'JetBrains Mono, monospace',
            }}
          >
            {Object.entries(SCHEDULER_NAMES).map(([key, name]) => (
              <option key={key} value={key}>
                {name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            className="block text-xs mb-2"
            style={{ color: COLORS.textMuted, fontFamily: 'JetBrains Mono, monospace' }}
          >
            交通模式
          </label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { value: 'morning', label: '早高峰' },
              { value: 'evening', label: '晚高峰' },
              { value: 'normal', label: '平峰' },
              { value: 'random', label: '随机' },
            ].map((item) => (
              <button
                key={item.value}
                onClick={() => handlePatternChange(item.value as TrafficPattern)}
                className="px-3 py-2 rounded-lg text-xs font-medium transition-all"
                style={{
                  backgroundColor:
                    trafficPattern === item.value ? COLORS.primary : COLORS.dark,
                  color: trafficPattern === item.value ? COLORS.dark : COLORS.text,
                  border: `1px solid ${
                    trafficPattern === item.value ? COLORS.primary : COLORS.border
                  }`,
                  fontFamily: 'JetBrains Mono, monospace',
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label
            className="block text-xs mb-2"
            style={{ color: COLORS.textMuted, fontFamily: 'JetBrains Mono, monospace' }}
          >
            模拟速度: {speedMultiplier.toFixed(1)}x
          </label>
          <input
            type="range"
            min="0.5"
            max="5"
            step="0.5"
            value={speedMultiplier}
            onChange={(e) => setSpeedMultiplier(parseFloat(e.target.value))}
            className="w-full h-2 rounded-lg appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, ${COLORS.primary} 0%, ${COLORS.primary} ${
                ((speedMultiplier - 0.5) / 4.5) * 100
              }%, ${COLORS.dark} ${((speedMultiplier - 0.5) / 4.5) * 100}%, ${COLORS.dark} 100%)`,
            }}
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleToggle}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all"
            style={{
              backgroundColor: isRunning ? COLORS.danger : COLORS.success,
              color: COLORS.dark,
              fontFamily: 'JetBrains Mono, monospace',
            }}
          >
            {isRunning ? <Pause size={16} /> : <Play size={16} />}
            {isRunning ? '暂停' : '开始'}
          </button>
          <button
            onClick={handleReset}
            className="px-4 py-3 rounded-lg font-medium transition-all"
            style={{
              backgroundColor: COLORS.dark,
              color: COLORS.text,
              border: `1px solid ${COLORS.border}`,
            }}
          >
            <RotateCcw size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};
