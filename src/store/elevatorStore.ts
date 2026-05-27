import { create } from 'zustand';
import {
  Elevator,
  CallRequest,
  BuildingConfig,
  PerformanceMetrics,
  SchedulerType,
  TrafficPattern,
  MetricsHistory,
  FloorCallStatus,
} from '../types';
import { BUILDING_CONFIG, SIMULATION_CONFIG } from '../constants/config';
import { getScheduler } from '../scheduler';

interface Passenger {
  id: string;
  startFloor: number;
  destinationFloor: number;
  callTime: number;
  pickupTime: number | null;
  dropoffTime: number | null;
  elevatorId: number | null;
}

interface ElevatorStore {
  elevators: Elevator[];
  calls: CallRequest[];
  passengers: Passenger[];
  buildingConfig: BuildingConfig;
  schedulerType: SchedulerType;
  trafficPattern: TrafficPattern;
  isRunning: boolean;
  speedMultiplier: number;
  metrics: PerformanceMetrics;
  metricsHistory: MetricsHistory[];
  totalCallsReceived: number;
  totalCallsCompleted: number;
  totalWaitTime: number;
  totalRideTime: number;
  maxWaitTime: number;

  setSchedulerType: (type: SchedulerType) => void;
  setSpeedMultiplier: (speed: number) => void;
  setTrafficPattern: (pattern: TrafficPattern) => void;
  toggleSimulation: (running?: boolean) => void;
  addCalls: (calls: CallRequest[]) => void;
  stepSimulation: (deltaTime: number) => void;
  resetSimulation: () => void;
}

const createInitialElevators = (config: BuildingConfig): Elevator[] => {
  return Array.from({ length: config.elevatorCount }, (_, i) => ({
    id: i,
    currentFloor: 1,
    targetFloors: [],
    direction: 'idle' as const,
    state: 'idle' as const,
    passengers: 0,
    capacity: config.elevatorCapacity,
    doorTimer: 0,
    totalRides: 0,
  }));
};

const initialMetrics: PerformanceMetrics = {
  avgWaitTime: 0,
  maxWaitTime: 0,
  avgRideTime: 0,
  throughput: 0,
  elevatorUtilization: [],
  totalCallsProcessed: 0,
  pendingCalls: 0,
  congestionIndex: 0,
  timestamp: Date.now(),
};

