export class SpreadSimulator {
  constructor(villages, options = {}) {
    this.villages = villages;
    this.options = {
      spreadRate: options.spreadRate || 0.8,
      decayRate: options.decayRate || 0.03,
      windFactor: options.windFactor || 0.3,
      windVector: options.windVector || { x: 0.3, y: -0.2 },
      gridResolution: options.gridResolution || 100,
      ...options
    };
    
    this.grid = [];
    this.gridWidth = this.options.gridResolution;
    this.gridHeight = this.options.gridResolution;
    
    this.initGrid();
  }
  
  initGrid() {
    this.grid = [];
    for (let y = 0; y < this.gridHeight; y++) {
      const row = [];
      for (let x = 0; x < this.gridWidth; x++) {
        row.push(0);
      }
      this.grid.push(row);
    }
  }
  
  updateParams(params) {
    Object.assign(this.options, params);
  }
  
  simulate(reportData, time = 1) {
    this.initGrid();
    
    for (const village of this.villages) {
      const count = reportData[village.id] || 0;
      if (count <= 0) continue;
      
      const gridX = Math.floor(village.x * this.gridWidth);
      const gridY = Math.floor(village.y * this.gridHeight);
      
      const intensity = Math.min(count / 100, 50);
      
      this.addSource(gridX, gridY, intensity);
    }
    
    const iterations = Math.floor(time * 10);
    for (let i = 0; i < iterations; i++) {
      this.diffuseStep();
    }
    
    return this.grid;
  }
  
  addSource(cx, cy, intensity) {
    const radius = Math.min(Math.ceil(Math.sqrt(intensity) * 2), 15);
    
    for (let y = Math.max(0, cy - radius); y < Math.min(this.gridHeight, cy + radius); y++) {
      for (let x = Math.max(0, cx - radius); x < Math.min(this.gridWidth, cx + radius); x++) {
        const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
        if (dist <= radius) {
          const value = intensity * Math.exp(-dist * 0.3);
          this.grid[y][x] += value;
        }
      }
    }
  }
  
  diffuseStep() {
    const newGrid = [];
    
    for (let y = 0; y < this.gridHeight; y++) {
      const row = [];
      for (let x = 0; x < this.gridWidth; x++) {
        let sum = 0;
        let count = 0;
        
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            
            if (nx >= 0 && nx < this.gridWidth && ny >= 0 && ny < this.gridHeight) {
              let weight = 1;
              
              if (this.options.windFactor > 0) {
                const windDot = dx * this.options.windVector.x + dy * this.options.windVector.y;
                weight += windDot * this.options.windFactor;
              }
              
              if (dx === 0 && dy === 0) {
                weight *= 4;
              }
              
              sum += this.grid[ny][nx] * Math.max(0.1, weight);
              count += Math.max(0.1, weight);
            }
          }
        }
        
        let newValue = count > 0 ? sum / count : 0;
        newValue *= (1 - this.options.decayRate);
        newValue *= this.options.spreadRate;
        
        row.push(newValue);
      }
      newGrid.push(row);
    }
    
    this.grid = newGrid;
  }
  
  getContourLevels(maxLevel = 10) {
    let maxValue = 0;
    for (let y = 0; y < this.gridHeight; y++) {
      for (let x = 0; x < this.gridWidth; x++) {
        maxValue = Math.max(maxValue, this.grid[y][x]);
      }
    }
    
    const levels = [];
    if (maxValue <= 0) return levels;
    
    for (let i = 1; i <= maxLevel; i++) {
      levels.push((i / maxLevel) * maxValue * 0.8);
    }
    
    return levels;
  }
  
  marchingSquares(level) {
    const contours = [];
    
    for (let y = 0; y < this.gridHeight - 1; y++) {
      for (let x = 0; x < this.gridWidth - 1; x++) {
        const v0 = this.grid[y][x];
        const v1 = this.grid[y][x + 1];
        const v2 = this.grid[y + 1][x + 1];
        const v3 = this.grid[y + 1][x];
        
        let index = 0;
        if (v0 >= level) index |= 1;
        if (v1 >= level) index |= 2;
        if (v2 >= level) index |= 4;
        if (v3 >= level) index |= 8;
        
        if (index === 0 || index === 15) continue;
        
        const edges = this.getContourEdges(x, y, level, index, v0, v1, v2, v3);
        if (edges.length > 0) {
          contours.push(...edges);
        }
      }
    }
    
    return contours;
  }
  
  getContourEdges(x, y, level, index, v0, v1, v2, v3) {
    const edges = [];
    
    const interpolate = (a, b, va, vb) => {
      if (Math.abs(vb - va) < 0.0001) return a;
      return a + (level - va) / (vb - va) * (b - a);
    };
    
    const top = { x: interpolate(x, x + 1, v0, v1), y: y };
    const right = { x: x + 1, y: interpolate(y, y + 1, v1, v2) };
    const bottom = { x: interpolate(x, x + 1, v3, v2), y: y + 1 };
    const left = { x: x, y: interpolate(y, y + 1, v0, v3) };
    
    switch (index) {
      case 1:
      case 14:
        edges.push([left, top]);
        break;
      case 2:
      case 13:
        edges.push([top, right]);
        break;
      case 3:
      case 12:
        edges.push([left, right]);
        break;
      case 4:
      case 11:
        edges.push([right, bottom]);
        break;
      case 6:
      case 9:
        edges.push([top, bottom]);
        break;
      case 7:
      case 8:
        edges.push([left, bottom]);
        break;
      case 5:
        edges.push([left, top], [right, bottom]);
        break;
      case 10:
        edges.push([top, right], [left, bottom]);
        break;
    }
    
    return edges;
  }
}
