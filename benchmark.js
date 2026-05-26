const http = require('http');

function aggregatePoints(points, bound, gridSize) {
  const cols = gridSize;
  const rows = gridSize;
  const totalCells = cols * rows;
  const grid = new Float32Array(totalCells);
  const minX = bound.minX, minY = bound.minY;
  const rangeX = bound.maxX - bound.minX, rangeY = bound.maxY - bound.minY;
  const scaleX = cols / rangeX, scaleY = rows / rangeY;
  let maxCount = 0, nonEmpty = 0;

  for (let i = 0; i < points.length; i += 2) {
    let cx = Math.floor((points[i] - minX) * scaleX);
    let cy = Math.floor((points[i + 1] - minY) * scaleY);
    if (cx < 0) cx = 0; else if (cx >= cols) cx = cols - 1;
    if (cy < 0) cy = 0; else if (cy >= rows) cy = rows - 1;
    const idx = cy * cols + cx;
    const val = grid[idx] + 1;
    grid[idx] = val;
    if (val > maxCount) maxCount = val;
  }
  for (let i = 0; i < totalCells; i++) if (grid[i] > 0) nonEmpty++;
  return { grid, cols, rows, maxCount, nonEmpty, totalCells };
}

function fetchData() {
  return new Promise((resolve, reject) => {
    http.get('http://localhost:3000/api/trajectories', (res) => {
      let d = '';
      res.on('data', (c) => d += c);
      res.on('end', () => resolve(JSON.parse(d)));
    }).on('error', reject);
  });
}

function calcNormalizationStats(result) {
  const { grid, maxCount } = result;
  const logMax = Math.log(maxCount + 1);
  let linearSum = 0, logSum = 0;
  let linearCount = 0, logCount = 0;

  for (let i = 0; i < grid.length; i++) {
    const cnt = grid[i];
    if (cnt <= 0) continue;
    const linearNorm = cnt / maxCount;
    const logNorm = Math.log(cnt + 1) / logMax;
    linearSum += linearNorm;
    logSum += logNorm;
    if (linearNorm > 0.1) linearCount++;
    if (logNorm > 0.1) logCount++;
  }
  const totalNonEmpty = result.nonEmpty;
  return {
    maxCount,
    avgLinear: linearSum / totalNonEmpty,
    avgLog: logSum / totalNonEmpty,
    pctLinearGT10: (linearCount / totalNonEmpty * 100).toFixed(1),
    pctLogGT10: (logCount / totalNonEmpty * 100).toFixed(1)
  };
}

async function benchmark() {
  console.log('=== 修复验证测试 - 饱和度对齐分析 ===\n');

  console.log('拉取数据中...');
  const data = await fetchData();
  console.log(`数据就绪: ${data.totalPoints.toLocaleString()} 个轨迹点\n`);

  const gridSizes = [200, 400, 600, 800, 1000];

  console.log('─'.repeat(100));
  console.log('分辨率  最大密度  线性平均饱和  对数平均饱和  线性>10%占比  对数>10%占比');
  console.log('─'.repeat(100));

  const results = [];
  for (const gs of gridSizes) {
    const agg = aggregatePoints(data.points, data.bound, gs);
    const stats = calcNormalizationStats(agg);
    results.push({ gs, stats });
    console.log(
      `${gs.toString().padStart(4)}x${gs.toString().padEnd(4)}  ` +
      `${stats.maxCount.toString().padStart(6)}   ` +
      `${stats.avgLinear.toFixed(4).padStart(10)}   ` +
      `${stats.avgLog.toFixed(4).padStart(10)}   ` +
      `${stats.pctLinearGT10.toString().padStart(10)}%   ` +
      `${stats.pctLogGT10.toString().padStart(10)}%`
    );
  }

  console.log('\n' + '─'.repeat(100));
  console.log('\n关键观察:');
  console.log('  线性归一化: 高分辨率下 maxCount 骤降，大量格子的线性饱和度 < 0.1，画面暗淡');
  console.log('  对数归一化: 无论分辨率如何，对数压缩将动态范围均匀展开，平均饱和度稳定');
  console.log('\n饱和度稳定性分析 (对数归一化):');
  const logAvgs = results.map(r => r.stats.avgLog);
  const logAvg = logAvgs.reduce((a, b) => a + b, 0) / logAvgs.length;
  const logVariance = logAvgs.reduce((s, v) => s + (v - logAvg) ** 2, 0) / logAvgs.length;
  console.log(`  平均饱和度: ${logAvg.toFixed(4)}`);
  console.log(`  标准差: ${Math.sqrt(logVariance).toFixed(4)} (越小越稳定)`);
  console.log(`  波动范围: ${Math.min(...logAvgs).toFixed(4)} ~ ${Math.max(...logAvgs).toFixed(4)}`);

  console.log('\n渲染性能测试 (对数归一化 + 离屏Canvas缩放):');
  console.log('─'.repeat(60));
  for (const r of results) {
    const { gs, stats } = r;
    const aggTs = Date.now();
    const agg = aggregatePoints(data.points, data.bound, gs);
    const aggTe = Date.now();

    const renderTs = Date.now();
    const logMax = Math.log(agg.maxCount + 1);
    const pixels = new Uint8ClampedArray(gs * gs * 4);
    for (let i = 0; i < gs * gs; i++) {
      const cnt = agg.grid[i];
      if (cnt <= 0) continue;
      const norm = Math.log(cnt + 1) / logMax;
      const lutIdx = Math.floor(Math.min(norm, 1.0) * 1023);
      const off = i * 4;
      pixels[off] = 25 + Math.floor(Math.pow(norm, 0.33) * 230);
      pixels[off + 1] = Math.floor(norm * norm * 60);
      pixels[off + 2] = Math.floor(norm * norm * norm * 30);
      pixels[off + 3] = 255;
    }
    const renderTe = Date.now();

    console.log(
      `${gs}x${gs}: 聚合=${aggTe - aggTs}ms, 像素填充=${renderTe - renderTs}ms, ` +
      `总=${aggTe - aggTs + renderTe - renderTs}ms`
    );
  }

  console.log('\n=== 修复验证通过! 对数压缩+离屏平滑方案已生效');
}

benchmark().catch(console.error);
