class FabricMatrixApp {
  constructor() {
    this.canvas = document.getElementById('mainCanvas');
    this.container = document.getElementById('canvasContainer');
    this.loadingOverlay = document.getElementById('loadingOverlay');
    this.loadingText = document.getElementById('loadingText');
    this.progressFill = document.getElementById('progressFill');
    this.coordinatesPanel = document.getElementById('coordinates');
    
    this.matrixSizeEl = document.getElementById('matrixSize');
    this.zoomLevelEl = document.getElementById('zoomLevel');
    this.cellSizeEl = document.getElementById('cellSize');
    this.fpsEl = document.getElementById('fps');
    
    this.renderer = null;
    this.matrixData = [];
    this.matrixWidth = 0;
    this.matrixHeight = 0;
    
    this.viewX = 0;
    this.viewY = 0;
    this.cellSize = 2;
    this.minCellSize = 1;
    this.maxCellSize = 20;
    
    this.isDragging = false;
    this.lastMouseX = 0;
    this.lastMouseY = 0;
    
    this.frameCount = 0;
    this.lastFpsTime = performance.now();
    
    this.init();
  }
  
  init() {
    this.renderer = new DirtyRegionRenderer(this.canvas, this.cellSize);
    
    this.resizeCanvas();
    this.setupEventListeners();
    this.updateInfo();
    
    this.loadData();
  }
  
  resizeCanvas() {
    const rect = this.container.getBoundingClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;
    
    if (this.renderer) {
      this.renderer.setViewport(
        this.viewX,
        this.viewY,
        this.canvas.width,
        this.canvas.height
      );
    }
  }
  
