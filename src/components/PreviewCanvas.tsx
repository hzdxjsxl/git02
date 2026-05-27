import { useEffect, useRef } from "react";
import { useAppStore } from "../store/appStore";
import { renderGridToCanvas } from "../utils/exporters";
import { ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { useState } from "react";

export const PreviewCanvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const {
    originalImage,
    quantizeResult,
    gridResult,
    settings,
    isProcessing,
    progress,
    progressText,
  } = useAppStore();
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    if (!canvasRef.current || !gridResult || !quantizeResult) return;

    const cellSize = Math.max(4, Math.min(20, Math.floor(400 / gridResult.gridSize)));
    renderGridToCanvas(
      canvasRef.current,
      gridResult,
      quantizeResult,
      settings.showGridLines,
      settings.showColorNumbers,
      settings.highlightColor,
      cellSize
    );
  }, [
    gridResult,
    quantizeResult,
    settings.showGridLines,
    settings.showColorNumbers,
    settings.highlightColor,
  ]);

  if (!originalImage) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50 rounded-2xl">
        <div className="text-center text-gray-400">
          <p className="text-lg">请先上传一张照片</p>
          <p className="text-sm mt-2">上传后将自动转换为十字绣图纸</p>
        </div>
      </div>
    );
  }

  if (isProcessing) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50 rounded-2xl">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
          <p className="text-lg font-medium text-primary mt-4">{progressText}</p>
          <div className="w-64 h-2 bg-gray-200 rounded-full mt-4 overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-sm text-gray-500 mt-2">{Math.round(progress)}%</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-white rounded-2xl shadow-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <h3 className="font-medium text-primary">十字绣预览</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setZoom(Math.max(0.5, zoom - 0.25))}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ZoomOut className="w-4 h-4 text-gray-600" />
          </button>
          <span className="text-sm font-mono text-gray-500 w-16 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom(Math.min(3, zoom + 0.25))}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ZoomIn className="w-4 h-4 text-gray-600" />
          </button>
          <button
            onClick={() => setZoom(1)}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <RotateCcw className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 bg-gray-50 flex items-center justify-center">
        {quantizeResult && gridResult ? (
          <div
            className="transform origin-center"
            style={{ transform: `scale(${zoom})` }}
          >
            <canvas
              ref={canvasRef}
              className="rounded-lg shadow-md"
              style={{ imageRendering: "pixelated" }}
            />
          </div>
        ) : (
          <div className="text-center text-gray-400">
            <p>点击"生成图纸"开始处理</p>
          </div>
        )}
      </div>
    </div>
  );
};
