import HumanModel from '../components/HumanModel';
import ControlPanel from '../components/ControlPanel';
import InfoPanel from '../components/InfoPanel';

export default function Home() {
  return (
    <div className="w-full h-screen flex bg-gray-950 overflow-hidden">
      <div className="flex-1 relative">
        <HumanModel />
        <InfoPanel />
        <div className="absolute bottom-4 left-4 text-white/60 text-xs">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
            <span>实时模拟</span>
          </div>
          <div>顶点膨胀着色器 · 充血发红效果</div>
        </div>
      </div>
      <ControlPanel />
    </div>
  );
}
