import { create } from 'zustand';

export interface MuscleTension {
  chest: number;
  back: number;
  leftArm: number;
  rightArm: number;
  leftLeg: number;
  rightLeg: number;
  abdomen: number;
  shoulder: number;
}

interface MuscleState {
  tensions: MuscleTension;
  setTension: (muscle: keyof MuscleTension, value: number) => void;
  setAllTensions: (tensions: MuscleTension) => void;
  resetTensions: () => void;
  autoAnimate: boolean;
  setAutoAnimate: (value: boolean) => void;
  showSkeleton: boolean;
  setShowSkeleton: (value: boolean) => void;
  showMuscles: boolean;
  setShowMuscles: (value: boolean) => void;
}

const defaultTensions: MuscleTension = {
  chest: 0.3,
  back: 0.3,
  leftArm: 0.2,
  rightArm: 0.2,
  leftLeg: 0.2,
  rightLeg: 0.2,
  abdomen: 0.1,
  shoulder: 0.2,
};

export const useMuscleStore = create<MuscleState>((set) => ({
  tensions: { ...defaultTensions },
  setTension: (muscle, value) =>
    set((state) => ({
      tensions: { ...state.tensions, [muscle]: value },
    })),
  setAllTensions: (tensions) => set({ tensions }),
  resetTensions: () => set({ tensions: { ...defaultTensions } }),
  autoAnimate: false,
  setAutoAnimate: (value) => set({ autoAnimate: value }),
  showSkeleton: true,
  setShowSkeleton: (value) => set({ showSkeleton: value }),
  showMuscles: true,
  setShowMuscles: (value) => set({ showMuscles: value }),
}));
