class DirtyRegionRenderer {
  constructor(canvas, cellSize = 2) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.cellSize = cellSize;
    this.dirtyRegions = [];
    this.viewport = { x: 0, y: 0, width: 0, height: 0 };
    this.data = null;
    this.dataWidth = 0;
    this.dataHeight = 0;
    this.isRendering = false;
    this.pendingRender = null;
    
    this.offscreenCanvas = document.createElement('canvas');
    this.offscreenCtx = this.offscreenCanvas.getContext('2d');
  }

  setData(data, width, height) {
    this.data = data;
    this.dataWidth = width;
    this.dataHeight = height;
    this.markAllDirty();
  }

  setViewport(x, y, width, height) {
    const oldViewport = { ...this.viewport };
    this.viewport = { x, y, width, height };
    
    if (oldViewport.x !== x || oldViewport.y !== y || 
        oldViewport.width !== width || oldViewport.height !== height) {
      this.markViewportDirty();
      this.scheduleRender();
    }
  }

  setCellSize(size) {
    this.cellSize = size;
    this.markAllDirty();
    this.scheduleRender();
  }

  markAllDirty() {
    this.dirtyRegions = [{
      x: 0,
      y: 0,
      width: this.dataWidth,
      height: this.dataHeight
    }];
  }

  markViewportDirty() {
    const cellX = Math.floor(this.viewport.x / this.cellSize);
    const cellY = Math.floor(this.viewport.y / this.cellSize);
    const cellWidth = Math.ceil(this.viewport.width / this.cellSize) + 2;
    const cellHeight = Math.ceil(this.viewport.height / this.cellSize) + 2;
    
    this.dirtyRegions.push({
      x: Math.max(0, cellX - 1),
      y: Math.max(0, cellY - 1),
      width: Math.min(cellWidth, this.dataWidth - cellX + 2),
      height: Math.min(cellHeight, this.dataHeight - cellY + 2)
    });
  }

  markRegionDirty(x, y, width, height) {
    this.dirtyRegions.push({ x, y, width, height });
  }

  mergeDirtyRegions() {
    if (this.dirtyRegions.length === 0) return [];
    if (this.dirtyRegions.length === 1) return this.dirtyRegions;

    const merged = [...this.dirtyRegions];
    let changed = true;
    
    while (changed) {
      changed = false;
      for (let i = 0; i < merged.length; i++) {
        for (let j = i + 1; j < merged.length; j++) {
          const r1 = merged[i];
          const r2 = merged[j];
          
          if (this.regionsOverlapOrAdjacent(r1, r2)) {
            merged[i] = this.mergeTwoRegions(r1, r2);
            merged.splice(j, 1);
            changed = true;
            j--;
          }
        }
      }
    }
    
    return merged;
  }

  regionsOverlapOrAdjacent(r1, r2) {
    const tolerance = 50;
    return !(r1.x + r1.width + tolerance < r2.x ||
             r2.x + r2.width + tolerance < r1.x ||
             r1.y + r1.height + tolerance < r2.y ||
             r2.y + r2.height + tolerance < r1.y);
  }

  mergeTwoRegions(r1, r2) {
    const x = Math.min(r1.x, r2.x);
    const y = Math.min(r1.y, r2.y);
    const width = Math.max(r1.x + r1.width, r2.x + r2.width) - x;
    const height = Math.max(r1.y + r1.height, r2.y + r2.height) - y;
    return { x, y, width, height };
  }

  clipRegionToViewport(region) {
    const cellX = Math.floor(this.viewport.x / this.cellSize);
    const cellY = Math.floor(this.viewport.y / this.cellSize);
    const cellWidth = Math.ceil(this.viewport.width / this.cellSize) + 1;
    const cellHeight = Math.ceil(this.viewport.height / this.cellSize) + 1;
    
    const viewportRegion = {
      x: Math.max(0, cellX),
      y: Math.max(0, cellY),
      width: Math.min(cellWidth, this.dataWidth - cellX),
      height: Math.min(cellHeight, this.dataHeight - cellY)
    };
    
    const x = Math.max(region.x, viewportRegion.x);
    const y = Math.max(region.y, viewportRegion.y);
    const width = Math.min(region.x + region.width, viewportRegion.x + viewportRegion.width) - x;
    const height = Math.min(region.y + region.height, viewportRegion.y + viewportRegion.height) - y;
    
    if (width <= 0 || height <= 0) return null;
    
    return { x, y, width, height };
  }

  scheduleRender() {
    if (this.isRendering) {
      this.pendingRender = true;
      return;
    }
    
    requestAnimationFrame(() => this.render());
  }

  async render() {
    if (!this.data || this.dirtyRegions.length === 0) {
      this.isRendering = false;
      return;
    }
    
    this.isRendering = true;
    
    const mergedRegions = this.mergeDirtyRegions();
    this.dirtyRegions = [];
    
    for (const region of mergedRegions) {
      const clipped = this.clipRegionToViewport(region);
      if (!clipped) continue;
      
      await this.renderRegion(clipped);
      
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    
    this.isRendering = false;
    
    if (this.pendingRender) {
      this.pendingRender = false;
      this.scheduleRender();
    }
  }

  async renderRegion(region) {
    const { x, y, width, height } = region;
    
    if (width <= 0 || height <= 0) return;
    
    const pixelX = x * this.cellSize - this.viewport.x;
    const pixelY = y * this.cellSize - this.viewport.y;
    const pixelWidth = width * this.cellSize;
    const pixelHeight = height * this.cellSize;
    
    this.offscreenCanvas.width = pixelWidth;
    this.offscreenCanvas.height = pixelHeight;
    
    const imageData = this.offscreenCtx.createImageData(pixelWidth, pixelHeight);
    const data = imageData.data;
    
    const cellSize = this.cellSize;
    
    for (let row = 0; row < height; row++) {
      const dataRow = y + row;
      if (dataRow >= this.dataHeight) break;
      
      const rowData = this.data[dataRow];
      if (!rowData) continue;
      
      for (let col = 0; col < width; col++) {
        const dataCol = x + col;
        if (dataCol >= this.dataWidth) break;
        
        const isWhite = rowData[dataCol] === '1';
        const r = isWhite ? 255 : 30;
        const g = isWhite ? 255 : 30;
        const b = isWhite ? 255 : 30;
        
        for (let py = 0; py < cellSize; py++) {
          for (let px = 0; px < cellSize; px++) {
            const pixelRow = row * cellSize + py;
            const pixelCol = col * cellSize + px;
            
            if (pixelRow >= pixelHeight || pixelCol >= pixelWidth) continue;
            
            const idx = (pixelRow * pixelWidth + pixelCol) * 4;
            data[idx] = r;
            data[idx + 1] = g;
            data[idx + 2] = b;
            data[idx + 3] = 255;
          }
        }
      }
      
      if (row % 50 === 0) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }
    
    this.offscreenCtx.putImageData(imageData, 0, 0);
    this.ctx.drawImage(this.offscreenCanvas, pixelX, pixelY);
  }

  getVisibleCellRange() {
    const startX = Math.floor(this.viewport.x / this.cellSize);
    const startY = Math.floor(this.viewport.y / this.cellSize);
    const endX = Math.ceil((this.viewport.x + this.viewport.width) / this.cellSize);
    const endY = Math.ceil((this.viewport.y + this.viewport.height) / this.cellSize);
    
    return {
      startX: Math.max(0, startX),
      startY: Math.max(0, startY),
      endX: Math.min(this.dataWidth, endX),
      endY: Math.min(this.dataHeight, endY)
    };
  }

  destroy() {
    this.dirtyRegions = [];
    this.data = null;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = DirtyRegionRenderer;
}
