import { Scheduler, calculateDistance, hasCapacity } from './types';
import { Elevator, CallRequest, BuildingConfig, DispatchResult } from '../types';

export const FCFSScheduler: Scheduler = {
  name: 'FCFS',

  dispatch(
    elevators: Elevator[],
    calls: CallRequest[],
    _buildingConfig: BuildingConfig
  ): DispatchResult[] {
    const results: DispatchResult[] = [];
    const unassignedCalls = calls.filter((c) => c.assignedElevator === null);

    for (const call of unassignedCalls) {
      let bestElevator: Elevator | null = null;
      let bestScore = Infinity;

      for (const elevator of elevators) {
        if (!hasCapacity(elevator)) continue;

        const distance = calculateDistance(elevator, call.floor);
        const workload = elevator.targetFloors.length * 2;
        const score = distance + workload;

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
