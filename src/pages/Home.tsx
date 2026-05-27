import { useEffect, useRef } from 'react';
import { useElevatorStore } from '../store/elevatorStore';
import { useWebSocket } from '../hooks/useWebSocket';
import { ElevatorShaft } from '../components/ElevatorShaft';
import { FloorPanel } from '../components/FloorPanel';
import { ControlPanel } from '../components/ControlPanel';
import { KPIDashboard } from '../components/KPIDashboard';
import { COLORS } from '../constants/config';

export default function Home() {
  const { elevators, buildingConfig, stepSimulation, isRunning } = useElevatorStore();
  const { setTrafficPattern } = useWebSocket('ws://localhost:3001/ws');
  const animationRef = useRef<number>();
  const lastTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    const animate = () => {
      const now = Date.now();
      const deltaTime = now - lastTimeRef.current;
      lastTimeRef.current = now;

      if (isRunning) {
        stepSimulation(deltaTime);
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isRunning, stepSimulation]);

  const handleTrafficPatternChange = (pattern: any) => {
    setTrafficPattern(pattern);
  };

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: COLORS.dark }}>
      <header className="mb-6">
        <h1
          className="text-3xl font-bold mb-2"
          style={{
            color: COLORS.primary,
            fontFamily: 'JetBrains Mono, monospace',
            textShadow: `0 0 20px ${COLORS.primary}40`,
          }}
        >
          🏢 电梯群控调度系统
        </h1>
        <p className="text-sm" style={{ color: COLORS.textMuted }}>
          实时监控 · 智能调度 · 效率分析
        </p>
      </header>

      <div className="flex gap-6">
        <div className="w-48">
          <ControlPanel onTrafficPatternChange={handleTrafficPatternChange} />
        </div>

        <div className="flex-1 flex flex-col items-center">
          <div
            className="p-4 rounded-xl mb-4 w-full text-center"
            style={{ backgroundColor: COLORS.darkLight }}
          >
            <div className="flex justify-around text-sm">
              <div>
                <span style={{ color: COLORS.textMuted }}>楼层数: </span>
                <span style={{ color: COLORS.primary, fontFamily: 'JetBrains Mono, monospace' }}>
                  {buildingConfig.totalFloors}
                </span>
              </div>
              <div>
                <span style={{ color: COLORS.textMuted }}>电梯数: </span>
                <span style={{ color: COLORS.primary, fontFamily: 'JetBrains Mono, monospace' }}>
                  {buildingConfig.elevatorCount}
                </span>
              </div>
              <div>
                <span style={{ color: COLORS.textMuted }}>容量: </span>
                <span style={{ color: COLORS.primary, fontFamily: 'JetBrains Mono, monospace' }}>
                  {buildingConfig.elevatorCapacity}人/梯
                </span>
              </div>
              <div>
                <span style={{ color: COLORS.textMuted }}>状态: </span>
                <span
                  style={{
                    color: isRunning ? COLORS.success : COLORS.warning,
                    fontFamily: 'JetBrains Mono, monospace',
                  }}
                >
                  {isRunning ? '● 运行中' : '○ 已暂停'}
                </span>
              </div>
            </div>
          </div>
          <div
            className="rounded-xl p-4 overflow-x-auto"
            style={{ backgroundColor: COLORS.darkLight }}
          >
            <ElevatorShaft elevators={elevators} totalFloors={buildingConfig.totalFloors} />
          </div>
        </div>

        <div className="w-64 space-y-4">
          <FloorPanel />
        </div>

        <div className="w-72">
          <KPIDashboard />
        </div>
      </div>

      <footer
        className="mt-6 text-center text-xs"
        style={{ color: COLORS.textMuted, fontFamily: 'JetBrains Mono, monospace' }}
      >
        调度算法模块已隔离 | 服务端模拟呼叫请求 | 前端实时计算电梯停靠序列
      </footer>
    </div>
  );
}
