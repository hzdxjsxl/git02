import { Scheduler, calculateDistance, isOnTheWay, hasCapacity, getElevatorWorkload } from './types';
import { Elevator, CallRequest, BuildingConfig, DispatchResult } from '../types';

export const SmartDispatchScheduler: Scheduler = {
  name: 'SmartDispatch',

  dispatch(
    elevators: Elevator[],
    calls: CallRequest[],
    buildingConfig: BuildingConfig
  ): DispatchResult[] {
    const results: DispatchResult[] = [];
    const unassignedCalls = calls.filter((c) => c.assignedElevator === null);

    const pendingByElevator = new Map<number, number>();
    elevators.forEach((e) => pendingByElevator.set(e.id, 0));

    for (const call of unassignedCalls) {
      let bestElevator: Elevator | null = null;
      let bestScore = Infinity;

      for (const elevator of elevators) {
        if (!hasCapacity(elevator)) continue;

        const onTheWay = isOnTheWay(elevator, call.floor, call.direction);
        const distance = calculateDistance(elevator, call.floor);
        const workload = getElevatorWorkload(elevator);
        const pendingCount = pendingByElevator.get(elevator.id) || 0;

        let score: number;

        if (onTheWay && elevator.direction !== 'idle') {
          const nextTargets = elevator.targetFloors.filter((f) =>
            elevator.direction === 'up' ? f >= elevator.currentFloor : f <= elevator.currentFloor
          );
          const hasCloserStop = nextTargets.some((f) =>
            elevator.direction === 'up'
              ? f >= call.floor && f < elevator.currentFloor
              : f <= call.floor && f > elevator.currentFloor
          );
          
          if (hasCloserStop) {
            score = distance + workload * 0.3 + pendingCount * 0.5;
          } else {
            score = distance * 0.3 + workload * 0.5 + pendingCount * 0.3;
          }
        } else if (elevator.direction === 'idle') {
          score = distance * 0.8 + workload * 0.4 + pendingCount * 0.3;
        } else {
          const reversePenalty = 3;
          const totalFloors = buildingConfig.totalFloors;
          const reverseDistance =
            elevator.direction === 'up'
              ? totalFloors - elevator.currentFloor + totalFloors - call.floor
              : elevator.currentFloor + call.floor;
          score = reverseDistance * reversePenalty + workload * 0.8 + pendingCount * 0.5;
        }

        const capacityFactor = 1 + (elevator.passengers / elevator.capacity) * 0.5;
        score *= capacityFactor;

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
        pendingByElevator.set(
          bestElevator.id,
          (pendingByElevator.get(bestElevator.id) || 0) + 1
        );
      }
    }

    return results;
  },
};
