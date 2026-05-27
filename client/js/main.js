import { TreeLayoutEngine } from './treeLayoutEngine.js'

class FamilyTreeApp {
  constructor() {
    this.canvas = document.getElementById('treeCanvas')
    this.ctx = this.canvas.getContext('2d')
    this.container = document.getElementById('canvasContainer')
    this.tooltip = document.getElementById('tooltip')
    this.statsEl = document.getElementById('stats')
    
    this.data = null
    this.layoutResult = null
    this.scale = 1
    this.offsetX = 0
    this.offsetY = 0
    this.isDragging = false
    this.lastMouseX = 0
    this.lastMouseY = 0
    this.hoveredNode = null
    
    this.init()
  }
  
  init() {
    this.setupCanvas()
    this.setupEventListeners()
    this.loadData()
  }
  
  setupCanvas() {
    const containerRect = this.container.getBoundingClientRect()
    this.canvas.width = containerRect.width * 2
    this.canvas.height = containerRect.height * 2
    this.canvas.style.width = containerRect.width + 'px'
    this.canvas.style.height = containerRect.height + 'px'
    this.ctx.scale(2, 2)
  }
  
  setupEventListeners() {
    document.getElementById('loadBtn').addEventListener('click', () => this.loadData())
    document.getElementById('zoomIn').addEventListener('click', () => this.zoom(0.1))
    document.getElementById('zoomOut').addEventListener('click', () => this.zoom(-0.1))
    document.getElementById('resetView').addEventListener('click', () => this.resetView())
    
    this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e))
    this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e))
    this.canvas.addEventListener('mouseup', () => this.onMouseUp())
    this.canvas.addEventListener('mouseleave', () => this.onMouseUp())
    this.canvas.addEventListener('wheel', (e) => this.onWheel(e))
    
    window.addEventListener('resize', () => this.setupCanvas())
  }
  
  async loadData() {
    try {
      const response = await fetch('/api/family')
      this.data = await response.json()
      this.calculateLayout()
      this.updateStats()
    } catch (error) {
      console.error('加载数据失败:', error)
      alert('加载数据失败，请确保后端服务已启动')
    }
  }
  
  calculateLayout() {
    console.time('布局计算')
    const engine = new TreeLayoutEngine(this.data.persons, this.data.marriages)
    this.layoutResult = engine.calculateLayout()
    console.timeEnd('布局计算')
    console.log('布局结果:', this.layoutResult)
    
    const bounds = this.layoutResult.bounds
    this.canvas.width = Math.max(bounds.width * 2, this.container.clientWidth * 2)
    this.canvas.height = Math.max(bounds.height * 2, this.container.clientHeight * 2)
    this.canvas.style.width = Math.max(bounds.width, this.container.clientWidth) + 'px'
    this.canvas.style.height = Math.max(bounds.height, this.container.clientHeight) + 'px'
    this.ctx.scale(2, 2)
    
    this.render()
  }
  
  updateStats() {
    if (this.data) {
      this.statsEl.textContent = `总人数: ${this.data.metadata.totalPersons} | 婚姻: ${this.data.metadata.totalMarriages} | 代数: ${this.data.metadata.generations}`
    }
  }
  
  zoom(delta) {
    const newScale = Math.max(0.3, Math.min(3, this.scale + delta))
    const centerX = this.container.clientWidth / 2
    const centerY = this.container.clientHeight / 2
    
    this.offsetX = centerX - (centerX - this.offsetX) * (newScale / this.scale)
    this.offsetY = centerY - (centerY - this.offsetY) * (newScale / this.scale)
    this.scale = newScale
    
    this.render()
  }
  
  resetView() {
    this.scale = 1
    this.offsetX = 0
    this.offsetY = 0
    this.render()
  }
  
  onMouseDown(e) {
    this.isDragging = true
    this.lastMouseX = e.clientX
    this.lastMouseY = e.clientY
  }
  
  onMouseMove(e) {
    const rect = this.canvas.getBoundingClientRect()
    const mouseX = (e.clientX - rect.left - this.offsetX) / this.scale
    const mouseY = (e.clientY - rect.top - this.offsetY) / this.scale
    
    if (this.isDragging) {
      this.offsetX += e.clientX - this.lastMouseX
      this.offsetY += e.clientY - this.lastMouseY
      this.lastMouseX = e.clientX
      this.lastMouseY = e.clientY
      this.render()
    } else {
      this.checkHover(mouseX, mouseY, e)
    }
  }
  
  onMouseUp() {
    this.isDragging = false
  }
  
  onWheel(e) {
    e.preventDefault()
    const delta = e.deltaY > 0 ? -0.05 : 0.05
    this.zoom(delta)
  }
  
  checkHover(mouseX, mouseY, e) {
    if (!this.layoutResult) return
    
    let foundNode = null
    for (const node of this.layoutResult.nodes) {
      if (mouseX >= node.x && mouseX <= node.x + node.width &&
          mouseY >= node.y && mouseY <= node.y + node.height) {
        foundNode = node
        break
      }
    }
    
    this.hoveredNode = foundNode
    
    if (foundNode) {
      this.showTooltip(foundNode, e.clientX, e.clientY)
      this.canvas.style.cursor = 'pointer'
    } else {
      this.hideTooltip()
      this.canvas.style.cursor = 'grab'
    }
    
    this.render()
  }
  
  showTooltip(node, x, y) {
    const spouses = node.spouseIds.map(id => {
      const spouse = this.data.persons.find(p => p.id === id)
      return spouse ? spouse.name : id
    }).join(', ')
    
    const parents = node.parentIds.map(id => {
      const parent = this.data.persons.find(p => p.id === id)
      return parent ? parent.name : id
    }).join(', ')
    
    this.tooltip.innerHTML = `
      <div class="name">${node.name}</div>
      <div class="info">性别: ${node.gender === 'male' ? '男' : '女'}</div>
      <div class="info">世代: 第${node.generation}代</div>
      <div class="info">出生: ${node.birthYear}年</div>
      ${node.deathYear ? `<div class="info">逝世: ${node.deathYear}年</div>` : ''}
      ${spouses ? `<div class="info">配偶: ${spouses}</div>` : ''}
      ${parents ? `<div class="info">父母: ${parents}</div>` : ''}
    `
    
    this.tooltip.style.left = (x + 15) + 'px'
    this.tooltip.style.top = (y + 15) + 'px'
    this.tooltip.classList.add('show')
  }
  
  hideTooltip() {
    this.tooltip.classList.remove('show')
  }
  
  render() {
    if (!this.layoutResult) return
    
    const { nodes, edges, bounds } = this.layoutResult
    
    this.ctx.save()
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    this.ctx.translate(this.offsetX, this.offsetY)
    this.ctx.scale(this.scale, this.scale)
    
    this.drawGenerationBackgrounds()
    this.drawEdges(edges)
    this.drawNodes(nodes)
    
    this.ctx.restore()
  }
  
  drawGenerationBackgrounds() {
    const generations = new Map()
    for (const node of this.layoutResult.nodes) {
      if (!generations.has(node.generation)) {
        generations.set(node.generation, { minY: Infinity, maxY: -Infinity })
      }
      const gen = generations.get(node.generation)
      gen.minY = Math.min(gen.minY, node.y)
      gen.maxY = Math.max(gen.maxY, node.y + node.height)
    }
    
    const bounds = this.layoutResult.bounds
    let i = 0
    for (const [gen, range] of generations.entries()) {
      const gradient = this.ctx.createLinearGradient(0, range.minY - 20, 0, range.maxY + 20)
      gradient.addColorStop(0, i % 2 === 0 ? 'rgba(102, 126, 234, 0.05)' : 'rgba(118, 75, 162, 0.05)')
      gradient.addColorStop(1, i % 2 === 0 ? 'rgba(102, 126, 234, 0.1)' : 'rgba(118, 75, 162, 0.1)')
      
      this.ctx.fillStyle = gradient
      this.ctx.fillRect(bounds.minX - 50, range.minY - 20, bounds.width + 100, range.maxY - range.minY + 40)
      
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.4)'
      this.ctx.font = 'bold 14px Microsoft YaHei'
      this.ctx.fillText(`第${gen}代`, bounds.minX - 40, range.minY + 15)
      i++
    }
  }
  
  drawEdges(edges) {
    const nodeMap = new Map(this.layoutResult.nodes.map(n => [n.id, n]))
    
    for (const edge of edges) {
      const fromNode = nodeMap.get(edge.from)
      const toNode = nodeMap.get(edge.to)
      
      if (!fromNode || !toNode) continue
      
      if (edge.type === 'marriage') {
        this.ctx.strokeStyle = '#ff9800'
        this.ctx.lineWidth = 3
        this.ctx.setLineDash([])
        
        const fromX = fromNode.x + fromNode.width
        const fromY = fromNode.y + fromNode.height / 2
        const toX = toNode.x
        const toY = toNode.y + toNode.height / 2
        
        this.ctx.beginPath()
        this.ctx.moveTo(fromX, fromY)
        this.ctx.lineTo(toX, toY)
        this.ctx.stroke()
        
        this.ctx.fillStyle = '#ff9800'
        this.ctx.beginPath()
        this.ctx.arc((fromX + toX) / 2, fromY, 5, 0, Math.PI * 2)
        this.ctx.fill()
      } else if (edge.type === 'parent-child') {
        this.ctx.strokeStyle = '#4caf50'
        this.ctx.lineWidth = 2
        this.ctx.setLineDash([5, 3])
        
        const fromX = fromNode.x + fromNode.width / 2
        const fromY = fromNode.y + fromNode.height
        const toX = toNode.x + toNode.width / 2
        const toY = toNode.y
        
        const midY = (fromY + toY) / 2
        
        this.ctx.beginPath()
        this.ctx.moveTo(fromX, fromY)
        this.ctx.lineTo(fromX, midY)
        this.ctx.lineTo(toX, midY)
        this.ctx.lineTo(toX, toY)
        this.ctx.stroke()
      }
    }
  }
  
  drawNodes(nodes) {
    for (const node of nodes) {
      const isHovered = this.hoveredNode && this.hoveredNode.id === node.id
      this.drawNode(node, isHovered)
    }
  }
  
  drawNode(node, isHovered) {
    const { x, y, width, height, gender } = node
    
    const radius = 8
    const color = gender === 'male' ? '#4a90d9' : '#e91e63'
    const shadowColor = gender === 'male' ? 'rgba(74, 144, 217, 0.3)' : 'rgba(233, 30, 99, 0.3)'
    
    if (isHovered) {
      this.ctx.shadowColor = shadowColor
      this.ctx.shadowBlur = 15
      this.ctx.shadowOffsetX = 0
      this.ctx.shadowOffsetY = 5
    }
    
    const gradient = this.ctx.createLinearGradient(x, y, x, y + height)
    gradient.addColorStop(0, color)
    gradient.addColorStop(1, gender === 'male' ? '#357abd' : '#c2185b')
    
    this.ctx.fillStyle = gradient
    this.ctx.beginPath()
    this.ctx.roundRect(x, y, width, height, radius)
    this.ctx.fill()
    
    this.ctx.shadowColor = 'transparent'
    
    this.ctx.strokeStyle = isHovered ? '#fff' : 'rgba(255, 255, 255, 0.3)'
    this.ctx.lineWidth = isHovered ? 3 : 1
    this.ctx.beginPath()
    this.ctx.roundRect(x, y, width, height, radius)
    this.ctx.stroke()
    
    this.ctx.fillStyle = '#fff'
    this.ctx.font = 'bold 13px Microsoft YaHei'
    this.ctx.textAlign = 'center'
    this.ctx.textBaseline = 'middle'
    this.ctx.fillText(node.name, x + width / 2, y + height / 2 - 8)
    
    this.ctx.font = '11px Microsoft YaHei'
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
    this.ctx.fillText(`${node.birthYear} - ${node.deathYear || '在世'}`, x + width / 2, y + height / 2 + 12)
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new FamilyTreeApp()
})