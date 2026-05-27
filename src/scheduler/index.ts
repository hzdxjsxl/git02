import { SchedulerType } from '../types';
import { FCFSScheduler } from './FCFS';
import { SSTFScheduler } from './SSTF';
import { SCANScheduler } from './SCAN';
import { SmartDispatchScheduler } from './SmartDispatch';
import { Scheduler } from './types';

export * from './types';

export const SCHEDULERS: Record<SchedulerType, Scheduler> = {
  fcfs: FCFSScheduler,
  sstf: SSTFScheduler,
  scan: SCANScheduler,
  smart: SmartDispatchScheduler,
};

export const getScheduler = (type: SchedulerType): Scheduler => {
  return SCHEDULERS[type] || SmartDispatchScheduler;
};