  setupEventListeners() {
    window.addEventListener('resize', () => this.resizeCanvas());
    
    this.container.addEventListener('mousedown', (e) => this.onMouseDown(e));
    window.addEventListener('mousemove', (e) => this.onMouseMove(e));
    window.addEventListener('mouseup', () => this.onMouseUp());
    window.addEventListener('mouseleave', () => this.onMouseUp());
    
    this.container.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });
    
    document.getElementById('loadBtn').addEventListener('click', () => this.loadData());
    document.getElementById('zoomIn').addEventListener('click', () => this.zoomIn());
    document.getElementById('zoomOut').addEventListener('click', () => this.zoomOut());
    document.getElementById('zoomReset').addEventListener('click', () => this.zoomReset());
    
    this.updateFps();
  }
  
  onMouseDown(e) {
    this.isDragging = true;
    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;
    e.preventDefault();
  }
  
  onMouseMove(e) {
    if (this.isDragging) {
      const dx = this.lastMouseX - e.clientX;
      const dy = this.lastMouseY - e.clientY;
      
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
      
      this.pan(dx, dy);
    }
    
    this.updateMouseCoordinates(e);
  }
  
  onMouseUp() {
    this.isDragging = false;
  }
  
  onWheel(e) {
    e.preventDefault();
    
    const rect = this.canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const worldXBefore = this.viewX + mouseX;
    const worldYBefore = this.viewY + mouseY;
    
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newCellSize = Math.max(this.minCellSize, Math.min(this.maxCellSize, this.cellSize * delta));
    
    if (newCellSize !== this.cellSize) {
      this.cellSize = newCellSize;
      this.renderer.setCellSize(this.cellSize);
      
      const worldXAfter = this.viewX + mouseX;
      const worldYAfter = this.viewY + mouseY;
      
      this.viewX += worldXBefore - worldXAfter;
      this.viewY += worldYBefore - worldYAfter;
      
      this.clampViewport();
      this.renderer.setViewport(this.viewX, this.viewY, this.canvas.width, this.canvas.height);
      this.updateInfo();
    }
  }
  
  pan(dx, dy) {
    this.viewX += dx;
    this.viewY += dy;
    
    this.clampViewport();
    this.renderer.setViewport(this.viewX, this.viewY, this.canvas.width, this.canvas.height);
    this.updateInfo();
  }
  
  clampViewport() {
    const maxX = this.matrixWidth * this.cellSize - this.canvas.width;
    const maxY = this.matrixHeight * this.cellSize - this.canvas.height;
    
    this.viewX = Math.max(0, Math.min(maxX, this.viewX));
    this.viewY = Math.max(0, Math.min(maxY, this.viewY));
  }
  
  zoomIn() {
    const centerX = this.viewX + this.canvas.width / 2;
    const centerY = this.viewY + this.canvas.height / 2;
    
    this.cellSize = Math.min(this.maxCellSize, this.cellSize * 1.2);
    this.renderer.setCellSize(this.cellSize);
    
    this.viewX = centerX - this.canvas.width / 2;
    this.viewY = centerY - this.canvas.height / 2;
    
    this.clampViewport();
    this.renderer.setViewport(this.viewX, this.viewY, this.canvas.width, this.canvas.height);
    this.updateInfo();
  }
  
  zoomOut() {
    const centerX = this.viewX + this.canvas.width / 2;
    const centerY = this.viewY + this.canvas.height / 2;
    
    this.cellSize = Math.max(this.minCellSize, this.cellSize / 1.2);
    this.renderer.setCellSize(this.cellSize);
    
    this.viewX = centerX - this.canvas.width / 2;
    this.viewY = centerY - this.canvas.height / 2;
    
    this.clampViewport();
    this.renderer.setViewport(this.viewX, this.viewY, this.canvas.width, this.canvas.height);
    this.updateInfo();
  }
  
  zoomReset() {
    this.cellSize = 2;
    this.viewX = 0;
    this.viewY = 0;
    
    this.renderer.setCellSize(this.cellSize);
    this.renderer.setViewport(this.viewX, this.viewY, this.canvas.width, this.canvas.height);
    this.updateInfo();
  }
  
  async loadData() {
    const patternType = document.getElementById('patternType').value;
    const width = parseInt(document.getElementById('matrixWidth').value);
    const height = parseInt(document.getElementById('matrixHeight').value);
    
    this.showLoading(true);
    this.loadingText.textContent = '正在加载数据...';
    this.progressFill.style.width = '0%';
    
    try {
      const response = await fetch(`/api/fabric-data?width=${width}&height=${height}&pattern=${patternType}`);
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      
      let buffer = '';
      let firstLine = true;
      let loadedRows = 0;
      
      this.matrixData = [];
      
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        
        const lines = buffer.split('\n');
        buffer = lines.pop();
        
        for (const line of lines) {
          if (firstLine) {
            const [w, h] = line.split(',').map(Number);
            this.matrixWidth = w;
            this.matrixHeight = h;
            firstLine = false;
          } else if (line.length > 0) {
            this.matrixData.push(line);
            loadedRows++;
            
            const progress = (loadedRows / this.matrixHeight) * 100;
            this.progressFill.style.width = `${progress}%`;
            this.loadingText.textContent = `加载中... ${loadedRows.toLocaleString()} / ${this.matrixHeight.toLocaleString()} 行`;
          }
        }
        
        await new Promise(resolve => setTimeout(resolve, 0));
      }
      
      this.renderer.setData(this.matrixData, this.matrixWidth, this.matrixHeight);
      this.viewX = 0;
      this.viewY = 0;
      this.renderer.setViewport(this.viewX, this.viewY, this.canvas.width, this.canvas.height);
      
      this.updateInfo();
      
    } catch (error) {
      console.error('加载数据失败:', error);
      this.loadingText.textContent = '加载失败: ' + error.message;
    }
    
    setTimeout(() => this.showLoading(false), 500);
  }
  
  showLoading(show) {
    if (show) {
      this.loadingOverlay.classList.remove('hidden');
    } else {
      this.loadingOverlay.classList.add('hidden');
    }
  }
  
  updateMouseCoordinates(e) {
    const rect = this.canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const cellX = Math.floor((this.viewX + mouseX) / this.cellSize);
    const cellY = Math.floor((this.viewY + mouseY) / this.cellSize);
    
    const range = this.renderer.getVisibleCellRange();
    const visibleWidth = range.endX - range.startX;
    const visibleHeight = range.endY - range.startY;
    
    this.coordinatesPanel.innerHTML = `
      <div>鼠标位置: (${cellX}, ${cellY})</div>
      <div>视图位置: (${Math.floor(this.viewX)}, ${Math.floor(this.viewY)})</div>
      <div>可见: ${visibleWidth} x ${visibleHeight} 单元格</div>
    `;
  }
  
  updateInfo() {
    this.matrixSizeEl.textContent = `${this.matrixWidth.toLocaleString()} x ${this.matrixHeight.toLocaleString()}`;
    this.zoomLevelEl.textContent = `${Math.round((this.cellSize / 2) * 100)}%`;
    this.cellSizeEl.textContent = `${this.cellSize.toFixed(1)}px`;
  }
  
  updateFps() {
    this.frameCount++;
    
    const now = performance.now();
    if (now - this.lastFpsTime >= 1000) {
      this.fpsEl.textContent = this.frameCount;
      this.frameCount = 0;
      this.lastFpsTime = now;
    }
    
    requestAnimationFrame(() => this.updateFps());
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.app = new FabricMatrixApp();
});
