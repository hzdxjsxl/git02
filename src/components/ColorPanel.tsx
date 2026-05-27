import { useAppStore } from "../store/appStore";
import { Palette, Eye } from "lucide-react";
import { rgbToHex } from "../utils/colorSpace";

export const ColorPanel = () => {
  const { quantizeResult, gridResult, settings, updateSettings } = useAppStore();

  if (!quantizeResult || !gridResult) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-primary/10">
            <Palette className="w-5 h-5 text-primary" />
          </div>
          <h2 className="text-lg font-semibold text-primary">颜色清单</h2>
        </div>
        <p className="text-sm text-gray-400">处理后将显示颜色统计</p>
      </div>
    );
  }

  const { palette } = quantizeResult;
  const { colorCounts } = gridResult;

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-lg bg-primary/10">
          <Palette className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-primary">颜色清单</h2>
          <p className="text-xs text-gray-500">共 {palette.length} 种颜色</p>
        </div>
      </div>

      <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
        {palette.map((color, idx) => {
          const count = colorCounts.get(idx) || 0;
          const estimatedMeters = (count * 0.5 / 100).toFixed(2);
          const isHighlighted = settings.highlightColor === idx;

          return (
            <div
              key={color.id}
              className={`flex items-center gap-3 p-3 rounded-xl transition-all cursor-pointer
                ${isHighlighted
                  ? "ring-2 ring-gold bg-gold/5"
                  : "hover:bg-gray-50"
                }`}
              onClick={() =>
                updateSettings({
                  highlightColor: isHighlighted ? null : idx,
                })
              }
            >
              <div
                className="w-10 h-10 rounded-lg shadow-sm flex-shrink-0 border border-gray-200"
                style={{ backgroundColor: rgbToHex(color.rgb) }}
              />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-gray-900">
                    {idx + 1}
                  </span>
                  <span className="text-xs font-mono text-gray-500">
                    {color.id}
                  </span>
                </div>
                <p className="text-xs text-gray-500 truncate">{color.name}</p>
              </div>

              <div className="text-right flex-shrink-0">
                <p className="text-sm font-mono font-medium text-primary">
                  {count}
                </p>
                <p className="text-xs text-gray-400">针</p>
              </div>

              <div className="text-right flex-shrink-0 w-14">
                <p className="text-sm font-mono text-gold">
                  {estimatedMeters}m
                </p>
              </div>

              {isHighlighted && (
                <Eye className="w-4 h-4 text-gold flex-shrink-0" />
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-100">
        <p className="text-xs text-gray-500">
          * 预估用量基于每针约 0.5cm 线长，实际用量请根据针法调整
        </p>
      </div>
    </div>
  );
};
