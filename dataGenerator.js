const fs = require('fs');
const path = require('path');

function generateTyphoonData() {
  const typhoons = [];
  const startYear = 2000;
  const endYear = 2023;
  const typhoonNames = [
    '海燕', '山竹', '威马逊', '莫兰蒂', '天鸽', '帕卡', '玛莉亚', '安比',
    '云雀', '摩羯', '温比亚', '苏力', '西马仑', '飞燕', '山猫', '北冕',
    '巴蓬', '黄蜂', '鹦鹉', '森拉克', '黑格比', '米克拉', '海高斯', '浪卡',
    '沙德尔', '艾莎尼', '环高', '科罗旺', '杜鹃', '彩云', '小熊', '蔷琵'
  ];

  for (let year = startYear; year <= endYear; year++) {
    const typhoonsPerYear = 15 + Math.floor(Math.random() * 15);
    for (let i = 0; i < typhoonsPerYear; i++) {
      const typhoon = generateSingleTyphoon(year, i, typhoonNames);
      typhoons.push(typhoon);
    }
  }

  return typhoons;
}

function generateSingleTyphoon(year, index, names) {
  const id = `${year}-${String(index + 1).padStart(2, '0')}`;
  const name = names[Math.floor(Math.random() * names.length)];
  
  const startLat = 5 + Math.random() * 15;
  const startLng = 105 + Math.random() * 40;
  
  const direction = Math.random() * Math.PI * 0.5 - Math.PI * 0.25;
  const speed = 2 + Math.random() * 4;
  
  const points = [];
  const numPoints = 20 + Math.floor(Math.random() * 30);
  
  let lat = startLat;
  let lng = startLng;
  let currentWindSpeed = 15 + Math.random() * 20;
  
  for (let i = 0; i < numPoints; i++) {
    const latChange = Math.sin(direction) * speed * (0.8 + Math.random() * 0.4);
    const lngChange = Math.cos(direction) * speed * (0.8 + Math.random() * 0.4);
    
    lat += latChange;
    lng += lngChange;
    
    if (i < numPoints * 0.3) {
      currentWindSpeed += (5 + Math.random() * 10) * 0.1;
    } else if (i > numPoints * 0.7) {
      currentWindSpeed -= (3 + Math.random() * 8) * 0.1;
    } else {
      currentWindSpeed += (Math.random() - 0.5) * 5;
    }
    
    currentWindSpeed = Math.max(10, Math.min(85, currentWindSpeed));
    
    const time = new Date(year, 5 + Math.floor(Math.random() * 5), Math.floor(Math.random() * 28) + 1, Math.floor(Math.random() * 24), Math.floor(Math.random() * 60 / 6) * 6);
    
    points.push({
      time: time.toISOString(),
      lat: Math.round(lat * 100) / 100,
      lng: Math.round(lng * 100) / 100,
      windSpeed: Math.round(currentWindSpeed * 10) / 10,
      pressure: Math.round(1000 - currentWindSpeed * 1.5 + Math.random() * 10)
    });
  }
  
  return {
    id,
    name,
    year,
    points
  };
}

const typhoonData = generateTyphoonData();
const outputPath = path.join(__dirname, 'typhoonData.json');
fs.writeFileSync(outputPath, JSON.stringify(typhoonData, null, 2));
console.log(`Generated ${typhoonData.length} typhoons with ${typhoonData.reduce((sum, t) => sum + t.points.length, 0)} total data points`);
console.log(`Data saved to ${outputPath}`);

module.exports = typhoonData;
