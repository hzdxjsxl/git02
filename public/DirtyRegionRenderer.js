class DirtyRegionRenderer {
  constructor(canvas, cellSize = 2) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.cellSize = cellSize;
    this.data = null;
    this.dataWidth = 0;
    this.dataHeight = 0;

    this.viewport = { x: 0, y: 0, width: 0, height: 0 };

    this._rafId = null;
    this._needsRender = false;
    this._lastRenderTime = 0;
    this._minRenderInterval = 16;

    this._offscreen = document.createElement('canvas');
    this._offCtx = this._offscreen.getContext('2d');

    this._lastVisibleRange = null;
  }

  setData(data, width, height) {
    this.data = data;
    this.dataWidth = width;
    this.dataHeight = height;
    this._lastVisibleRange = null;
    this.requestRender();
  }

  setViewport(x, y, width, height) {
    if (this.viewport.x === x && this.viewport.y === y &&
        this.viewport.width === width && this.viewport.height === height) {
      return;
    }
    this.viewport.x = x;
    this.viewport.y = y;
    this.viewport.width = width;
    this.viewport.height = height;
    this.requestRender();
  }

  setCellSize(size) {
    if (this.cellSize === size) return;
    this.cellSize = size;
    this._lastVisibleRange = null;
    this.requestRender();
  }

  requestRender() {
    this._needsRender = true;
    if (this._rafId !== null) return;

    this._rafId = requestAnimationFrame(() => {
      this._rafId = null;
      const now = performance.now();
      const elapsed = now - this._lastRenderTime;

      if (elapsed < this._minRenderInterval) {
        if (this._needsRender) {
          this._rafId = requestAnimationFrame(() => this._doRender());
        }
        return;
      }

      this._doRender();
    });
  }

  _doRender() {
    if (!this._needsRender) return;
    this._needsRender = false;
    this._lastRenderTime = performance.now();

    if (!this.data || this.viewport.width <= 0 || this.viewport.height <= 0) return;

    const range = this._computeVisibleRange();
    if (!range) return;

    if (this._lastVisibleRange &&
        this._lastVisibleRange.startX === range.startX &&
        this._lastVisibleRange.startY === range.startY &&
        this._lastVisibleRange.endX === range.endX &&
        this._lastVisibleRange.endY === range.endY &&
        this._lastVisibleRange.cellSize === this.cellSize) {
      return;
    }

    this._lastVisibleRange = { ...range, cellSize: this.cellSize };
    this._renderRange(range);
  }

  _computeVisibleRange() {
    const cs = this.cellSize;
    const vx = this.viewport.x;
    const vy = this.viewport.y;
    const vw = this.viewport.width;
    const vh = this.viewport.height;

    let startX = Math.floor(vx / cs);
    let startY = Math.floor(vy / cs);
    let endX = Math.ceil((vx + vw) / cs);
    let endY = Math.ceil((vy + vh) / cs);

    startX = Math.max(0, startX);
    startY = Math.max(0, startY);
    endX = Math.min(this.dataWidth, endX);
    endY = Math.min(this.dataHeight, endY);

    if (startX >= endX || startY >= endY) return null;

    return { startX, startY, endX, endY };
  }

  _renderRange(range) {
    const { startX, startY, endX, endY } = range;
    const cs = this.cellSize;
    const vx = this.viewport.x;
    const vy = this.viewport.y;

    const pxX = startX * cs - vx;
    const pxY = startY * cs - vy;
    const pxW = (endX - startX) * cs;
    const pxH = (endY - startY) * cs;

    this._offscreen.width = pxW;
    this._offscreen.height = pxH;

    const imgData = this._offCtx.createImageData(pxW, pxH);
    const buf = imgData.data;

    for (let row = startY; row < endY; row++) {
      const rowData = this.data[row];
      if (!rowData) continue;

      const localRow = row - startY;
      const baseRow = localRow * cs;

      for (let col = startX; col < endX; col++) {
        const isWhite = rowData[col] === '1';
        const r = isWhite ? 255 : 30;
        const g = isWhite ? 255 : 30;
        const b = isWhite ? 255 : 30;

        const localCol = col - startX;
        const baseCol = localCol * cs;

        for (let py = 0; py < cs; py++) {
          const pixelRow = baseRow + py;
          if (pixelRow >= pxH) break;

          const rowOffset = pixelRow * pxW * 4;
          for (let px = 0; px < cs; px++) {
            const pixelCol = baseCol + px;
            if (pixelCol >= pxW) break;

            const idx = rowOffset + pixelCol * 4;
            buf[idx] = r;
            buf[idx + 1] = g;
            buf[idx + 2] = b;
            buf[idx + 3] = 255;
          }
        }
      }
    }

    this._offCtx.putImageData(imgData, 0, 0);

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.drawImage(this._offscreen, pxX, pxY);
  }

  getVisibleCellRange() {
    return this._computeVisibleRange() || { startX: 0, startY: 0, endX: 0, endY: 0 };
  }

  destroy() {
    if (this._rafId !== null) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
    this._needsRender = false;
    this.data = null;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = DirtyRegionRenderer;
}
