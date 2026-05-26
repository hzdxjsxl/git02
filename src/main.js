import { VILLAGES, WIND_VECTOR, generateDailyReports } from './data/villages.js';
import { SpreadSimulator } from './core/SpreadSimulator.js';
import { MapRenderer } from './core/MapRenderer.js';
import { TrendChart } from './core/TrendChart.js';

class Dashboard {
  constructor() {
    this.dailyReports = generateDailyReports(30);
    this.currentDay = 0;
    this.selectedVillageId = null;
    this.isPlaying = false;
    this.playInterval = null;
    this.playSpeed = 1000;
    this.dirty = true;
    this.lastSimParams = null;
    
    this.params = {
      spreadRate: 0.8,
      decayRate: 0.03,
      windFactor: 0.3,
      windVector: WIND_VECTOR,
      gridResolution: 80
    };
    
    this.simulator = new SpreadSimulator(VILLAGES, this.params);
    
    this.initCanvas();
    this.initUI();
    this.bindEvents();
    this.update();
  }
  
  initCanvas() {
    const canvas = document.getElementById('map-canvas');
    this.mapRenderer = new MapRenderer(canvas, VILLAGES);
    
    const trendCanvas = document.getElementById('trend-chart');
    this.trendChart = new TrendChart(trendCanvas);
    this.trendChart.updateData(this.dailyReports, VILLAGES);
  }
  
  initUI() {
    const timelineMarks = document.getElementById('timeline-marks');
    for (let i = 0; i < 30; i++) {
      const mark = document.createElement('span');
      timelineMarks.appendChild(mark);
    }
    
    this.updateVillageList();
    this.updateRiskList();
  }
  
