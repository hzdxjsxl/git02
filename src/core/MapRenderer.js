export class MapRenderer {
  constructor(canvas, villages) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.villages = villages;

    this.width = 0;
    this.height = 0;
    this.offsetX = 0;
    this.offsetY = 0;
    this.scale = 1;

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

    const padding = 60;
    this.offsetX = padding;
    this.offsetY = padding;
    this.scale = Math.min(this.width - padding * 2, this.height - padding * 2);
  }

  gridToCanvas(gridX, gridY, gridWidth, gridHeight) {
    const normalizedX = gridX / gridWidth;
    const normalizedY = gridY / gridHeight;
    return {
      x: this.offsetX + normalizedX * this.scale,
      y: this.offsetY + normalizedY * this.scale
    };
  }

  clear() {
    this.ctx.clearRect(0, 0, this.width, this.height);
  }

  drawBaseMap() {
    const gradient = this.ctx.createRadialGradient(
      this.width / 2, this.height / 2, 0,
      this.width / 2, this.height / 2, Math.max(this.width, this.height) / 2
    );
    gradient.addColorStop(0, 'rgba(15, 35, 60, 1)');
    gradient.addColorStop(1, 'rgba(5, 15, 30, 1)');

    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.width, this.height);

    this.ctx.strokeStyle = 'rgba(59, 130, 246, 0.08)';
    this.ctx.lineWidth = 1;

    const gridSize = 40;
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

    this.ctx.strokeStyle = 'rgba(74, 222, 128, 0.15)';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(this.offsetX, this.offsetY, this.scale, this.scale);

    this.ctx.fillStyle = 'rgba(34, 197, 94, 0.03)';
    this.ctx.fillRect(this.offsetX, this.offsetY, this.scale, this.scale);
  }

  getContourColor(intensity, alpha = 1) {
    const colors = [
      { r: 34, g: 197, b: 94 },
      { r: 16, g: 185, b: 129 },
      { r: 20, g: 184, b: 166 },
      { r: 6, g: 182, b: 212 },
      { r: 14, g: 165, b: 233 },
      { r: 59, g: 130, b: 246 },
      { r: 249, g: 115, b: 22 },
      { r: 239, g: 68, b: 68 }
    ];

    const idx = Math.min(Math.floor(intensity * colors.length), colors.length - 1);
    const color = colors[idx];
    return `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`;
  }

  drawContourRings(simulator, animationPhase = 0) {
    const levels = simulator.generateContourLevels(8);
    if (levels.length === 0) return;

    const gridWidth = simulator.gridWidth;
    const gridHeight = simulator.gridHeight;

    for (let levelIndex = levels.length - 1; levelIndex >= 0; levelIndex--) {
      const level = levels[levelIndex];
      const paths = simulator.buildContourPaths(level);

      const intensity = levelIndex / levels.length;
      const lineWidth = 1 + intensity * 2.5;

      this.ctx.save();

      const baseAlpha = 0.25 + intensity * 0.45;
      this.ctx.strokeStyle = this.getContourColor(intensity, baseAlpha);
      this.ctx.lineWidth = lineWidth;
      this.ctx.lineCap = 'round';
      this.ctx.lineJoin = 'round';

      for (const path of paths) {
        if (path.length < 3) continue;

        this.ctx.beginPath();

        const first = this.gridToCanvas(path[0].x, path[0].y, gridWidth, gridHeight);
        this.ctx.moveTo(first.x, first.y);

        for (let i = 1; i < path.length; i++) {
          const point = this.gridToCanvas(path[i].x, path[i].y, gridWidth, gridHeight);
          this.ctx.lineTo(point.x, point.y);
        }

        this.ctx.stroke();
      }

      if (levelIndex % 2 === 0) {
        this.ctx.fillStyle = this.getContourColor(intensity, 0.06);

        for (const path of paths) {
          if (path.length < 3) continue;

          this.ctx.beginPath();

          const first = this.gridToCanvas(path[0].x, path[0].y, gridWidth, gridHeight);
          this.ctx.moveTo(first.x, first.y);

          for (let i = 1; i < path.length; i++) {
            const point = this.gridToCanvas(path[i].x, path[i].y, gridWidth, gridHeight);
            this.ctx.lineTo(point.x, point.y);
          }

          this.ctx.closePath();
          this.ctx.fill();
        }
      }

      this.ctx.restore();
    }
  }

  drawScalarFieldHeatmap(simulator) {
    const gridWidth = simulator.gridWidth;
    const gridHeight = simulator.gridHeight;

    const cellWidth = this.scale / gridWidth;
    const cellHeight = this.scale / gridHeight;

    const maxVal = simulator.getMaxValue();
    if (maxVal <= 0.01) return;

    const step = 3;

    for (let gy = 0; gy < gridHeight; gy += step) {
      for (let gx = 0; gx < gridWidth; gx += step) {
        let sum = 0;
        let count = 0;

        for (let dy = 0; dy < step && gy + dy < gridHeight; dy++) {
          for (let dx = 0; dx < step && gx + dx < gridWidth; dx++) {
            sum += simulator.getValue(gx + dx, gy + dy);
            count++;
          }
        }

        const avg = sum / count;
        if (avg < 0.5) continue;

        const normalized = Math.min(avg / maxVal, 1);

        const pos = this.gridToCanvas(gx + step / 2, gy + step / 2, gridWidth, gridHeight);

        let r, g, b, a;
        if (normalized < 0.2) {
          r = 34; g = 197; b = 94; a = normalized * 0.3;
        } else if (normalized < 0.4) {
          r = 234; g = 179; b = 8; a = normalized * 0.4;
        } else if (normalized < 0.7) {
          r = 249; g = 115; b = 22; a = normalized * 0.5;
        } else {
          r = 239; g = 68; b = 68; a = normalized * 0.6;
        }

        this.ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${a})`;
        this.ctx.fillRect(
          pos.x - cellWidth * step / 2,
          pos.y - cellHeight * step / 2,
          cellWidth * step,
          cellHeight * step
        );
      }
    }
  }

  drawVillageMarkers(reportData, selectedVillageId = null) {
    for (const village of this.villages) {
      const count = reportData[village.id] || 0;
      const x = this.offsetX + village.x * this.scale;
      const y = this.offsetY + village.y * this.scale;

      let radius = 4;
      let color = 'rgba(100, 116, 139, 0.9)';
      let strokeColor = 'rgba(148, 163, 184, 0.8)';

      if (count > 0) {
        if (count < 20) {
          color = 'rgba(34, 197, 94, 1)';
          radius = 5;
        } else if (count < 100) {
          color = 'rgba(234, 179, 8, 1)';
          radius = 7;
        } else if (count < 500) {
          color = 'rgba(249, 115, 22, 1)';
          radius = 9;
        } else {
          color = 'rgba(239, 68, 68, 1)';
          radius = 11;
        }
        strokeColor = 'rgba(255, 255, 255, 0.9)';
      }

      if (village.id === selectedVillageId) {
        this.ctx.strokeStyle = 'rgba(96, 165, 250, 1)';
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius + 6, 0, Math.PI * 2);
        this.ctx.stroke();
      }

      this.ctx.fillStyle = color;
      this.ctx.beginPath();
      this.ctx.arc(x, y, radius, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.strokeStyle = strokeColor;
      this.ctx.lineWidth = 1.5;
      this.ctx.stroke();

      if (count > 30 || village.id === selectedVillageId) {
        this.ctx.fillStyle = 'rgba(226, 232, 240, 1)';
        this.ctx.font = '11px "Microsoft YaHei", sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(village.name, x, y - radius - 8);

        if (count > 0) {
          this.ctx.fillStyle = count > 100 ? 'rgba(248, 113, 113, 1)' : 'rgba(251, 191, 36, 1)';
          this.ctx.font = 'bold 10px Consolas, monospace';
          this.ctx.fillText(count.toString(), x, y + radius + 16);
        }
      }
    }
  }

  drawWindIndicator(windVector, windFactor) {
    const centerX = this.width - 70;
    const centerY = this.offsetY + 50;

    this.ctx.save();

    this.ctx.fillStyle = 'rgba(15, 25, 45, 0.9)';
    this.ctx.beginPath();
    this.ctx.arc(centerX, centerY, 32, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.strokeStyle = 'rgba(59, 130, 246, 0.4)';
    this.ctx.lineWidth = 1;
    this.ctx.stroke();

    const len = Math.sqrt(windVector.x ** 2 + windVector.y ** 2);
    const normX = windVector.x / len;
    const normY = windVector.y / len;

    const arrowLength = 18 + windFactor * 10;
    const endX = centerX + normX * arrowLength;
    const endY = centerY + normY * arrowLength;

    this.ctx.strokeStyle = 'rgba(96, 165, 250, 1)';
    this.ctx.lineWidth = 2.5;
    this.ctx.lineCap = 'round';

    this.ctx.beginPath();
    this.ctx.moveTo(centerX, centerY);
    this.ctx.lineTo(endX, endY);
    this.ctx.stroke();

    const angle = Math.atan2(normY, normX);
    const headLen = 7;

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

    this.ctx.fillStyle = 'rgba(148, 163, 184, 0.9)';
    this.ctx.font = '10px "Microsoft YaHei", sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('风向', centerX, centerY + 48);

    this.ctx.fillStyle = 'rgba(96, 165, 250, 0.9)';
    this.ctx.font = 'bold 10px Consolas, monospace';
    this.ctx.fillText(`${(windFactor * 100).toFixed(0)}%`, centerX, centerY + 4);

    this.ctx.restore();
  }

  render(simulator, reportData, animationTime = 0, selectedVillageId = null, windVector, windFactor) {
    this.clear();
    this.drawBaseMap();
    this.drawScalarFieldHeatmap(simulator);
    this.drawContourRings(simulator, animationTime);
    this.drawWindIndicator(windVector, windFactor);
    this.drawVillageMarkers(reportData, selectedVillageId);
  }
}
