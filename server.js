const express = require('express');
const path = require('path');
const app = express();
const PORT = 3000;

app.use(express.static(path.join(__dirname, 'public')));

const countries = [
  { code: 'CN', name: '中国', color: '#ff6b6b' },
  { code: 'US', name: '美国', color: '#4ecdc4' },
  { code: 'JP', name: '日本', color: '#45b7d1' },
  { code: 'DE', name: '德国', color: '#96ceb4' },
  { code: 'UK', name: '英国', color: '#ffeaa7' },
  { code: 'FR', name: '法国', color: '#dfe6e9' },
  { code: 'IT', name: '意大利', color: '#fd79a8' },
  { code: 'KR', name: '韩国', color: '#a29bfe' },
  { code: 'CA', name: '加拿大', color: '#00b894' },
  { code: 'BR', name: '巴西', color: '#e17055' },
  { code: 'RU', name: '俄罗斯', color: '#6c5ce7' },
  { code: 'IN', name: '印度', color: '#e84393' },
  { code: 'AU', name: '澳大利亚', color: '#00cec9' },
  { code: 'ES', name: '西班牙', color: '#fab1a0' },
  { code: 'MX', name: '墨西哥', color: '#55efc4' },
  { code: 'ID', name: '印度尼西亚', color: '#81ecec' },
  { code: 'NL', name: '荷兰', color: '#fdcb6e' },
  { code: 'SA', name: '沙特阿拉伯', color: '#e17055' },
  { code: 'TR', name: '土耳其', color: '#74b9ff' },
  { code: 'CH', name: '瑞士', color: '#a29bfe' },
  { code: 'PL', name: '波兰', color: '#55efc4' },
  { code: 'SE', name: '瑞典', color: '#81ecec' },
  { code: 'BE', name: '比利时', color: '#fdcb6e' },
  { code: 'AR', name: '阿根廷', color: '#fab1a0' },
  { code: 'NO', name: '挪威', color: '#74b9ff' },
  { code: 'TH', name: '泰国', color: '#55efc4' },
  { code: 'AE', name: '阿联酋', color: '#fdcb6e' },
  { code: 'NG', name: '尼日利亚', color: '#00b894' },
  { code: 'ZA', name: '南非', color: '#e84393' },
  { code: 'SG', name: '新加坡', color: '#00cec9' }
];

function generateTradeData() {
  const tradeData = [];
  const minValue = 50;
  const maxValue = 5000;

  for (let i = 0; i < countries.length; i++) {
    for (let j = 0; j < countries.length; j++) {
      if (i !== j) {
        const exportValue = Math.floor(Math.random() * (maxValue - minValue + 1)) + minValue;
        const importValue = Math.floor(Math.random() * (maxValue - minValue + 1)) + minValue;
        tradeData.push({
          from: countries[i].code,
          to: countries[j].code,
          export: exportValue,
          import: importValue,
          balance: exportValue - importValue
        });
      }
    }
  }

  return {
    countries: countries,
    trade: tradeData
  };
}

app.get('/api/trade-data', (req, res) => {
  const data = generateTradeData();
  res.json(data);
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`贸易流向数据看板已启动: http://localhost:${PORT}`);
});
