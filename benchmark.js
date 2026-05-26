const http = require('http');

function aggregatePoints(points, bound, gridSize) {
  const cols = gridSize;
  const rows = gridSize;
  const totalCells = cols * rows;

  const grid = new Float32Array(totalCells);

  const minX = bound.minX;
  const minY = bound.minY;
  const rangeX = bound.maxX - bound.minX;
  const rangeY = bound.maxY - bound.minY;

  const scaleX = cols / rangeX;
  const scaleY = rows / rangeY;

  let maxCount = 0;
  let nonEmpty = 0;

  const n = points.length;
  for (let i = 0; i < n; i += 2) {
    const px = points[i];
    const py = points[i + 1];

    let cx = Math.floor((px - minX) * scaleX);
    let cy = Math.floor((py - minY) * scaleY);
    if (cx < 0) cx = 0; else if (cx >= cols) cx = cols - 1;
    if (cy < 0) cy = 0; else if (cy >= rows) cy = rows - 1;

    const cellIdx = cy * cols + cx;
    const val = grid[cellIdx] + 1;
    grid[cellIdx] = val;
    if (val > maxCount) maxCount = val;
  }

  for (let i = 0; i < totalCells; i++) {
    if (grid[i] > 0) nonEmpty++;
  }

  return { grid, cols, rows, maxCount, nonEmpty, totalCells };
}

function fetchData() {
  return new Promise((resolve, reject) => {
    http.get('http://localhost:3000/api/trajectories', (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function benchmark() {
  console.log('=== 新能源选址数据大屏 - 聚合性能基准测试 ===\n');

  console.log('1. 拉取数据中...');
  const t0 = Date.now();
  const data = await fetchData();
  const t1 = Date.now();
  console.log(`   数据加载完成: ${t1 - t0}ms`);
  console.log(`   车辆数: ${data.vehicleCount.toLocaleString()}`);
  console.log(`   轨迹点数: ${data.totalPoints.toLocaleString()}`);
  console.log(`   坐标范围: [${data.bound.minX},${data.bound.maxX}]`);

  const gridSizes = [200, 400, 600, 800, 1000];
  const runs = 3;

  console.log('\n2. 聚合性能测试 (多次取平均):\n');
  console.log('分辨率    网格数      聚合耗时(ms)    吞吐量(点/秒)    非空格子    最大密度');
  console.log('─'.repeat(80));

  for (const gs of gridSizes) {
    let totalTime = 0;
    let maxCount = 0;
    let nonEmpty = 0;

    for (let r = 0; r < runs; r++) {
      const ts = Date.now();
      const result = aggregatePoints(data.points, data.bound, gs);
      const te = Date.now();
      totalTime += (te - ts);
      maxCount = result.maxCount;
      nonEmpty = result.nonEmpty;
    }

    const avgTime = totalTime / runs;
    const throughput = Math.floor(data.totalPoints / (avgTime / 1000));
    const cellCount = gs * gs;

    console.log(
      `${gs.toString().padStart(4)}x${gs.toString().padEnd(4)}  ${cellCount.toString().padStart(8)}   ${avgTime.toString().padStart(8).padStart(12)}   ${throughput.toLocaleString().padStart(12)}   ${nonEmpty.toString().padStart(8)}   ${maxCount.toString().padStart(6)}`
    );
  }

  console.log('\n3. 单次详细分析:');
  const gs = 400;
  console.log(`   400x400 单次聚合:`);
  for (let i = 0; i < 5; i++) {
    const ts = Date.now();
    const result = aggregatePoints(data.points, data.bound, gs);
    const te = Date.now();
    console.log(`     第 ${i + 1} 次: ${te - ts}ms, 最大密度=${result.maxCount}, 非空=${result.nonEmpty}`);
  }

  console.log('\n=== 测试完成!');
}

benchmark().catch(console.error);
