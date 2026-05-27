import { QuantizeResult, GridResult } from "../types";

const MAX_GRID_SIZE = 100;

export const clampGridSize = (requestedSize: number): number => {
  return Math.min(Math.max(50, requestedSize), MAX_GRID_SIZE);
};

export const processGrid = (
  quantizeResult: QuantizeResult,
  gridSize: number,
  onProgress?: (progress: number, text: string) => void
): GridResult => {
  const actualGridSize = clampGridSize(gridSize);
  const { colorMap, width, height } = quantizeResult;

  if (actualGridSize !== gridSize) {
    onProgress?.(
      0,
      `网格尺寸已限制为 ${actualGridSize}x${actualGridSize}（最大支持 ${MAX_GRID_SIZE}x${MAX_GRID_SIZE}）`
    );
  } else {
    onProgress?.(0, "网格化处理...");
  }

  const cellWidth = Math.ceil(width / actualGridSize);
  const cellHeight = Math.ceil(height / actualGridSize);

  const colorCounts = new Map<number, number>();
  const colorMatrix: number[][] = [];

  const startTime = Date.now();
  let lastProgressTime = startTime;

  for (let gy = 0; gy < actualGridSize; gy++) {
    colorMatrix[gy] = [];
    const yStart = gy * cellHeight;
    const yEnd = Math.min(yStart + cellHeight, height);

    for (let gx = 0; gx < actualGridSize; gx++) {
      const xStart = gx * cellWidth;
      const xEnd = Math.min(xStart + cellWidth, width);

      const colorFreq = new Map<number, number>();
      let totalPixels = 0;

      for (let y = yStart; y < yEnd; y++) {
        for (let x = xStart; x < xEnd; x++) {
          const colorIdx = colorMap[y][x];
          if (colorIdx >= 0) {
            colorFreq.set(colorIdx, (colorFreq.get(colorIdx) || 0) + 1);
            totalPixels++;
          }
        }
      }

      let dominantColor = -1;
      let maxCount = 0;

      if (totalPixels > 0) {
        for (const [colorIdx, count] of colorFreq) {
          if (count > maxCount) {
            maxCount = count;
            dominantColor = colorIdx;
          }
        }

        colorCounts.set(dominantColor, (colorCounts.get(dominantColor) || 0) + 1);
      }

      colorMatrix[gy][gx] = dominantColor;
    }

    const now = Date.now();
    if (now - lastProgressTime > 50) {
      onProgress?.(
        ((gy + 1) / actualGridSize) * 100,
        `网格化处理 ${gy + 1}/${actualGridSize}`
      );
      lastProgressTime = now;
    }
  }

  const totalTime = Date.now() - startTime;
  onProgress?.(
    100,
    `网格化完成 (${actualGridSize}x${actualGridSize}, 耗时 ${totalTime}ms)`
  );

  return {
    gridSize: actualGridSize,
    cellSize: cellWidth,
    colorMatrix,
    colorCounts,
    width,
    height,
  };
};

export const estimateProcessingTime = (gridSize: number): number => {
  const actualSize = clampGridSize(gridSize);
  const baseTimeMs = 300;
  const gridFactor = (actualSize * actualSize) / (100 * 100);
  return Math.ceil(baseTimeMs + gridFactor * 2000);
};
