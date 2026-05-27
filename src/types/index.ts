export type Direction = 'up' | 'down' | 'idle';
export type ElevatorState = 'moving' | 'door-open' | 'idle';
export type TrafficPattern = 'morning' | 'evening' | 'normal' | 'random';
export type SchedulerType = 'fcfs' | 'sstf' | 'scan' | 'smart';

export interface Elevator {
  id: number;
  currentFloor: number;
  targetFloors: number[];
  direction: Direction;
  state: ElevatorState;
  passengers: number;
  capacity: number;
  doorTimer: number;
  totalRides: number;
}

export interface CallRequest {
  id: string;
  floor: number;
  direction: 'up' | 'down';
  timestamp: number;
  waitTime: number;
  assignedElevator: number | null;
  picked: boolean;
  destinationFloor: number;
}

export interface BuildingConfig {
  totalFloors: number;
  elevatorCount: number;
  elevatorCapacity: number;
  timePerFloor: number;
  doorOpenTime: number;
}

export interface DispatchResult {
  elevatorId: number;
  addTargetFloor: number;
  callId: string;
}

export interface Scheduler {
  name: string;
  dispatch(
    elevators: Elevator[],
    calls: CallRequest[],
    buildingConfig: BuildingConfig
  ): DispatchResult[];
}

export interface PerformanceMetrics {
  avgWaitTime: number;
  maxWaitTime: number;
  avgRideTime: number;
  throughput: number;
  elevatorUtilization: number[];
  totalCallsProcessed: number;
  pendingCalls: number;
  congestionIndex: number;
  timestamp: number;
}

export interface FloorCallStatus {
  floor: number;
  upCalls: number;
  downCalls: number;
  upWaiting: number;
  downWaiting: number;
}

export interface MetricsHistory {
  timestamp: number;
  avgWaitTime: number;
  throughput: number;
  pendingCalls: number;
  congestionIndex: number;
}
