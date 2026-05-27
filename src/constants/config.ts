import { BuildingConfig } from '../types';

export const BUILDING_CONFIG: BuildingConfig = {
  totalFloors: 30,
  elevatorCount: 10,
  elevatorCapacity: 20,
  timePerFloor: 500,
  doorOpenTime: 2000,
};

export const HOT_FLOORS = [1, 10, 20, 30];
export const HOT_FLOOR_MULTIPLIER = 2;

export const SIMULATION_CONFIG = {
  callsPerSecond: 50,
  speedMultiplier: 1,
  metricsHistorySize: 60,
};

export const SCHEDULER_NAMES: Record<string, string> = {
  fcfs: '先来先服务 (FCFS)',
  sstf: '最短寻道 (SSTF)',
  scan: '扫描算法 (SCAN)',
  smart: '智能顺路捎带',
};

export const COLORS = {
  primary: '#00D4FF',
  secondary: '#7B61FF',
  success: '#00FF88',
  warning: '#FF8800',
  danger: '#FF3366',
  dark: '#0A0E17',
  darkLight: '#121826',
  darkLighter: '#1A2235',
  border: '#2A3550',
  text: '#E2E8F0',
  textMuted: '#94A3B8',
};

export const generateId = (): string => {
  return Math.random().toString(36).substring(2, 11);
};
