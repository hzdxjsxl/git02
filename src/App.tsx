import { useState, useCallback } from "react";
import { UploadArea } from "./components/UploadArea";
import { ControlPanel } from "./components/ControlPanel";
import { PreviewCanvas } from "./components/PreviewCanvas";
import { ColorPanel } from "./components/ColorPanel";
import { PathPanel } from "./components/PathPanel";
import { ExportPanel } from "./components/ExportPanel";
import { useAppStore } from "./store/appStore";
import { Wand2, Sparkles, RotateCcw } from "lucide-react";

function App() {
  const { originalImage, quantizeResult, isProcessing, reset } = useAppStore();
  const [showUpload, setShowUpload] = useState(!originalImage);

  const handleUploadComplete = useCallback(() => {
    setShowUpload(false);
  }, []);

  const handleProcess = useCallback(async () => {
    const { originalImageData, settings, setProcessing, setProgress, setQuantizeResult, setGridResult, setPaths } = useAppStore.getState();

    if (!originalImageData) return;

    setProcessing(true);
    setProgress(0, "开始处理...");

    try {
      const { quantizeColors } = await import("./utils/colorQuantizer");
      const quantize = quantizeColors(originalImageData, 20, 30, (p, t) => {
        setProgress(p * 0.5, t);
      });

      setQuantizeResult(quantize);
      setProgress(50, "网格化处理...");

      const { processGrid } = await import("./utils/gridProcessor");
      const grid = processGrid(quantize, settings.gridSize, (p, t) => {
        setProgress(50 + p * 0.3, t);
      });

      setGridResult(grid);
      setProgress(80, "计算路径...");

      const { findPaths } = await import("./utils/pathFinder");
      const pathResults = findPaths(grid, quantize.palette.length, (p, t) => {
        setProgress(80 + p * 0.2, t);
      });

      setPaths(pathResults);
      setProgress(100, "处理完成！");

      setTimeout(() => setProcessing(false), 500);
    } catch (error) {
      console.error("处理失败:", error);
      setProcessing(false);
      alert("处理失败，请重试");
    }
  }, []);

  const handleReset = useCallback(() => {
    reset();
    setShowUpload(true);
  }, [reset]);

  if (showUpload) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-dark via-primary to-primary-light">
        <div className="container mx-auto px-4 py-12">
          <header className="text-center mb-12">
            <div className="inline-flex items-center gap-3 mb-4">
              <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-sm">
                <Sparkles className="w-8 h-8 text-gold" />
              </div>
              <h1 className="text-4xl font-bold text-white">
                十字绣图纸生成器
              </h1>
            </div>
            <p className="text-lg text-white/70 max-w-xl mx-auto">
              将照片自动转换为专业的十字绣刺绣图纸，包含颜色量化和路径规划
            </p>
          </header>

          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
              <div className="p-8">
                <UploadArea onUploadComplete={handleUploadComplete} />
              </div>

              <div className="bg-gray-50 px-8 py-6 border-t border-gray-100">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">
                  功能特点
                </h3>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="p-3 rounded-xl bg-white">
                    <div className="w-8 h-8 mx-auto mb-2 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Wand2 className="w-4 h-4 text-primary" />
                    </div>
                    <p className="text-xs text-gray-600">智能配色</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white">
                    <div className="w-8 h-8 mx-auto mb-2 rounded-lg bg-gold/10 flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-gold" />
                    </div>
                    <p className="text-xs text-gray-600">20色量化</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white">
                    <div className="w-8 h-8 mx-auto mb-2 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Wand2 className="w-4 h-4 text-primary" />
                    </div>
                    <p className="text-xs text-gray-600">路径优化</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <footer className="text-center mt-12 text-white/50 text-sm">
            <p>支持 JPG、PNG、WebP 格式 | 纯前端处理，隐私安全</p>
          </footer>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10">
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-primary">
                  十字绣图纸生成器
                </h1>
                <p className="text-xs text-gray-500">Cross Stitch Pattern Generator</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {!quantizeResult && !isProcessing && (
                <button
                  onClick={handleProcess}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl
                    bg-primary text-white font-medium
                    hover:bg-primary-light active:scale-98 transition-all
                    shadow-lg shadow-primary/20"
                >
                  <Wand2 className="w-4 h-4" />
                  生成图纸
                </button>
              )}

              <button
                onClick={handleReset}
                disabled={isProcessing}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl
                  border border-gray-200 text-gray-600
                  hover:bg-gray-50 active:scale-98 transition-all
                  disabled:opacity-50"
              >
                <RotateCcw className="w-4 h-4" />
                重新上传
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 lg:col-span-3 space-y-6">
            <ControlPanel />
            <ExportPanel />
          </div>

          <div className="col-span-12 lg:col-span-6">
            <PreviewCanvas />
          </div>

          <div className="col-span-12 lg:col-span-3 space-y-6">
            <ColorPanel />
            <PathPanel />
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
