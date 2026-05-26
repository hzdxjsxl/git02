export class MapRenderer {
  constructor(canvas, villages) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.villages = villages;
    
    this.width = 0;
    this.height = 0;
    
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }
  
  resize() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    this.width = rect.width;
    this.height = rect.height;
    
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.ctx.scale(dpr, dpr);
    this.canvas.style.width = this.width + 'px';
    this.canvas.style.height = this.height + 'px';
  }
  
  toCanvasX(mapX) {
    return mapX * this.width * 0.9 + this.width * 0.05;
  }
  
  toCanvasY(mapY) {
    return mapY * this.height * 0.9 + this.height * 0.05;
  }
  
  clear() {
    this.ctx.clearRect(0, 0, this.width, this.height);
  }
  
  drawBackground() {
    const gradient = this.ctx.createRadialGradient(
      this.width / 2, this.height / 2, 0,
      this.width / 2, this.height / 2, Math.max(this.width, this.height) / 2
    );
    gradient.addColorStop(0, 'rgba(30, 58, 95, 0.3)');
    gradient.addColorStop(1, 'rgba(15, 23, 42, 0.8)');
    
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.width, this.height);
    
    this.ctx.strokeStyle = 'rgba(59, 130, 246, 0.1)';
    this.ctx.lineWidth = 1;
    
    const gridSize = 50;
    for (let x = 0; x < this.width; x += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.height);
      this.ctx.stroke();
    }
    for (let y = 0; y < this.height; y += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.width, y);
      this.ctx.stroke();
    }
  }
  
  drawTerrain() {
    this.ctx.save();
    
    const terrainGradient = this.ctx.createLinearGradient(0, 0, this.width, this.height);
    terrainGradient.addColorStop(0, 'rgba(34, 197, 94, 0.05)');
    terrainGradient.addColorStop(0.5, 'rgba(22, 163, 74, 0.08)');
    terrainGradient.addColorStop(1, 'rgba(21, 128, 61, 0.05)');
    
    this.ctx.fillStyle = terrainGradient;
    this.ctx.beginPath();
    
    this.ctx.moveTo(this.toCanvasX(0.05), this.toCanvasY(0.1));
    this.ctx.bezierCurveTo(
      this.toCanvasX(0.1), this.toCanvasY(0.05),
      this.toCanvasX(0.3), this.toCanvasY(0.02),
      this.toCanvasX(0.5), this.toCanvasY(0.08)
    );
    this.ctx.bezierCurveTo(
      this.toCanvasX(0.7), this.toCanvasY(0.03),
      this.toCanvasX(0.9), this.toCanvasY(0.08),
      this.toCanvasX(0.95), this.toCanvasY(0.15)
    );
    this.ctx.bezierCurveTo(
      this.toCanvasX(0.98), this.toCanvasY(0.4),
      this.toCanvasX(0.92), this.toCanvasY(0.6),
      this.toCanvasX(0.85), this.toCanvasY(0.8)
    );
    this.ctx.bezierCurveTo(
      this.toCanvasX(0.7), this.toCanvasY(0.95),
      this.toCanvasX(0.4), this.toCanvasY(0.98),
      this.toCanvasX(0.2), this.toCanvasY(0.9)
    );
    this.ctx.bezierCurveTo(
      this.toCanvasX(0.08), this.toCanvasY(0.75),
      this.toCanvasX(0.02), this.toCanvasY(0.5),
      this.toCanvasX(0.05), this.toCanvasY(0.1)
    );
    this.ctx.fill();
    
    this.ctx.strokeStyle = 'rgba(74, 222, 128, 0.2)';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();
    
    this.ctx.restore();
  }
  
  drawContours(simulator, levels, time) {
    this.ctx.save();
    
    const pulsePhase = (time % 100) / 100;
    
    for (let i = levels.length - 1; i >= 0; i--) {
      const level = levels[i];
      const edges = simulator.marchingSquares(level);
      
      const intensity = (i + 1) / levels.length;
      
      let r, g, b;
      if (intensity < 0.25) {
        r = 34; g = 197; b = 94;
      } else if (intensity < 0.5) {
        r = 234; g = 179; b = 8;
      } else if (intensity < 0.75) {
        r = 249; g = 115; b = 22;
      } else {
        r = 239; g = 68; b = 68;
      }
      
      const alpha = 0.15 + intensity * 0.25;
      const lineWidth = 1 + intensity * 2;
      
      this.ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
      this.ctx.lineWidth = lineWidth;
      this.ctx.lineCap = 'round';
      this.ctx.lineJoin = 'round';
      
      for (const edge of edges) {
        const x1 = this.toCanvasX(edge[0].x / simulator.gridWidth);
        const y1 = this.toCanvasY(edge[0].y / simulator.gridHeight);
        const x2 = this.toCanvasX(edge[1].x / simulator.gridWidth);
        const y2 = this.toCanvasY(edge[1].y / simulator.gridHeight);
        
        this.ctx.beginPath();
        this.ctx.moveTo(x1, y1);
        this.ctx.lineTo(x2, y2);
        this.ctx.stroke();
      }
      
      const glowAlpha = 0.05 + intensity * 0.1 * (0.5 + 0.5 * Math.sin(pulsePhase * Math.PI * 2));
      this.ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${glowAlpha})`;
      this.ctx.lineWidth = lineWidth * 3;
      
      for (const edge of edges) {
        const x1 = this.toCanvasX(edge[0].x / simulator.gridWidth);
        const y1 = this.toCanvasY(edge[0].y / simulator.gridHeight);
        const x2 = this.toCanvasX(edge[1].x / simulator.gridWidth);
        const y2 = this.toCanvasY(edge[1].y / simulator.gridHeight);
        
        this.ctx.beginPath();
        this.ctx.moveTo(x1, y1);
        this.ctx.lineTo(x2, y2);
        this.ctx.stroke();
      }
    }
    
    this.ctx.restore();
  }
  
  drawHeatmap(simulator, time) {
    this.ctx.save();
    
    const imageData = this.ctx.createImageData(this.width, this.height);
    const data = imageData.data;
    
    for (let py = 0; py < this.height; py++) {
      for (let px = 0; px < this.width; px++) {
        const mapX = (px / this.width - 0.05) / 0.9;
        const mapY = (py / this.height - 0.05) / 0.9;
        
        let value = 0;
        
        if (mapX >= 0 && mapX <= 1 && mapY >= 0 && mapY <= 1) {
          const gx = Math.floor(mapX * simulator.gridWidth);
          const gy = Math.floor(mapY * simulator.gridHeight);
          
          if (gx >= 0 && gx < simulator.gridWidth && gy >= 0 && gy < simulator.gridHeight) {
            value = simulator.grid[gy][gx];
          }
        }
        
        const idx = (py * this.width + px) * 4;
        
        if (value > 0.1) {
          const normalized = Math.min(value / 20, 1);
          
          let r, g, b, a;
          if (normalized < 0.25) {
            r = 34; g = 197; b = 94;
          } else if (normalized < 0.5) {
            r = 234; g = 179; b = 8;
          } else if (normalized < 0.75) {
            r = 249; g = 115; b = 22;
          } else {
            r = 239; g = 68; b = 68;
          }
          
          a = Math.floor(normalized * 80);
          
          data[idx] = r;
          data[idx + 1] = g;
          data[idx + 2] = b;
          data[idx + 3] = a;
        } else {
          data[idx] = 0;
          data[idx + 1] = 0;
          data[idx + 2] = 0;
          data[idx + 3] = 0;
        }
      }
    }
    
    this.ctx.putImageData(imageData, 0, 0);
    this.ctx.restore();
  }
  
  drawVillages(reportData, selectedVillageId = null) {
    this.ctx.save();
    
    for (const village of this.villages) {
      const count = reportData[village.id] || 0;
      const x = this.toCanvasX(village.x);
      const y = this.toCanvasY(village.y);
      
      let radius = 4;
      let color = 'rgba(100, 116, 139, 0.8)';
      
      if (count > 0) {
        const intensity = Math.min(count / 100, 1);
        
        if (count < 20) {
          color = 'rgba(34, 197, 94, 0.9)';
          radius = 5;
        } else if (count < 100) {
          color = 'rgba(234, 179, 8, 0.9)';
          radius = 7;
        } else if (count < 500) {
          color = 'rgba(249, 115, 22, 0.9)';
          radius = 9;
        } else {
          color = 'rgba(239, 68, 68, 0.9)';
          radius = 12;
        }
        
        if (intensity > 0.3) {
          const pulseRadius = radius * (1.5 + 0.5 * Math.sin(Date.now() / 500));
          const gradient = this.ctx.createRadialGradient(x, y, 0, x, y, pulseRadius * 2);
          gradient.addColorStop(0, color.replace('0.9', '0.3'));
          gradient.addColorStop(1, color.replace('0.9', '0'));
          
          this.ctx.fillStyle = gradient;
          this.ctx.beginPath();
          this.ctx.arc(x, y, pulseRadius * 2, 0, Math.PI * 2);
          this.ctx.fill();
        }
      }
      
      if (village.id === selectedVillageId) {
        this.ctx.strokeStyle = 'rgba(96, 165, 250, 1)';
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius + 5, 0, Math.PI * 2);
        this.ctx.stroke();
      }
      
      this.ctx.fillStyle = color;
      this.ctx.beginPath();
      this.ctx.arc(x, y, radius, 0, Math.PI * 2);
      this.ctx.fill();
      
      this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      this.ctx.lineWidth = 1;
      this.ctx.stroke();
      
      if (count > 50 || village.id === selectedVillageId) {
        this.ctx.fillStyle = 'rgba(226, 232, 240, 0.9)';
        this.ctx.font = '11px "Microsoft YaHei", sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(village.name, x, y - radius - 6);
        
        if (count > 0) {
          this.ctx.fillStyle = count > 100 ? 'rgba(248, 113, 113, 1)' : 'rgba(251, 191, 36, 1)';
          this.ctx.font = 'bold 10px Consolas, monospace';
          this.ctx.fillText(count.toString(), x, y + radius + 14);
        }
      }
    }
    
    this.ctx.restore();
  }
  
  drawWindIndicator() {
    this.ctx.save();
    
    const x = this.width - 80;
    const y = 80;
    
    this.ctx.fillStyle = 'rgba(15, 25, 45, 0.8)';
    this.ctx.beginPath();
    this.ctx.arc(x, y, 35, 0, Math.PI * 2);
    this.ctx.fill();
    
    this.ctx.strokeStyle = 'rgba(59, 130, 246, 0.5)';
    this.ctx.lineWidth = 1;
    this.ctx.stroke();
    
    const windX = 0.3;
    const windY = -0.2;
    const windLen = Math.sqrt(windX * windX + windY * windY);
    const arrowLen = 20;
    
    const endX = x + (windX / windLen) * arrowLen;
    const endY = y + (windY / windLen) * arrowLen;
    
    this.ctx.strokeStyle = 'rgba(96, 165, 250, 0.9)';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(x, y);
    this.ctx.lineTo(endX, endY);
    this.ctx.stroke();
    
    const angle = Math.atan2(windY, windX);
    const headLen = 6;
    
    this.ctx.beginPath();
    this.ctx.moveTo(endX, endY);
    this.ctx.lineTo(
      endX - headLen * Math.cos(angle - Math.PI / 6),
      endY - headLen * Math.sin(angle - Math.PI / 6)
    );
    this.ctx.moveTo(endX, endY);
    this.ctx.lineTo(
      endX - headLen * Math.cos(angle + Math.PI / 6),
      endY - headLen * Math.sin(angle + Math.PI / 6)
    );
    this.ctx.stroke();
    
    this.ctx.fillStyle = 'rgba(148, 163, 184, 0.8)';
    this.ctx.font = '10px "Microsoft YaHei", sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('风向', x, y + 50);
    
    this.ctx.restore();
  }
  
  render(simulator, reportData, currentDay, selectedVillageId = null) {
    this.clear();
    this.drawBackground();
    this.drawTerrain();
    
    const levels = simulator.getContourLevels(8);
    this.drawContours(simulator, levels, currentDay);
    this.drawHeatmap(simulator, currentDay);
    
    this.drawWindIndicator();
    this.drawVillages(reportData, selectedVillageId);
  }
}