export const useElevatorStore = create<ElevatorStore>((set, get) => ({
  elevators: createInitialElevators(BUILDING_CONFIG),
  calls: [],
  passengers: [],
  buildingConfig: BUILDING_CONFIG,
  schedulerType: 'smart',
  trafficPattern: 'morning',
  isRunning: false,
  speedMultiplier: 1,
  metrics: initialMetrics,
  metricsHistory: [],
  totalCallsReceived: 0,
  totalCallsCompleted: 0,
  totalWaitTime: 0,
  totalRideTime: 0,
  maxWaitTime: 0,

  setSchedulerType: (type) => set({ schedulerType: type }),
  setSpeedMultiplier: (speed) => set({ speedMultiplier: speed }),
  setTrafficPattern: (pattern) => set({ trafficPattern: pattern }),
  toggleSimulation: (running) =>
    set((state) => ({ isRunning: running !== undefined ? running : !state.isRunning })),

  addCalls: (newCalls) => {
    set((state) => {
      const newPassengers: Passenger[] = newCalls.map((call) => ({
        id: call.id,
        startFloor: call.floor,
        destinationFloor: call.destinationFloor,
        callTime: call.timestamp,
        pickupTime: null,
        dropoffTime: null,
        elevatorId: null,
      }));

      return {
        calls: [...state.calls, ...newCalls],
        passengers: [...state.passengers, ...newPassengers],
        totalCallsReceived: state.totalCallsReceived + newCalls.length,
      };
    });
  },

  stepSimulation: (deltaTime) => {
    const state = get();
    if (!state.isRunning) return;

    const {
      elevators: prevElevators,
      calls: prevCalls,
      passengers: prevPassengers,
      buildingConfig,
      schedulerType,
      speedMultiplier,
      totalCallsCompleted,
      totalWaitTime,
      totalRideTime,
      maxWaitTime,
    } = state;

    const adjustedDelta = deltaTime * speedMultiplier;
    const timePerFloor = buildingConfig.timePerFloor / speedMultiplier;
    const doorOpenTime = buildingConfig.doorOpenTime / speedMultiplier;

    let elevators = prevElevators.map((e) => ({ ...e, targetFloors: [...e.targetFloors] }));
    let calls = prevCalls.map((c) => ({ ...c }));
    let passengers = prevPassengers.map((p) => ({ ...p }));
    let newTotalCallsCompleted = totalCallsCompleted;
    let newTotalWaitTime = totalWaitTime;
    let newTotalRideTime = totalRideTime;
    let newMaxWaitTime = maxWaitTime;

    const now = Date.now();

    calls = calls.map((call) => ({
      ...call,
      waitTime: now - call.timestamp,
    }));

    const scheduler = getScheduler(schedulerType);
    const unassignedCalls = calls.filter((c) => c.assignedElevator === null && !c.picked);
    const dispatchResults = scheduler.dispatch(elevators, unassignedCalls, buildingConfig);

    for (const result of dispatchResults) {
      const call = calls.find((c) => c.id === result.callId);
      const passenger = passengers.find((p) => p.id === result.callId);
      if (call && call.assignedElevator === null && !call.picked && passenger) {
        call.assignedElevator = result.elevatorId;
        passenger.elevatorId = result.elevatorId;
        const elevator = elevators.find((e) => e.id === result.elevatorId);
        if (elevator) {
          if (!elevator.targetFloors.includes(result.addTargetFloor)) {
            const insertIndex = findInsertPosition(elevator, result.addTargetFloor);
            elevator.targetFloors.splice(insertIndex, 0, result.addTargetFloor);
          }
        }
      }
    }

    for (const elevator of elevators) {
      if (elevator.state === 'door-open') {
        elevator.doorTimer -= adjustedDelta;

        if (elevator.doorTimer <= 0) {
          const currentFloor = Math.round(elevator.currentFloor);

          const arrivingPassengers = passengers.filter(
            (p) =>
              p.elevatorId === elevator.id &&
              p.pickupTime !== null &&
              p.dropoffTime === null &&
              p.destinationFloor === currentFloor
          );

          for (const passenger of arrivingPassengers) {
            passenger.dropoffTime = now;
            const rideTime = passenger.dropoffTime - passenger.pickupTime!;
            newTotalRideTime += rideTime;
            newTotalCallsCompleted++;
          }

          const passengersAfterArrival = elevator.passengers - arrivingPassengers.length;
          const availableSpace = Math.max(0, elevator.capacity - passengersAfterArrival);

          const waitingPassengers = passengers.filter(
            (p) =>
              p.elevatorId === elevator.id &&
              p.pickupTime === null &&
              p.startFloor === currentFloor
          );

          const canBoard = waitingPassengers.slice(0, availableSpace);
          const cannotBoard = waitingPassengers.slice(availableSpace);

          for (const passenger of canBoard) {
            passenger.pickupTime = now;
            const waitTime = passenger.pickupTime - passenger.callTime;
            newTotalWaitTime += waitTime;
            newMaxWaitTime = Math.max(newMaxWaitTime, waitTime);

            if (!elevator.targetFloors.includes(passenger.destinationFloor)) {
              const insertIndex = findInsertPosition(elevator, passenger.destinationFloor);
              elevator.targetFloors.splice(insertIndex, 0, passenger.destinationFloor);
            }
          }

          for (const passenger of cannotBoard) {
            passenger.elevatorId = null;
            const call = calls.find((c) => c.id === passenger.id);
            if (call) {
              call.assignedElevator = null;
            }
          }

          elevator.passengers = Math.min(
            elevator.capacity,
            passengersAfterArrival + canBoard.length
          );
          elevator.totalRides += canBoard.length;

          const processedIds = new Set([
            ...arrivingPassengers.map((p) => p.id),
            ...canBoard.map((p) => p.id),
          ]);

          calls = calls.filter((c) => !processedIds.has(c.id) || !c.picked);
          passengers = passengers.filter((p) => p.dropoffTime === null);

          elevator.state = 'idle';
          elevator.doorTimer = 0;

          if (elevator.targetFloors.length === 0) {
            elevator.direction = 'idle';
          }
        }
        continue;
      }

      if (elevator.targetFloors.length > 0) {
        elevator.state = 'moving';
        const nextFloor = elevator.targetFloors[0];

        if (elevator.currentFloor < nextFloor) {
          elevator.direction = 'up';
          elevator.currentFloor = Math.min(
            nextFloor,
            elevator.currentFloor + adjustedDelta / timePerFloor
          );
        } else if (elevator.currentFloor > nextFloor) {
          elevator.direction = 'down';
          elevator.currentFloor = Math.max(
            nextFloor,
            elevator.currentFloor - adjustedDelta / timePerFloor
          );
        }

        if (Math.abs(elevator.currentFloor - nextFloor) < 0.01) {
          elevator.currentFloor = nextFloor;
          elevator.targetFloors.shift();
          elevator.state = 'door-open';
          elevator.doorTimer = doorOpenTime;
        }
      } else {
        elevator.state = 'idle';
        elevator.direction = 'idle';
      }
    }

    const pendingCalls = calls.filter((c) => !c.picked).length;
    const avgWaitTime = newTotalCallsCompleted > 0 ? newTotalWaitTime / newTotalCallsCompleted : 0;
    const avgRideTime = newTotalCallsCompleted > 0 ? newTotalRideTime / newTotalCallsCompleted : 0;

    const elevatorUtilization = elevators.map(
      (e) => (e.passengers / e.capacity) * 100
    );

    const congestionIndex = Math.min(
      100,
      (pendingCalls / Math.max(buildingConfig.elevatorCount * 5, 1)) * 100
    );

    const newMetrics: PerformanceMetrics = {
      avgWaitTime,
      maxWaitTime: newMaxWaitTime,
      avgRideTime,
      throughput: newTotalCallsCompleted,
      elevatorUtilization,
      totalCallsProcessed: newTotalCallsCompleted,
      pendingCalls,
      congestionIndex,
      timestamp: now,
    };

    const historyEntry: MetricsHistory = {
      timestamp: now,
      avgWaitTime,
      throughput: newTotalCallsCompleted - state.metrics.totalCallsProcessed,
      pendingCalls,
      congestionIndex,
    };

    set({
      elevators,
      calls,
      passengers,
      metrics: newMetrics,
      totalCallsCompleted: newTotalCallsCompleted,
      totalWaitTime: newTotalWaitTime,
      totalRideTime: newTotalRideTime,
      maxWaitTime: newMaxWaitTime,
      metricsHistory: [
        ...state.metricsHistory.slice(-SIMULATION_CONFIG.metricsHistorySize),
        historyEntry,
      ],
    });
  },

  resetSimulation: () =>
    set({
      elevators: createInitialElevators(BUILDING_CONFIG),
      calls: [],
      passengers: [],
      metrics: initialMetrics,
      metricsHistory: [],
      totalCallsReceived: 0,
      totalCallsCompleted: 0,
      totalWaitTime: 0,
      totalRideTime: 0,
      maxWaitTime: 0,
    }),
}));

