import { useAppStore } from "../store/appStore";
import { Settings, Grid3X3, Eye, EyeOff } from "lucide-react";

export const ControlPanel = () => {
  const { settings, updateSettings, isProcessing, quantizeResult } = useAppStore();
  const hasResult = !!quantizeResult;

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Settings className="w-5 h-5 text-primary" />
        </div>
        <h2 className="text-lg font-semibold text-primary">参数设置</h2>
      </div>

      <div className="space-y-4">
        <div>
          <label className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">网格尺寸</span>
            <span className="text-sm font-mono text-gold">
              {settings.gridSize} x {settings.gridSize}
            </span>
          </label>
          <input
            type="range"
            min="50"
            max="200"
            step="10"
            value={settings.gridSize}
            onChange={(e) =>
              updateSettings({ gridSize: parseInt(e.target.value) })
            }
            disabled={isProcessing || !hasResult}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer
              accent-primary disabled:opacity-50"
          />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>50</span>
            <span>200</span>
          </div>
        </div>

        <div className="border-t border-gray-100 pt-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
            <Grid3X3 className="w-4 h-4" />
            显示选项
          </h3>

          <div className="space-y-3">
            <label className="flex items-center justify-between cursor-pointer group">
              <span className="text-sm text-gray-600 group-hover:text-gray-900">
                显示网格线
              </span>
              <button
                onClick={() =>
                  updateSettings({ showGridLines: !settings.showGridLines })
                }
                disabled={!hasResult}
                className={`relative w-11 h-6 rounded-full transition-colors
                  ${settings.showGridLines ? "bg-primary" : "bg-gray-300"}
                  disabled:opacity-50`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow
                    transition-transform ${settings.showGridLines ? "translate-x-5" : ""}`}
                />
              </button>
            </label>

            <label className="flex items-center justify-between cursor-pointer group">
              <span className="text-sm text-gray-600 group-hover:text-gray-900">
                显示色号
              </span>
              <button
                onClick={() =>
                  updateSettings({ showColorNumbers: !settings.showColorNumbers })
                }
                disabled={!hasResult}
                className={`relative w-11 h-6 rounded-full transition-colors
                  ${settings.showColorNumbers ? "bg-primary" : "bg-gray-300"}
                  disabled:opacity-50`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow
                    transition-transform ${settings.showColorNumbers ? "translate-x-5" : ""}`}
                />
              </button>
            </label>

            <label className="flex items-center justify-between cursor-pointer group">
              <span className="text-sm text-gray-600 group-hover:text-gray-900">
                显示走线箭头
              </span>
              <button
                onClick={() =>
                  updateSettings({ showPathArrows: !settings.showPathArrows })
                }
                disabled={!hasResult}
                className={`relative w-11 h-6 rounded-full transition-colors
                  ${settings.showPathArrows ? "bg-primary" : "bg-gray-300"}
                  disabled:opacity-50`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow
                    transition-transform ${settings.showPathArrows ? "translate-x-5" : ""}`}
                />
              </button>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};
