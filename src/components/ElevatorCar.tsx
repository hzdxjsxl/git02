import { motion } from 'framer-motion';
import { Elevator } from '../types';
import { COLORS } from '../constants/config';

interface ElevatorCarProps {
  elevator: Elevator;
  totalFloors: number;
  floorHeight: number;
}

export const ElevatorCar = ({ elevator, totalFloors, floorHeight }: ElevatorCarProps) => {
  const positionY = (totalFloors - elevator.currentFloor) * floorHeight;
  const loadPercent = (elevator.passengers / elevator.capacity) * 100;
  const isMoving = elevator.state === 'moving';
  const isDoorOpen = elevator.state === 'door-open';

  const getStatusColor = () => {
    if (isDoorOpen) return COLORS.success;
    if (isMoving) return COLORS.primary;
    return COLORS.textMuted;
  };

  const getDirectionArrow = () => {
    if (elevator.direction === 'up') return '↑';
    if (elevator.direction === 'down') return '↓';
    return '';
  };

  return (
    <motion.div
      className="absolute left-0 right-0 mx-auto w-10 h-12 rounded-md flex items-center justify-center"
      animate={{ y: positionY }}
      transition={{ type: 'tween', ease: 'linear', duration: 0.1 }}
      style={{
        backgroundColor: isDoorOpen ? COLORS.success + '20' : COLORS.darkLighter,
        border: `2px solid ${getStatusColor()}`,
        boxShadow: isMoving ? `0 0 10px ${COLORS.primary}40` : 'none',
      }}
    >
      <div className="text-center">
        <div
          className="text-xs font-bold"
          style={{ color: getStatusColor(), fontFamily: 'JetBrains Mono, monospace' }}
        >
          {Math.round(elevator.currentFloor)}
        </div>
        <div className="text-[10px]" style={{ color: COLORS.textMuted }}>
          {getDirectionArrow()}
        </div>
      </div>
      <div
        className="absolute -bottom-1 left-1 right-1 h-1 rounded-full overflow-hidden"
        style={{ backgroundColor: COLORS.darkLight }}
      >
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${loadPercent}%`,
            backgroundColor:
              loadPercent > 80
                ? COLORS.danger
                : loadPercent > 50
                ? COLORS.warning
                : COLORS.success,
          }}
        />
      </div>
    </motion.div>
  );
};
