import { Scheduler, calculateDistance, isOnTheWay, hasCapacity } from './types';
import { Elevator, CallRequest, BuildingConfig, DispatchResult } from '../types';

export const SCANScheduler: Scheduler = {
  name: 'SCAN',

  dispatch(
    elevators: Elevator[],
    calls: CallRequest[],
    buildingConfig: BuildingConfig
  ): DispatchResult[] {
    const results: DispatchResult[] = [];
    const unassignedCalls = calls.filter((c) => c.assignedElevator === null);

    for (const call of unassignedCalls) {
      let bestElevator: Elevator | null = null;
      let bestScore = Infinity;

      for (const elevator of elevators) {
        if (!hasCapacity(elevator)) continue;

        const onTheWay = isOnTheWay(elevator, call.floor, call.direction);
        const distance = calculateDistance(elevator, call.floor);
        
        let score: number;
        if (onTheWay) {
          score = distance;
        } else if (elevator.direction === 'idle') {
          score = distance * 1.5;
        } else {
          const reverseDistance =
            elevator.direction === 'up'
              ? buildingConfig.totalFloors - elevator.currentFloor + buildingConfig.totalFloors - call.floor
              : elevator.currentFloor + call.floor;
          score = reverseDistance * 2;
        }

        if (score < bestScore) {
          bestScore = score;
          bestElevator = elevator;
        }
      }

      if (bestElevator) {
        results.push({
          elevatorId: bestElevator.id,
          addTargetFloor: call.floor,
          callId: call.id,
        });
      }
    }

    return results;
  },
};
