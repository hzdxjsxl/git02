const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.static('public'));

let typhoonData = [];

function loadData() {
  const dataPath = path.join(__dirname, 'typhoonData.json');
  if (fs.existsSync(dataPath)) {
    typhoonData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    console.log(`Loaded ${typhoonData.length} typhoons from data file`);
  } else {
    console.log('Data file not found, generating new data...');
    typhoonData = require('./dataGenerator');
  }
}

loadData();

app.get('/api/typhoons', (req, res) => {
  console.log(`API request received: ${req.method} ${req.url}`);
  res.json({
    total: typhoonData.length,
    data: typhoonData
  });
});

app.get('/api/typhoons/:year', (req, res) => {
  const year = parseInt(req.params.year);
  const filtered = typhoonData.filter(t => t.year === year);
  res.json({
    total: filtered.length,
    year,
    data: filtered
  });
});

app.get('/api/years', (req, res) => {
  const years = [...new Set(typhoonData.map(t => t.year))].sort();
  res.json({ years });
});

app.listen(PORT, () => {
  console.log(`\n🚀 台风轨迹可视化服务已启动`);
  console.log(`📡 服务地址: http://localhost:${PORT}`);
  console.log(`📊 API接口: http://localhost:${PORT}/api/typhoons`);
  console.log(`📅 年份列表: http://localhost:${PORT}/api/years`);
  console.log(`\n💡 在浏览器中打开 http://localhost:${PORT} 查看可视化看板`);
});
