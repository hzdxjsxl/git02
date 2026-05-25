import { useMuscleStore, MuscleTension } from '../store/muscleStore';

const muscleLabels: Record<keyof MuscleTension, string> = {
  chest: '胸部',
  back: '背部',
  leftArm: '左臂',
  rightArm: '右臂',
  leftLeg: '左腿',
  rightLeg: '右腿',
  abdomen: '腹部',
  shoulder: '肩部',
};

const muscleColors: Record<keyof MuscleTension, string> = {
  chest: '#ff6b6b',
  back: '#4ecdc4',
  leftArm: '#45b7d1',
  rightArm: '#f9ca24',
  leftLeg: '#6c5ce7',
  rightLeg: '#a29bfe',
  abdomen: '#fd79a8',
  shoulder: '#00b894',
};

export default function ControlPanel() {
  const {
    tensions,
    setTension,
    resetTensions,
    autoAnimate,
    setAutoAnimate,
    showSkeleton,
    setShowSkeleton,
    showMuscles,
    setShowMuscles,
  } = useMuscleStore();

  const muscleKeys = Object.keys(tensions) as (keyof MuscleTension)[];
  const totalTension = muscleKeys.reduce((sum, key) => sum + tensions[key], 0);
  const avgTension = totalTension / muscleKeys.length;

  return (
    <div className="w-80 h-full bg-gray-900/95 backdrop-blur-sm border-l border-gray-700 flex flex-col overflow-hidden">
      <div className="p-4 border-b border-gray-700">
        <h2 className="text-lg font-bold text-white mb-1">肌肉张力控制</h2>
        <p className="text-xs text-gray-400">调节滑块观察肌肉膨胀效果</p>
      </div>

      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-300">整体张力</span>
          <span
            className="text-sm font-bold"
            style={{ color: `hsl(${120 - avgTension * 120}, 70%, 50%)` }}
          >
            {Math.round(avgTension * 100)}%
          </span>
        </div>
        <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full transition-all duration-300"
            style={{
              width: `${avgTension * 100}%`,
              background: `linear-gradient(90deg, #4ecdc4, #ff6b6b)`,
            }}
          />
        </div>
      </div>

      <div className="p-4 border-b border-gray-700 space-y-3">
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer flex-1">
            <input
              type="checkbox"
              checked={showSkeleton}
              onChange={(e) => setShowSkeleton(e.target.checked)}
              className="w-4 h-4 rounded bg-gray-700 border-gray-600 text-cyan-500 focus:ring-cyan-500"
            />
            <span className="text-sm text-gray-300">显示骨架</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer flex-1">
            <input
              type="checkbox"
              checked={showMuscles}
              onChange={(e) => setShowMuscles(e.target.checked)}
              className="w-4 h-4 rounded bg-gray-700 border-gray-600 text-cyan-500 focus:ring-cyan-500"
            />
            <span className="text-sm text-gray-300">显示肌肉</span>
          </label>
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={autoAnimate}
            onChange={(e) => setAutoAnimate(e.target.checked)}
            className="w-4 h-4 rounded bg-gray-700 border-gray-600 text-cyan-500 focus:ring-cyan-500"
          />
          <span className="text-sm text-gray-300">自动旋转</span>
        </label>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {muscleKeys.map((key) => (
          <div key={key} className="space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: muscleColors[key] }}
                />
                <span className="text-sm text-gray-300">{muscleLabels[key]}</span>
              </div>
              <span
                className="text-xs font-mono"
                style={{ color: muscleColors[key] }}
              >
                {Math.round(tensions[key] * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={tensions[key]}
              onChange={(e) => setTension(key, parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, ${muscleColors[key]} 0%, ${muscleColors[key]} ${tensions[key] * 100}%, #374151 ${tensions[key] * 100}%, #374151 100%)`,
              }}
            />
          </div>
        ))}
      </div>

      <div className="p-4 border-t border-gray-700 space-y-2">
        <button
          onClick={resetTensions}
          className="w-full py-2 px-4 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg transition-colors"
        >
          重置张力
        </button>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => {
              muscleKeys.forEach((key) => setTension(key, 0.8));
            }}
            className="py-2 px-3 bg-red-900/50 hover:bg-red-800/50 text-red-300 text-xs rounded-lg transition-colors"
          >
            全力模式
          </button>
          <button
            onClick={() => {
              muscleKeys.forEach((key) => setTension(key, 0.1));
            }}
            className="py-2 px-3 bg-blue-900/50 hover:bg-blue-800/50 text-blue-300 text-xs rounded-lg transition-colors"
          >
            放松模式
          </button>
        </div>
      </div>

      <div className="p-3 border-t border-gray-700 bg-gray-800/50">
        <div className="text-xs text-gray-500 text-center">
          拖动旋转 · 滚轮缩放
        </div>
      </div>
    </div>
  );
}
