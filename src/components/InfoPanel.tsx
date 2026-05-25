import { useMuscleStore, MuscleTension } from '../store/muscleStore';

const muscleInfo: Record<keyof MuscleTension, { name: string; function: string }> = {
  chest: { name: '胸大肌', function: '上臂内收、屈曲' },
  back: { name: '背阔肌', function: '上臂伸展、内收' },
  leftArm: { name: '左臂肌群', function: '前臂屈曲' },
  rightArm: { name: '右臂肌群', function: '前臂屈曲' },
  leftLeg: { name: '左腿肌群', function: '小腿伸展' },
  rightLeg: { name: '右腿肌群', function: '小腿伸展' },
  abdomen: { name: '腹肌', function: '躯干屈曲' },
  shoulder: { name: '肩袖肌群', function: '肩关节稳定' },
};

export default function InfoPanel() {
  const tensions = useMuscleStore((state) => state.tensions);

  const muscleKeys = Object.keys(tensions) as (keyof MuscleTension)[];
  const maxTension = Math.max(...muscleKeys.map((k) => tensions[k]));
  const maxMuscle = muscleKeys.find((k) => tensions[k] === maxTension);

  const getStatus = (tension: number) => {
    if (tension < 0.2) return { text: '放松', color: 'text-green-400' };
    if (tension < 0.5) return { text: '正常', color: 'text-yellow-400' };
    if (tension < 0.8) return { text: '紧张', color: 'text-orange-400' };
    return { text: '高负荷', color: 'text-red-400' };
  };

  return (
    <div className="absolute top-4 left-4 w-64 bg-gray-900/90 backdrop-blur-sm rounded-xl border border-gray-700 p-4 space-y-4">
      <div>
        <h2 className="text-white font-bold text-sm mb-1">体育康复分析</h2>
        <p className="text-gray-400 text-xs">实时肌肉张力监测</p>
      </div>

      <div className="bg-gray-800/50 rounded-lg p-3">
        <div className="text-xs text-gray-400 mb-1">当前最高张力</div>
        <div className="flex items-baseline gap-2">
          <span className="text-white font-bold">
            {maxMuscle ? muscleInfo[maxMuscle].name : '-'}
          </span>
          <span className="text-red-400 text-sm font-mono">
            {Math.round(maxTension * 100)}%
          </span>
        </div>
        <div className="text-xs text-gray-500 mt-1">
          {maxMuscle ? muscleInfo[maxMuscle].function : '-'}
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-xs text-gray-400">肌肉状态列表</div>
        {muscleKeys.map((key) => {
          const status = getStatus(tensions[key]);
          return (
            <div
              key={key}
              className="flex items-center justify-between py-1 border-b border-gray-700/50"
            >
              <span className="text-xs text-gray-300">
                {muscleInfo[key].name}
              </span>
              <div className="flex items-center gap-2">
                <div className="w-12 h-1 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500"
                    style={{ width: `${tensions[key] * 100}%` }}
                  />
                </div>
                <span className={`text-xs w-12 text-right ${status.color}`}>
                  {status.text}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-cyan-900/30 border border-cyan-700/50 rounded-lg p-3">
        <div className="text-xs text-cyan-400 font-medium mb-1">康复建议</div>
        <div className="text-xs text-gray-400">
          {maxTension > 0.7
            ? '注意：高负荷肌肉需要适当休息和拉伸，避免运动损伤。'
            : maxTension > 0.4
            ? '当前负荷适中，可继续保持训练强度。'
            : '肌肉处于放松状态，适合进行低强度康复训练。'}
        </div>
      </div>
    </div>
  );
}
