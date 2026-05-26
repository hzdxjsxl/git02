export const VILLAGES = [
  { id: 1, name: '东河镇', x: 0.25, y: 0.35, population: 8500, crops: ['水稻', '玉米'] },
  { id: 2, name: '西坡村', x: 0.42, y: 0.28, population: 3200, crops: ['小麦', '大豆'] },
  { id: 3, name: '南塘乡', x: 0.65, y: 0.45, population: 12000, crops: ['水稻', '蔬菜'] },
  { id: 4, name: '北岭村', x: 0.35, y: 0.62, population: 4500, crops: ['玉米', '高粱'] },
  { id: 5, name: '中坪镇', x: 0.55, y: 0.55, population: 9800, crops: ['水稻', '小麦', '油菜'] },
  { id: 6, name: '青龙村', x: 0.18, y: 0.52, population: 2800, crops: ['茶叶', '竹子'] },
  { id: 7, name: '白虎乡', x: 0.72, y: 0.32, population: 6500, crops: ['柑橘', '蔬菜'] },
  { id: 8, name: '朱雀村', x: 0.48, y: 0.75, population: 3900, crops: ['水稻', '莲藕'] },
  { id: 9, name: '玄武镇', x: 0.82, y: 0.58, population: 7800, crops: ['玉米', '花生'] },
  { id: 10, name: '金龙村', x: 0.28, y: 0.18, population: 2100, crops: ['茶叶', '板栗'] },
  { id: 11, name: '银凤乡', x: 0.58, y: 0.22, population: 5600, crops: ['水稻', '甘蔗'] },
  { id: 12, name: '铜鼓村', x: 0.75, y: 0.72, population: 3400, crops: ['玉米', '红薯'] },
  { id: 13, name: '铁山镇', x: 0.12, y: 0.78, population: 4200, crops: ['竹子', '药材'] },
  { id: 14, name: '锡坑村', x: 0.88, y: 0.38, population: 2600, crops: ['蔬菜', '西瓜'] },
  { id: 15, name: '金坪乡', x: 0.38, y: 0.42, population: 6100, crops: ['水稻', '小麦'] },
  { id: 16, name: '银河村', x: 0.62, y: 0.68, population: 3700, crops: ['水稻', '鱼类'] },
  { id: 17, name: '星光镇', x: 0.45, y: 0.5, population: 8900, crops: ['蔬菜', '水果'] },
  { id: 18, name: '明月村', x: 0.15, y: 0.25, population: 2300, crops: ['茶叶', '油茶'] },
  { id: 19, name: '朝阳乡', x: 0.78, y: 0.48, population: 5200, crops: ['水稻', '蔬菜'] },
  { id: 20, name: '暮鼓村', x: 0.52, y: 0.38, population: 3100, crops: ['玉米', '大豆'] },
];

export const MAP_BOUNDS = {
  minX: 0,
  maxX: 1,
  minY: 0,
  maxY: 1
};

export const WIND_VECTOR = {
  x: 0.3,
  y: -0.2
};

export function generateDailyReports(days = 30) {
  const reports = [];
  const initialOutbreaks = [2, 5, 8, 11, 14, 17, 19];

  for (let day = 0; day < days; day++) {
    const dailyReport = {};

    for (const village of VILLAGES) {
      let count = 0;

      if (day === 0) {
        if (initialOutbreaks.includes(village.id)) {
          count = Math.floor(Math.random() * 50) + 20;
        }
      } else {
        const prevReport = reports[day - 1];
        const prevCount = prevReport[village.id] || 0;

        const nearbyInfected = VILLAGES.filter(v => {
          if (v.id === village.id) return false;
          const dist = Math.sqrt(
            Math.pow(v.x - village.x, 2) +
            Math.pow(v.y - village.y, 2)
          );
          return dist < 0.25 && (prevReport[v.id] || 0) > 5;
        });

        let spreadFactor = 1;
        for (const nearby of nearbyInfected) {
          const dist = Math.sqrt(
            Math.pow(nearby.x - village.x, 2) +
            Math.pow(nearby.y - village.y, 2)
          );
          const windDot = (nearby.x - village.x) * WIND_VECTOR.x +
                          (nearby.y - village.y) * WIND_VECTOR.y;
          const windBonus = windDot > 0 ? 1 + windDot * 0.8 : 1;
          const distanceMod = Math.exp(-dist * 1.5);
          spreadFactor += (prevReport[nearby.id] || 0) / 500 * distanceMod * windBonus;
        }

        const growthRate = Math.min(spreadFactor, 2.5);
        const randomVariation = 0.9 + Math.random() * 0.25;
        count = Math.floor(prevCount * growthRate * randomVariation);

        if (prevCount === 0 && nearbyInfected.length > 0) {
          const maxNearby = Math.max(...nearbyInfected.map(v => prevReport[v.id] || 0));
          const newInfectionChance = Math.min(maxNearby / 200, 0.3);
          if (Math.random() < newInfectionChance) {
            count = Math.floor(Math.random() * 15) + 5;
          }
        }
      }

      dailyReport[village.id] = Math.max(0, count);
    }

    reports.push(dailyReport);
  }

  return reports;
}
