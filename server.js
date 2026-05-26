const express = require('express');
const path = require('path');
const app = express();
const PORT = 3000;

app.use(express.static(path.join(__dirname, 'public')));

const CITY_BOUND = { minX: 0, maxX: 20000, minY: 0, maxY: 20000 };
const VEHICLE_COUNT = 50000;

function seededRandom(seed) {
  let s = seed;
  return function () {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function generateTrajectories() {
  const rand = seededRandom(42);
  const points = [];

  for (let v = 0; v < VEHICLE_COUNT; v++) {
    const cx = CITY_BOUND.minX + rand() * (CITY_BOUND.maxX - CITY_BOUND.minX);
    const cy = CITY_BOUND.minY + rand() * (CITY_BOUND.maxY - CITY_BOUND.minY);

    const hotspotBias = rand();
    let hx = cx, hy = cy;
    if (hotspotBias < 0.35) {
      hx = 4000 + rand() * 2000;
      hy = 6000 + rand() * 2000;
    } else if (hotspotBias < 0.6) {
      hx = 13000 + rand() * 2000;
      hy = 12000 + rand() * 2000;
    } else if (hotspotBias < 0.8) {
      hx = 8000 + rand() * 3000;
      hy = 14000 + rand() * 2000;
    }

    const pointCount = 5 + Math.floor(rand() * 15);

    for (let p = 0; p < pointCount; p++) {
      const t = p / pointCount;
      const x = cx + (hx - cx) * t + (rand() - 0.5) * 800;
      const y = cy + (hy - cy) * t + (rand() - 0.5) * 800;
      points.push(x);
      points.push(y);
    }
  }

  return {
    bound: CITY_BOUND,
    points: points,
    vehicleCount: VEHICLE_COUNT,
    totalPoints: points.length / 2
  };
}

app.get('/api/trajectories', (req, res) => {
  console.log('生成轨迹数据中...');
  const data = generateTrajectories();
  console.log(`完成: ${data.vehicleCount} 辆车, ${data.totalPoints} 个轨迹点`);
  res.json(data);
});

app.listen(PORT, () => {
  console.log(`新能源选址数据大屏服务已启动: http://localhost:${PORT}`);
});
