const express = require('express');
const path = require('path');
const app = express();
const PORT = 8088;

app.use(express.static(path.join(__dirname, 'public')));

function generateChurnData() {
  const totalUsers = 1000;
  const data = [];
  for (let i = 0; i < totalUsers; i++) {
    const rand = Math.random();
    if (rand < 0.25) data.push(1);
    else if (rand < 0.45) data.push(2);
    else if (rand < 0.60) data.push(3);
    else if (rand < 0.72) data.push(4);
    else if (rand < 0.82) data.push(5);
    else if (rand < 0.90) data.push(6);
    else if (rand < 0.95) data.push(7);
    else data.push(8);
  }
  return data;
}

app.get('/api/churn-data', (req, res) => {
  res.json(generateChurnData());
});

app.listen(PORT, () => {
  console.log(`短视频流失数据分析看板已启动: http://localhost:${PORT}`);
});
