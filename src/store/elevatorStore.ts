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

interface ElevatorStore {
  elevators: Elevator[];
  calls: CallRequest[];
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
    direction: 'idle',
    state: 'idle',
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
  maxWaitTime: 0,

  setSchedulerType: (type) => set({ schedulerType: type }),
  setSpeedMultiplier: (speed) => set({ speedMultiplier: speed }),
  setTrafficPattern: (pattern) => set({ trafficPattern: pattern }),
  toggleSimulation: (running) =>
    set((state) => ({ isRunning: running !== undefined ? running : !state.isRunning })),

  addCalls: (newCalls) => {
    set((state) => ({
      calls: [...state.calls, ...newCalls],
      totalCallsReceived: state.totalCallsReceived + newCalls.length,
    }));
  },

  stepSimulation: (deltaTime) => {
    const state = get();
    if (!state.isRunning) return;

    const {
      elevators: prevElevators,
      calls: prevCalls,
      buildingConfig,
      schedulerType,
      speedMultiplier,
    } = state;

    const adjustedDelta = deltaTime * speedMultiplier;
    const timePerFloor = buildingConfig.timePerFloor / speedMultiplier;
    const doorOpenTime = buildingConfig.doorOpenTime / speedMultiplier;

    let calls = [...prevCalls];
    let elevators = prevElevators.map((e) => ({ ...e }));
    let totalCallsCompleted = state.totalCallsCompleted;
    let totalWaitTime = state.totalWaitTime;
    let maxWaitTime = state.maxWaitTime;

    const now = Date.now();

    calls = calls.map((call) => ({
      ...call,
      waitTime: now - call.timestamp,
    }));

    const scheduler = getScheduler(schedulerType);
    const dispatchResults = scheduler.dispatch(elevators, calls, buildingConfig);

    for (const result of dispatchResults) {
      const call = calls.find((c) => c.id === result.callId);
      if (call && call.assignedElevator === null) {
        call.assignedElevator = result.elevatorId;
        const elevator = elevators.find((e) => e.id === result.elevatorId);
        if (elevator && !elevator.targetFloors.includes(result.addTargetFloor)) {
          elevator.targetFloors.push(result.addTargetFloor);
        }
      }
    }

    for (const elevator of elevators) {
      if (elevator.state === 'door-open') {
        elevator.doorTimer -= adjustedDelta;
        if (elevator.doorTimer <= 0) {
          elevator.state = 'idle';
          elevator.doorTimer = 0;

          const pickedUp = calls.filter(
            (c) =>
              c.assignedElevator === elevator.id &&
              c.floor === elevator.currentFloor &&
              !c.picked
          );

          for (const call of pickedUp) {
            call.picked = true;
            const rideTime = 5000 + Math.random() * 10000;
            totalWaitTime += call.waitTime;
            maxWaitTime = Math.max(maxWaitTime, call.waitTime);
            totalCallsCompleted++;
          }

          const dropOffs = calls.filter(
            (c) => c.picked && c.floor === elevator.currentFloor
          );

          for (const call of dropOffs) {
            call.assignedElevator = -1;
          }

          calls = calls.filter((c) => c.assignedElevator !== -1);

          elevator.passengers = Math.max(
            0,
            elevator.passengers + pickedUp.length - dropOffs.length
          );
          elevator.totalRides += pickedUp.length;
        }
        continue;
      }

      if (elevator.targetFloors.length > 0) {
        elevator.state = 'moving';

        let nextFloor = elevator.targetFloors[0];

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
    const avgWaitTime = totalCallsCompleted > 0 ? totalWaitTime / totalCallsCompleted : 0;

    const elevatorUtilization = elevators.map(
      (e) => (e.passengers / e.capacity) * 100
    );
    const avgUtilization =
      elevatorUtilization.reduce((a, b) => a + b, 0) / elevatorUtilization.length;

    const congestionIndex = Math.min(
      100,
      (pendingCalls / (buildingConfig.elevatorCount / 10)) * 100
    );

    const newMetrics: PerformanceMetrics = {
      avgWaitTime,
      maxWaitTime,
      avgRideTime: 0,
      throughput: totalCallsCompleted,
      elevatorUtilization,
      totalCallsProcessed: totalCallsCompleted,
      pendingCalls,
      congestionIndex,
      timestamp: now,
    };

    const historyEntry: MetricsHistory = {
      timestamp: now,
      avgWaitTime,
      throughput: totalCallsCompleted - state.metrics.totalCallsProcessed,
      pendingCalls,
      congestionIndex,
    };

    set({
      elevators,
      calls,
      metrics: newMetrics,
      totalCallsCompleted,
      totalWaitTime,
      maxWaitTime,
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
      metrics: initialMetrics,
      metricsHistory: [],
      totalCallsReceived: 0,
      totalCallsCompleted: 0,
      totalWaitTime: 0,
      maxWaitTime: 0,
    }),
}));

export const useFloorCallStatus = (): FloorCallStatus[] => {
  const calls = useElevatorStore((state) => state.calls);
  const buildingConfig = useElevatorStore((state) => state.buildingConfig);

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
