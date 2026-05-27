import { QuantizeResult, GridResult } from "../types";

export const processGrid = (
  quantizeResult: QuantizeResult,
  gridSize: number,
  onProgress?: (progress: number, text: string) => void
): GridResult => {
  const { colorMap, width, height } = quantizeResult;

  onProgress?.(0, "网格化处理...");

  const cellWidth = Math.ceil(width / gridSize);
  const cellHeight = Math.ceil(height / gridSize);

  const colorCounts = new Map<number, number>();
  const colorMatrix: number[][] = [];

  for (let gy = 0; gy < gridSize; gy++) {
    colorMatrix[gy] = [];
    const yStart = gy * cellHeight;
    const yEnd = Math.min(yStart + cellHeight, height);

    for (let gx = 0; gx < gridSize; gx++) {
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

    onProgress?.(((gy + 1) / gridSize) * 100, `网格化处理 ${gy + 1}/${gridSize}`);
  }

  onProgress?.(100, "网格化完成");

  return {
    gridSize,
    cellSize: cellWidth,
    colorMatrix,
    colorCounts,
    width,
    height,
  };
};
