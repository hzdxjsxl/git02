import { Elevator, CallRequest, BuildingConfig, DispatchResult } from '../types';

export interface Scheduler {
  name: string;
  dispatch(
    elevators: Elevator[],
    calls: CallRequest[],
    buildingConfig: BuildingConfig
  ): DispatchResult[];
}

export const calculateDistance = (
  elevator: Elevator,
  targetFloor: number
): number => {
  return Math.abs(elevator.currentFloor - targetFloor);
};

export const isOnTheWay = (
  elevator: Elevator,
  callFloor: number,
  callDirection: 'up' | 'down'
): boolean => {
  if (elevator.direction === 'idle') return true;
  
  if (elevator.direction === 'up' && callDirection === 'up') {
    return callFloor >= elevator.currentFloor;
  }
  
  if (elevator.direction === 'down' && callDirection === 'down') {
    return callFloor <= elevator.currentFloor;
  }
  
  return false;
};

export const hasCapacity = (elevator: Elevator): boolean => {
  return elevator.passengers < elevator.capacity;
};

export const getElevatorWorkload = (elevator: Elevator): number => {
  return elevator.targetFloors.length + (elevator.state !== 'idle' ? 1 : 0);
};