  bindEvents() {
    document.getElementById('btn-prev').addEventListener('click', () => {
      this.currentDay = Math.max(0, this.currentDay - 1);
      this.update();
    });
    
    document.getElementById('btn-next').addEventListener('click', () => {
      this.currentDay = Math.min(this.dailyReports.length - 1, this.currentDay + 1);
      this.update();
    });
    
    document.getElementById('btn-play').addEventListener('click', () => {
      this.togglePlay();
    });
    
    document.getElementById('timeline').addEventListener('input', (e) => {
      this.currentDay = parseInt(e.target.value);
      this.update();
    });
    
    document.getElementById('play-speed').addEventListener('change', (e) => {
      this.playSpeed = parseInt(e.target.value);
      if (this.isPlaying) {
        this.stopPlay();
        this.startPlay();
      }
    });
    
    document.getElementById('spread-rate').addEventListener('input', (e) => {
      this.params.spreadRate = parseFloat(e.target.value);
      document.getElementById('spread-rate-value').textContent = this.params.spreadRate.toFixed(1);
      this.simulator.updateParams({ spreadRate: this.params.spreadRate });
      this.update();
    });
    
    document.getElementById('decay-rate').addEventListener('input', (e) => {
      this.params.decayRate = parseFloat(e.target.value);
      document.getElementById('decay-rate-value').textContent = this.params.decayRate.toFixed(2);
      this.simulator.updateParams({ decayRate: this.params.decayRate });
      this.update();
    });
    
    document.getElementById('wind-factor').addEventListener('input', (e) => {
      this.params.windFactor = parseFloat(e.target.value);
      document.getElementById('wind-factor-value').textContent = this.params.windFactor.toFixed(1);
      this.simulator.updateParams({ windFactor: this.params.windFactor });
      this.update();
    });
    
    document.getElementById('map-canvas').addEventListener('click', (e) => {
      const rect = e.target.getBoundingClientRect();
      const clickX = (e.clientX - rect.left) / rect.width;
      const clickY = (e.clientY - rect.top) / rect.height;
      
      let closest = null;
      let minDist = Infinity;
      
      for (const village of VILLAGES) {
        const mapX = village.x * 0.9 + 0.05;
        const mapY = village.y * 0.9 + 0.05;
        const dist = Math.sqrt((clickX - mapX) ** 2 + (clickY - mapY) ** 2);
        
        if (dist < minDist && dist < 0.05) {
          minDist = dist;
          closest = village;
        }
      }
      
      this.selectedVillageId = closest ? closest.id : null;
      this.update();
    });
    
    document.addEventListener('keydown', (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        this.togglePlay();
      } else if (e.code === 'ArrowLeft') {
        this.currentDay = Math.max(0, this.currentDay - 1);
        this.update();
      } else if (e.code === 'ArrowRight') {
        this.currentDay = Math.min(this.dailyReports.length - 1, this.currentDay + 1);
        this.update();
      }
    });
  }
  
  togglePlay() {
    if (this.isPlaying) {
      this.stopPlay();
    } else {
      this.startPlay();
    }
  }
  
  startPlay() {
    this.isPlaying = true;
    document.getElementById('btn-play').textContent = '⏸';
    document.getElementById('btn-play').classList.add('pause');
    
    this.playInterval = setInterval(() => {
      if (this.currentDay < this.dailyReports.length - 1) {
        this.currentDay++;
        this.update();
      } else {
        this.currentDay = 0;
        this.update();
      }
    }, this.playSpeed);
  }
  
  stopPlay() {
    this.isPlaying = false;
    document.getElementById('btn-play').textContent = '▶';
    document.getElementById('btn-play').classList.remove('pause');
    
    if (this.playInterval) {
      clearInterval(this.playInterval);
      this.playInterval = null;
    }
  }
  
  updateVillageList() {
    const list = document.getElementById('village-list');
    list.innerHTML = '';
    
    const villagesWithCount = VILLAGES.map(v => ({
      ...v,
      count: this.dailyReports[this.currentDay][v.id] || 0
    })).sort((a, b) => b.count - a.count);
    
    for (const village of villagesWithCount) {
      const item = document.createElement('div');
      item.className = 'village-item';
      
      let level = 0;
      if (village.count > 500) level = 3;
      else if (village.count > 100) level = 2;
      else if (village.count > 0) level = 1;
      
      item.innerHTML = `
        <span class="name">${village.name}</span>
        <span class="count level-${level}">${village.count}</span>
      `;
      
      item.addEventListener('click', () => {
        this.selectedVillageId = village.id;
        this.update();
      });
      
      list.appendChild(item);
    }
  }
  
  updateRiskList() {
    const list = document.getElementById('risk-list');
    list.innerHTML = '';
    
    const riskyVillages = VILLAGES
      .map(v => ({
        ...v,
        count: this.dailyReports[this.currentDay][v.id] || 0
      }))
      .filter(v => v.count > 100)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    
    if (riskyVillages.length === 0) {
      list.innerHTML = '<div style="color: #64748b; font-size: 12px; text-align: center; padding: 20px;">暂无高风险区域</div>';
      return;
    }
    
    for (const village of riskyVillages) {
      const item = document.createElement('div');
      item.className = 'risk-item';
      item.innerHTML = `
        <span class="risk-name">${village.name}</span>
        <span class="risk-value">${village.count} 只</span>
      `;
      list.appendChild(item);
    }
  }
  
  updateHeaderStats() {
    const report = this.dailyReports[this.currentDay];
    
    let infectedCount = 0;
    let totalPests = 0;
    
    for (const village of VILLAGES) {
      const count = report[village.id] || 0;
      totalPests += count;
      if (count > 0) infectedCount++;
    }
    
    const startDate = new Date('2024-06-01');
    startDate.setDate(startDate.getDate() + this.currentDay);
    const dateStr = startDate.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    
    document.getElementById('current-date').textContent = dateStr;
    document.getElementById('infected-count').textContent = infectedCount;
    document.getElementById('total-pests').textContent = totalPests.toLocaleString();
  }
  
  updateTimeline() {
    document.getElementById('timeline').value = this.currentDay;
    document.getElementById('day-label').textContent = `第 ${this.currentDay + 1} 天`;
  }
  
  render(animationTime = 0) {
    const reportData = this.dailyReports[this.currentDay];
    
    const simKey = `${this.currentDay}-${this.params.spreadRate}-${this.params.decayRate}-${this.params.windFactor}`;
    if (simKey !== this.lastSimParams) {
      this.simulator.simulate(reportData, 6);
      this.lastSimParams = simKey;
    }
    
    this.mapRenderer.render(
      this.simulator,
      reportData,
      animationTime,
      this.selectedVillageId,
      this.params.windVector,
      this.params.windFactor
    );
    this.trendChart.render(this.currentDay);
  }

  update() {
    this.updateHeaderStats();
    this.updateVillageList();
    this.updateRiskList();
    this.updateTimeline();
    this.lastSimParams = null;
    this.render(Date.now() / 1500);
  }

  animate() {
    const animationTime = Date.now() / 1500;
    this.render(animationTime);
    requestAnimationFrame(() => this.animate());
  }
  
  start() {
    this.animate();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const dashboard = new Dashboard();
  dashboard.start();
});
