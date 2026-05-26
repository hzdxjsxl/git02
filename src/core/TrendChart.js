export class TrendChart {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.data = [];
    this.maxDays = 30;
  }
  
  updateData(reports, villages) {
    this.data = [];
    
    for (let day = 0; day < reports.length; day++) {
      const report = reports[day];
      let total = 0;
      let infected = 0;
      
      for (const village of villages) {
        const count = report[village.id] || 0;
        total += count;
        if (count > 0) infected++;
      }
      
      this.data.push({ day, total, infected });
    }
  }
  
  render(currentDay) {
    const width = this.canvas.width;
    const height = this.canvas.height;
    
    this.ctx.clearRect(0, 0, width, height);
    
    this.ctx.strokeStyle = 'rgba(59, 130, 246, 0.1)';
    this.ctx.lineWidth = 1;
    
    for (let i = 0; i <= 4; i++) {
      const y = (height - 20) * (i / 4) + 10;
      this.ctx.beginPath();
      this.ctx.moveTo(40, y);
      this.ctx.lineTo(width - 10, y);
      this.ctx.stroke();
    }
    
    if (this.data.length < 2) return;
    
    let maxTotal = 0;
    for (const d of this.data) {
      maxTotal = Math.max(maxTotal, d.total);
    }
    maxTotal = Math.max(maxTotal, 100);
    
    const drawLine = (getData, color, lineWidth = 2) => {
      this.ctx.strokeStyle = color;
      this.ctx.lineWidth = lineWidth;
      this.ctx.lineCap = 'round';
      this.ctx.lineJoin = 'round';
      
      this.ctx.beginPath();
      let started = false;
      
      for (let i = 0; i < this.data.length; i++) {
        const d = this.data[i];
        const value = getData(d);
        const x = 40 + (i / (this.data.length - 1)) * (width - 50);
        const y = height - 20 - (value / maxTotal) * (height - 40);
        
        if (!started) {
          this.ctx.moveTo(x, y);
          started = true;
        } else {
          this.ctx.lineTo(x, y);
        }
      }
      
      this.ctx.stroke();
      
      const gradient = this.ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, color.replace(')', ', 0.2)').replace('rgb', 'rgba'));
      gradient.addColorStop(1, color.replace(')', ', 0)').replace('rgb', 'rgba'));
      
      this.ctx.fillStyle = gradient;
      this.ctx.lineTo(width - 10, height - 20);
      this.ctx.lineTo(40, height - 20);
      this.ctx.closePath();
      this.ctx.fill();
    };
    
    drawLine(d => d.total, 'rgb(249, 115, 22)');
    
    if (currentDay >= 0 && currentDay < this.data.length) {
      const d = this.data[currentDay];
      const x = 40 + (currentDay / (this.data.length - 1)) * (width - 50);
      const y = height - 20 - (d.total / maxTotal) * (height - 40);
      
      this.ctx.fillStyle = 'rgba(239, 68, 68, 0.3)';
      this.ctx.beginPath();
      this.ctx.arc(x, y, 12, 0, Math.PI * 2);
      this.ctx.fill();
      
      this.ctx.fillStyle = 'rgb(239, 68, 68)';
      this.ctx.beginPath();
      this.ctx.arc(x, y, 5, 0, Math.PI * 2);
      this.ctx.fill();
    }
    
    this.ctx.fillStyle = 'rgba(148, 163, 184, 0.8)';
    this.ctx.font = '10px Consolas, monospace';
    this.ctx.textAlign = 'right';
    
    for (let i = 0; i <= 4; i++) {
      const y = (height - 20) * (1 - i / 4) + 10;
      const value = Math.floor((maxTotal * i) / 4);
      this.ctx.fillText(value.toString(), 35, y + 3);
    }
    
    this.ctx.fillStyle = 'rgba(249, 115, 22, 0.9)';
    this.ctx.font = '11px "Microsoft YaHei", sans-serif';
    this.ctx.textAlign = 'left';
    this.ctx.fillText('虫口总数趋势', 45, 20);
  }
}
