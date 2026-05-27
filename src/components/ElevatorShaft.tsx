import { Elevator } from '../types';
import { ElevatorCar } from './ElevatorCar';
import { COLORS } from '../constants/config';

interface ElevatorShaftProps {
  elevators: Elevator[];
  totalFloors: number;
}

export const ElevatorShaft = ({ elevators, totalFloors }: ElevatorShaftProps) => {
  const floorHeight = 24;
  const shaftHeight = totalFloors * floorHeight;

  return (
    <div className="flex gap-2 p-4" style={{ height: shaftHeight + 40 }}>
      {elevators.map((elevator) => (
        <div key={elevator.id} className="relative" style={{ width: 48 }}>
          <div
            className="absolute inset-0 rounded-lg"
            style={{
              background: `linear-gradient(180deg, ${COLORS.darkLighter} 0%, ${COLORS.dark} 100%)`,
              border: `1px solid ${COLORS.border}`,
            }}
          />
          <div className="relative h-full">
            {Array.from({ length: totalFloors }, (_, i) => totalFloors - i).map((floor) => (
              <div
                key={floor}
                className="absolute left-0 right-0 border-b border-opacity-30"
                style={{
                  top: (totalFloors - floor) * floorHeight,
                  height: floorHeight,
                  borderColor: COLORS.border,
                }}
              />
            ))}
            <ElevatorCar
              elevator={elevator}
              totalFloors={totalFloors}
              floorHeight={floorHeight}
            />
          </div>
          <div
            className="absolute -bottom-6 left-0 right-0 text-center text-xs"
            style={{ color: COLORS.textMuted, fontFamily: 'JetBrains Mono, monospace' }}
          >
            E{elevator.id + 1}
          </div>
        </div>
      ))}
    </div>
  );
};