function findInsertPosition(elevator: Elevator, targetFloor: number): number {
  if (elevator.targetFloors.length === 0) return 0;

  const currentFloor = Math.round(elevator.currentFloor);
  const direction = elevator.direction;

  if (direction === 'up') {
    if (targetFloor > currentFloor) {
      for (let i = 0; i < elevator.targetFloors.length; i++) {
        if (elevator.targetFloors[i] > currentFloor && elevator.targetFloors[i] > targetFloor) {
          return i;
        }
      }
      return elevator.targetFloors.length;
    } else {
      for (let i = 0; i < elevator.targetFloors.length; i++) {
        if (elevator.targetFloors[i] < currentFloor && elevator.targetFloors[i] > targetFloor) {
          return i;
        }
      }
      return elevator.targetFloors.length;
    }
  } else if (direction === 'down') {
    if (targetFloor < currentFloor) {
      for (let i = 0; i < elevator.targetFloors.length; i++) {
        if (elevator.targetFloors[i] < currentFloor && elevator.targetFloors[i] < targetFloor) {
          return i;
        }
      }
      return elevator.targetFloors.length;
    } else {
      for (let i = 0; i < elevator.targetFloors.length; i++) {
        if (elevator.targetFloors[i] > currentFloor && elevator.targetFloors[i] < targetFloor) {
          return i;
        }
      }
      return elevator.targetFloors.length;
    }
  }

  const distance = Math.abs(targetFloor - currentFloor);
  for (let i = 0; i < elevator.targetFloors.length; i++) {
    if (Math.abs(elevator.targetFloors[i] - currentFloor) > distance) {
      return i;
    }
  }
  return elevator.targetFloors.length;
}

export const useFloorCallStatus = (): FloorCallStatus[] => {
  const calls = useElevatorStore((state) => state.calls);
  const buildingConfig = useElevatorStore((state) => state.buildingConfig);
  const passengers = useElevatorStore((state) => state.passengers);

  const statusMap = new Map<number, FloorCallStatus>();

  for (let i = 1; i <= buildingConfig.totalFloors; i++) {
    statusMap.set(i, {
      floor: i,
      upCalls: 0,
      downCalls: 0,
      upWaiting: 0,
      downWaiting: 0,
    });
  }

  for (const call of calls) {
    if (call.picked) continue;
    const status = statusMap.get(call.floor);
    if (status) {
      if (call.direction === 'up') {
        status.upCalls++;
        status.upWaiting += call.waitTime;
      } else {
        status.downCalls++;
        status.downWaiting += call.waitTime;
      }
    }
  }

  return Array.from(statusMap.values());
};
