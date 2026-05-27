import { create } from "zustand";
import { AppSettings, AppState } from "../types";

const initialSettings: AppSettings = {
  gridSize: 100,
  showGridLines: true,
  showColorNumbers: false,
  showPathArrows: true,
  highlightColor: null,
};

interface AppStore extends AppState {
  setOriginalImage: (image: HTMLImageElement, imageData: ImageData) => void;
  setQuantizeResult: (result: import("../types").QuantizeResult) => void;
  setGridResult: (result: import("../types").GridResult) => void;
  setPaths: (paths: import("../types").PathResult[]) => void;
  updateSettings: (settings: Partial<AppSettings>) => void;
  setProcessing: (isProcessing: boolean) => void;
  setProgress: (progress: number, text: string) => void;
  reset: () => void;
}

export const useAppStore = create<AppStore>((set) => ({
  originalImage: null,
  originalImageData: null,
  quantizeResult: null,
  gridResult: null,
  paths: [],
  settings: initialSettings,
  isProcessing: false,
  progress: 0,
  progressText: "",

  setOriginalImage: (image, imageData) =>
    set({
      originalImage: image,
      originalImageData: imageData,
      quantizeResult: null,
      gridResult: null,
      paths: [],
    }),

  setQuantizeResult: (result) => set({ quantizeResult: result }),
  setGridResult: (result) => set({ gridResult: result }),
  setPaths: (paths) => set({ paths }),

  updateSettings: (settings) =>
    set((state) => ({
      settings: { ...state.settings, ...settings },
    })),

  setProcessing: (isProcessing) => set({ isProcessing }),
  setProgress: (progress, text) => set({ progress, progressText: text }),

  reset: () =>
    set({
      originalImage: null,
      originalImageData: null,
      quantizeResult: null,
      gridResult: null,
      paths: [],
      settings: initialSettings,
      isProcessing: false,
      progress: 0,
      progressText: "",
    }),
}));
