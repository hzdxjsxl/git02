import { useAppStore } from "../store/appStore";
import { Route, ChevronRight } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { renderPathsToCanvas } from "../utils/exporters";
import { rgbToHex } from "../utils/colorSpace";

export const PathPanel = () => {
  const { quantizeResult, gridResult, paths, settings } = useAppStore();
  const [selectedColor, setSelectedColor] = useState<number>(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !gridResult || !quantizeResult || paths.length === 0) return;

    const selectedPath = paths[selectedColor];
    if (!selectedPath || selectedPath.path.length === 0) {
      const ctx = canvasRef.current.getContext("2d");
      if (ctx) {
        canvasRef.current.width = 200;
        canvasRef.current.height = 200;
        ctx.fillStyle = "#f5f5f5";
        ctx.fillRect(0, 0, 200, 200);
        ctx.fillStyle = "#999";
        ctx.font = "12px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("此颜色无路径", 100, 100);
      }
      return;
    }

    const cellSize = Math.max(3, Math.floor(200 / gridResult.gridSize));
    const filteredPaths = [selectedPath];
    renderPathsToCanvas(
      canvasRef.current,
      gridResult,
      filteredPaths,
      quantizeResult,
      settings.showPathArrows,
      cellSize
    );
  }, [selectedColor, paths, gridResult, quantizeResult, settings.showPathArrows]);

  if (!paths || paths.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-primary/10">
            <Route className="w-5 h-5 text-primary" />
          </div>
          <h2 className="text-lg font-semibold text-primary">走线指引</h2>
        </div>
        <p className="text-sm text-gray-400">处理后将显示走线路径</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-lg bg-primary/10">
          <Route className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-primary">走线指引</h2>
          <p className="text-xs text-gray-500">选择颜色查看路径</p>
        </div>
      </div>

      <div className="flex gap-1 mb-4 overflow-x-auto pb-2">
        {paths.map((path, idx) => {
          const color = quantizeResult?.palette[idx];
          if (!color || path.path.length === 0) return null;

          return (
            <button
              key={idx}
              onClick={() => setSelectedColor(idx)}
              className={`flex-shrink-0 w-8 h-8 rounded-lg border-2 transition-all
                ${selectedColor === idx
                  ? "border-gold scale-110"
                  : "border-transparent hover:scale-105"
                }`}
              style={{ backgroundColor: rgbToHex(color.rgb) }}
              title={`${idx + 1}. ${color.name} (${path.stitchCount}针)`}
            />
          );
        })}
      </div>

      <div className="flex justify-center mb-4 bg-gray-50 rounded-xl p-4">
        <canvas
          ref={canvasRef}
          className="rounded-lg"
          style={{ imageRendering: "pixelated", maxWidth: "100%" }}
        />
      </div>

      {paths[selectedColor] && paths[selectedColor].path.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">路径信息</span>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-gray-50 rounded-lg p-2">
              <p className="text-gray-500">总针数</p>
              <p className="font-mono font-medium text-primary">
                {paths[selectedColor].stitchCount}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-2">
              <p className="text-gray-500">路径长度</p>
              <p className="font-mono font-medium text-gold">
                {paths[selectedColor].totalLength.toFixed(1)}
              </p>
            </div>
          </div>

          <div className="mt-4 max-h-32 overflow-y-auto">
            <p className="text-xs text-gray-500 mb-2">穿线顺序预览:</p>
            <div className="flex flex-wrap gap-1">
              {paths[selectedColor].path.slice(0, 50).map((point, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center justify-center w-6 h-6 text-xs
                    rounded bg-primary/10 text-primary font-mono"
                  title={`(${point[0]}, ${point[1]})`}
                >
                  {idx + 1}
                </span>
              ))}
              {paths[selectedColor].path.length > 50 && (
                <span className="text-xs text-gray-400 self-center">
                  +{paths[selectedColor].path.length - 50} 更多...
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
