import { useRef } from "react";
import { useAppStore } from "../store/appStore";
import { Download, FileImage, FileText } from "lucide-react";
import {
  renderGridToCanvas,
  exportAsPNG,
  exportColorList,
  downloadText,
} from "../utils/exporters";

export const ExportPanel = () => {
  const { quantizeResult, gridResult, settings } = useAppStore();
  const exportCanvasRef = useRef<HTMLCanvasElement>(null);

  const hasResult = !!quantizeResult && !!gridResult;

  const handleExportPNG = () => {
    if (!exportCanvasRef.current || !gridResult || !quantizeResult) return;

    const cellSize = Math.max(8, Math.min(20, Math.floor(800 / gridResult.gridSize)));
    renderGridToCanvas(
      exportCanvasRef.current,
      gridResult,
      quantizeResult,
      settings.showGridLines,
      settings.showColorNumbers,
      null,
      cellSize
    );

    exportAsPNG(exportCanvasRef.current, "cross-stitch-pattern.png");
  };

  const handleExportColorList = () => {
    if (!quantizeResult || !gridResult) return;
    const text = exportColorList(quantizeResult, gridResult);
    downloadText(text, "color-list.txt");
  };

  const handleExportJSON = () => {
    if (!quantizeResult || !gridResult) return;

    const data = {
      palette: quantizeResult.palette.map((c) => ({
        id: c.id,
        name: c.name,
        rgb: c.rgb,
      })),
      colorMatrix: gridResult.colorMatrix,
      gridSize: gridResult.gridSize,
    };

    downloadText(
      JSON.stringify(data, null, 2),
      "pattern-data.json",
      "application/json"
    );
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-lg bg-primary/10">
          <Download className="w-5 h-5 text-primary" />
        </div>
        <h2 className="text-lg font-semibold text-primary">导出图纸</h2>
      </div>

      <canvas ref={exportCanvasRef} className="hidden" />

      <div className="space-y-3">
        <button
          onClick={handleExportPNG}
          disabled={!hasResult}
          className={`w-full flex items-center gap-3 p-4 rounded-xl transition-all
            ${hasResult
              ? "bg-primary text-white hover:bg-primary-light active:scale-98"
              : "bg-gray-100 text-gray-400 cursor-not-allowed"
            }`}
        >
          <FileImage className="w-5 h-5" />
          <div className="text-left">
            <p className="font-medium">导出PNG图纸</p>
            <p className={`text-xs ${hasResult ? "text-white/70" : "text-gray-400"}`}>
              高清网格图纸图片
            </p>
          </div>
        </button>

        <button
          onClick={handleExportColorList}
          disabled={!hasResult}
          className={`w-full flex items-center gap-3 p-4 rounded-xl transition-all
            ${hasResult
              ? "bg-gold text-white hover:bg-gold-light active:scale-98"
              : "bg-gray-100 text-gray-400 cursor-not-allowed"
            }`}
        >
          <FileText className="w-5 h-5" />
          <div className="text-left">
            <p className="font-medium">导出颜色清单</p>
            <p className={`text-xs ${hasResult ? "text-white/70" : "text-gray-400"}`}>
              含线号、用量预估
            </p>
          </div>
        </button>

        <button
          onClick={handleExportJSON}
          disabled={!hasResult}
          className={`w-full flex items-center gap-3 p-4 rounded-xl transition-all
            ${hasResult
              ? "bg-gray-700 text-white hover:bg-gray-600 active:scale-98"
              : "bg-gray-100 text-gray-400 cursor-not-allowed"
            }`}
        >
          <FileText className="w-5 h-5" />
          <div className="text-left">
            <p className="font-medium">导出JSON数据</p>
            <p className={`text-xs ${hasResult ? "text-white/70" : "text-gray-400"}`}>
              完整图纸数据用于其他用途
            </p>
          </div>
        </button>
      </div>

      {!hasResult && (
        <p className="text-xs text-gray-400 text-center mt-4">
          请先上传并处理图片
        </p>
      )}
    </div>
  );
};
