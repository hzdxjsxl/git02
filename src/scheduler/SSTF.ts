import { Scheduler, calculateDistance, hasCapacity } from './types';
import { Elevator, CallRequest, BuildingConfig, DispatchResult } from '../types';

export const SSTFScheduler: Scheduler = {
  name: 'SSTF',

  dispatch(
    elevators: Elevator[],
    calls: CallRequest[],
    _buildingConfig: BuildingConfig
  ): DispatchResult[] {
    const results: DispatchResult[] = [];
    const unassignedCalls = calls.filter((c) => c.assignedElevator === null);

    const processedElevators = new Set<number>();

    for (const call of unassignedCalls) {
      let bestElevator: Elevator | null = null;
      let bestDistance = Infinity;

      for (const elevator of elevators) {
        if (!hasCapacity(elevator)) continue;

        const distance = calculateDistance(elevator, call.floor);
        const isIdle = elevator.direction === 'idle';
        const adjustedDistance = isIdle ? distance * 0.5 : distance;

        if (adjustedDistance < bestDistance && !processedElevators.has(elevator.id)) {
          bestDistance = adjustedDistance;
          bestElevator = elevator;
        }
      }

      if (bestElevator) {
        results.push({
          elevatorId: bestElevator.id,
          addTargetFloor: call.floor,
          callId: call.id,
        });
        processedElevators.add(bestElevator.id);
      }
    }

    return results;
  },
};
