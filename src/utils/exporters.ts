import { GridResult, QuantizeResult, PathResult } from "../types";
import { rgbToHex } from "./colorSpace";

export const renderGridToCanvas = (
  canvas: HTMLCanvasElement,
  gridResult: GridResult,
  quantizeResult: QuantizeResult,
  showGridLines: boolean = true,
  showColorNumbers: boolean = false,
  highlightColor: number | null = null,
  cellSize: number = 8
): void => {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const { colorMatrix, gridSize } = gridResult;
  const { palette } = quantizeResult;

  canvas.width = gridSize * cellSize;
  canvas.height = gridSize * cellSize;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
      const colorIdx = colorMatrix[y][x];
      if (colorIdx < 0 || colorIdx >= palette.length) continue;

      const color = palette[colorIdx];
      const px = x * cellSize;
      const py = y * cellSize;

      if (highlightColor !== null && colorIdx !== highlightColor) {
        ctx.fillStyle = "rgba(200, 200, 200, 0.3)";
      } else {
        ctx.fillStyle = rgbToHex(color.rgb);
      }

      ctx.fillRect(px, py, cellSize, cellSize);

      if (showColorNumbers && cellSize >= 12) {
        ctx.fillStyle =
          color.lab.L > 50 ? "rgba(0,0,0,0.7)" : "rgba(255,255,255,0.9)";
        ctx.font = `${Math.floor(cellSize * 0.4)}px monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(
          String(colorIdx + 1),
          px + cellSize / 2,
          py + cellSize / 2
        );
      }
    }
  }

  if (showGridLines && cellSize >= 4) {
    ctx.strokeStyle = "rgba(0, 0, 0, 0.15)";
    ctx.lineWidth = 0.5;

    for (let i = 0; i <= gridSize; i++) {
      ctx.beginPath();
      ctx.moveTo(i * cellSize, 0);
      ctx.lineTo(i * cellSize, canvas.height);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, i * cellSize);
      ctx.lineTo(canvas.width, i * cellSize);
      ctx.stroke();
    }

    ctx.strokeStyle = "rgba(0, 0, 0, 0.4)";
    ctx.lineWidth = 1;
    const every10 = 10;

    for (let i = 0; i <= gridSize; i += every10) {
      ctx.beginPath();
      ctx.moveTo(i * cellSize, 0);
      ctx.lineTo(i * cellSize, canvas.height);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, i * cellSize);
      ctx.lineTo(canvas.width, i * cellSize);
      ctx.stroke();
    }
  }
};

export const renderPathsToCanvas = (
  canvas: HTMLCanvasElement,
  gridResult: GridResult,
  paths: PathResult[],
  quantizeResult: QuantizeResult,
  showPathArrows: boolean = true,
  cellSize: number = 8
): void => {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const { gridSize } = gridResult;
  const { palette } = quantizeResult;

  canvas.width = gridSize * cellSize;
  canvas.height = gridSize * cellSize;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = "rgba(0, 0, 0, 0.1)";
  ctx.lineWidth = 0.5;

  for (let i = 0; i <= gridSize; i++) {
    ctx.beginPath();
    ctx.moveTo(i * cellSize, 0);
    ctx.lineTo(i * cellSize, canvas.height);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, i * cellSize);
    ctx.lineTo(canvas.width, i * cellSize);
    ctx.stroke();
  }

  for (const path of paths) {
    if (path.path.length < 2) continue;

    const color = palette[path.colorIndex];
    if (!color) continue;

    ctx.strokeStyle = rgbToHex(color.rgb);
    ctx.lineWidth = Math.max(1, cellSize * 0.3);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    ctx.beginPath();
    const start = path.path[0];
    ctx.moveTo(
      start[0] * cellSize + cellSize / 2,
      start[1] * cellSize + cellSize / 2
    );

    for (let i = 1; i < path.path.length; i++) {
      const [x, y] = path.path[i];
      ctx.lineTo(x * cellSize + cellSize / 2, y * cellSize + cellSize / 2);
    }
    ctx.stroke();

    if (showPathArrows && path.path.length > 1) {
      const step = Math.max(1, Math.floor(path.path.length / 5));
      for (let i = step; i < path.path.length; i += step) {
        const [x, y] = path.path[i];
        ctx.fillStyle = rgbToHex(color.rgb);
        ctx.beginPath();
        ctx.arc(
          x * cellSize + cellSize / 2,
          y * cellSize + cellSize / 2,
          Math.max(2, cellSize * 0.15),
          0,
          Math.PI * 2
        );
        ctx.fill();

        ctx.fillStyle = "#000";
        ctx.font = `${Math.max(8, cellSize * 0.35)}px monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(
          String(i + 1),
          x * cellSize + cellSize / 2,
          y * cellSize + cellSize / 2
        );
      }
    }
  }
};

export const exportAsPNG = (
  canvas: HTMLCanvasElement,
  filename: string = "cross-stitch.png"
): void => {
  const link = document.createElement("a");
  link.download = filename;
  link.href = canvas.toDataURL("image/png");
  link.click();
};

export const exportColorList = (
  quantizeResult: QuantizeResult,
  gridResult: GridResult
): string => {
  const { palette } = quantizeResult;
  const { colorCounts } = gridResult;

  let text = "十字绣图纸 - 颜色清单\n";
  text += "================================\n\n";

  palette.forEach((color, idx) => {
    const count = colorCounts.get(idx) || 0;
    const estimatedMeters = (count * 0.5 / 100).toFixed(2);

    text += `色号 ${idx + 1}: ${color.id} (${color.name})\n`;
    text += `  RGB: (${color.rgb.r}, ${color.rgb.g}, ${color.rgb.b})\n`;
    text += `  针数: ${count}\n`;
    text += `  预估用量: ~${estimatedMeters} 米\n\n`;
  });

  return text;
};

export const downloadText = (
  content: string,
  filename: string,
  mimeType: string = "text/plain"
): void => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};
