export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface LAB {
  L: number;
  a: number;
  b: number;
}

export interface FlossColor {
  id: string;
  name: string;
  rgb: RGB;
  lab: LAB;
}

export interface QuantizeResult {
  palette: FlossColor[];
  colorMap: number[][];
  width: number;
  height: number;
}

export interface GridResult {
  gridSize: number;
  cellSize: number;
  colorMatrix: number[][];
  colorCounts: Map<number, number>;
  width: number;
  height: number;
}

export interface PathResult {
  colorIndex: number;
  path: [number, number][];
  totalLength: number;
  stitchCount: number;
}

export interface AppSettings {
  gridSize: number;
  showGridLines: boolean;
  showColorNumbers: boolean;
  showPathArrows: boolean;
  highlightColor: number | null;
}

export interface AppState {
  originalImage: HTMLImageElement | null;
  originalImageData: ImageData | null;
  quantizeResult: QuantizeResult | null;
  gridResult: GridResult | null;
  paths: PathResult[];
  settings: AppSettings;
  isProcessing: boolean;
  progress: number;
  progressText: string;
}
