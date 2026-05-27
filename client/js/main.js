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
    this.nodeMap = new Map()

    this.scale = 1
    this.offsetX = 0
    this.offsetY = 0
    this.isDragging = false
    this.lastMouseX = 0
    this.lastMouseY = 0
    this.hoveredNodeId = null
    this.isFirstLoad = true

    this.dpr = window.devicePixelRatio || 1

    this.init()
  }

  init() {
    this.setupCanvas()
    this.setupEventListeners()
    this.loadData()
  }

  setupCanvas() {
    var rect = this.container.getBoundingClientRect()
    this.viewportWidth = rect.width
    this.viewportHeight = rect.height

    this.canvas.style.width = this.viewportWidth + 'px'
    this.canvas.style.height = this.viewportHeight + 'px'
    this.canvas.width = this.viewportWidth * this.dpr
    this.canvas.height = this.viewportHeight * this.dpr

    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
  }

  setupEventListeners() {
    var self = this
    document.getElementById('loadBtn').addEventListener('click', function () {
      self.isFirstLoad = true
      self.loadData()
    })
    document.getElementById('zoomIn').addEventListener('click', function () {
      self.zoomAtCenter(0.1)
    })
    document.getElementById('zoomOut').addEventListener('click', function () {
      self.zoomAtCenter(-0.1)
    })
    document.getElementById('resetView').addEventListener('click', function () {
      self.fitToView()
    })

    this.canvas.addEventListener('mousedown', function (e) { self.onMouseDown(e) })
    this.canvas.addEventListener('mousemove', function (e) { self.onMouseMove(e) })
    this.canvas.addEventListener('mouseup', function () { self.onMouseUp() })
    this.canvas.addEventListener('mouseleave', function () { self.onMouseUp() })
    this.canvas.addEventListener('wheel', function (e) { self.onWheel(e) }, { passive: false })

    window.addEventListener('resize', function () {
      self.setupCanvas()
      if (self.layoutResult) { self.fitToView() }
    })
  }

  loadData() {
    var self = this
    fetch('/api/family')
      .then(function (res) { return res.json() })
      .then(function (data) {
        self.data = data
        self.calculateLayout()
        self.updateStats()
      })
      .catch(function (err) {
        console.error('Load failed:', err)
        alert('Load failed - check server')
      })
  }

  calculateLayout() {
    console.time('Layout')
    var engine = new TreeLayoutEngine(this.data.persons, this.data.marriages)
    this.layoutResult = engine.calculateLayout()
    console.timeEnd('Layout')

    this.nodeMap.clear()
    for (var i = 0; i < this.layoutResult.nodes.length; i++) {
      var n = this.layoutResult.nodes[i]
      this.nodeMap.set(n.id, n)
    }

    this.resizeCanvasForContent()

    if (this.isFirstLoad) {
      this.fitToView()
      this.isFirstLoad = false
    }

    this.render()
  }

  resizeCanvasForContent() {
    var bounds = this.layoutResult.bounds
    var pad = 200
    var w = Math.max(bounds.width + pad, this.viewportWidth)
    var h = Math.max(bounds.height + pad, this.viewportHeight)

    this.canvas.width = w * this.dpr
    this.canvas.height = h * this.dpr
    this.canvas.style.width = w + 'px'
    this.canvas.style.height = h + 'px'

    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
  }

  fitToView() {
    if (!this.layoutResult) return

    var bounds = this.layoutResult.bounds
    var sx = (this.viewportWidth - 80) / bounds.width
    var sy = (this.viewportHeight - 80) / bounds.height
    var ns = Math.min(sx, sy, 1.5)
    this.scale = Math.max(0.2, ns)

    var sw = bounds.width * this.scale
    var sh = bounds.height * this.scale

    this.offsetX = (this.viewportWidth - sw) / 2 - bounds.minX * this.scale
    this.offsetY = (this.viewportHeight - sh) / 2 - bounds.minY * this.scale

    console.log('fitToView scale=' + this.scale.toFixed(2))
    this.render()
  }

  zoomAtCenter(delta) {
    this.zoomAtPoint(delta, this.viewportWidth / 2, this.viewportHeight / 2)
  }

  zoomAtPoint(delta, px, py) {
    var ns = Math.max(0.2, Math.min(3, this.scale + delta))
    if (ns === this.scale) return

    var wx = (px - this.offsetX) / this.scale
    var wy = (py - this.offsetY) / this.scale

    this.scale = ns
    this.offsetX = px - wx * this.scale
    this.offsetY = py - wy * this.scale

    this.render()
  }

  updateStats() {
    if (this.data && this.layoutResult) {
      this.statsEl.textContent =
        'Persons: ' + this.data.metadata.totalPersons +
        ' | Marriages: ' + this.data.metadata.totalMarriages +
        ' | Gens: ' + this.data.metadata.generations +
        ' | Cycles: ' + this.layoutResult.cycles.length
    }
  }

  onMouseDown(e) {
    this.isDragging = true
    this.lastMouseX = e.clientX
    this.lastMouseY = e.clientY
    this.canvas.style.cursor = 'grabbing'
  }

  onMouseMove(e) {
    var rect = this.canvas.getBoundingClientRect()
    var cx = e.clientX - rect.left
    var cy = e.clientY - rect.top

    var wx = (cx - this.offsetX) / this.scale
    var wy = (cy - this.offsetY) / this.scale

    if (this.isDragging) {
      this.offsetX += e.clientX - this.lastMouseX
      this.offsetY += e.clientY - this.lastMouseY
      this.lastMouseX = e.clientX
      this.lastMouseY = e.clientY
      this.render()
    } else {
      this.checkHover(wx, wy, e.clientX, e.clientY)
    }
  }

  onMouseUp() {
    this.isDragging = false
    this.canvas.style.cursor = 'grab'
  }

  onWheel(e) {
    e.preventDefault()
    var rect = this.canvas.getBoundingClientRect()
    var cx = e.clientX - rect.left
    var cy = e.clientY - rect.top
    this.zoomAtPoint(e.deltaY > 0 ? -0.05 : 0.05, cx, cy)
  }

  checkHover(wx, wy, sx, sy) {
    if (!this.layoutResult) return

    var found = null
    var nodes = this.layoutResult.nodes
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i]
      if (wx >= n.x && wx <= n.x + n.width && wy >= n.y && wy <= n.y + n.height) {
        found = n.id
        break
      }
    }

    if (found !== this.hoveredNodeId) {
      this.hoveredNodeId = found
      this.render()
    }

    if (found) {
      this.showTooltip(found, sx, sy)
      this.canvas.style.cursor = 'pointer'
    } else {
      this.hideTooltip()
      this.canvas.style.cursor = 'grab'
    }
  }

  showTooltip(id, sx, sy) {
    var node = this.nodeMap.get(id)
    if (!node) return

    var spouses = node.spouseIds.map(function (sid) {
      var s = this.nodeMap.get(sid)
      return s ? s.name : sid
    }, this).join(', ')

    var parents = node.parentIds.map(function (pid) {
      var p = this.nodeMap.get(pid)
      return p ? p.name : pid
    }, this).join(', ')

    var html = '<div class="name">' + node.name + '</div>'
    html += '<div class="info">Gender: ' + (node.gender === 'male' ? 'M' : 'F') + '</div>'
    html += '<div class="info">Gen: ' + node.generation + '</div>'
    html += '<div class="info">Born: ' + node.birthYear + '</div>'
    if (node.deathYear) { html += '<div class="info">Died: ' + node.deathYear + '</div>' }
    else { html += '<div class="info">Status: Alive</div>' }
    if (spouses) { html += '<div class="info">Spouse: ' + spouses + '</div>' }
    if (parents) { html += '<div class="info">Parents: ' + parents + '</div>' }

    this.tooltip.innerHTML = html
    this.tooltip.style.left = (sx + 15) + 'px'
    this.tooltip.style.top = (sy + 15) + 'px'
    this.tooltip.classList.add('show')
  }

  hideTooltip() {
    this.tooltip.classList.remove('show')
  }

  render() {
    if (!this.layoutResult) return

    var ctx = this.ctx
    var nodes = this.layoutResult.nodes
    var edges = this.layoutResult.edges
    var bounds = this.layoutResult.bounds

    ctx.save()
    ctx.clearRect(0, 0, this.canvas.width / this.dpr, this.canvas.height / this.dpr)
    ctx.translate(this.offsetX, this.offsetY)
    ctx.scale(this.scale, this.scale)

    this.drawGenBands(ctx, bounds)
    this.drawParentChildLines(ctx, edges)
    this.drawMarriageLines(ctx, edges)
    this.drawPersonCards(ctx, nodes)

    ctx.restore()
  }

  drawGenBands(ctx, bounds) {
    var genMap = new Map()
    var nodes = this.layoutResult.nodes
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i]
      var g = n.generation
      if (!genMap.has(g)) { genMap.set(g, { minY: Infinity, maxY: -Infinity }) }
      var r = genMap.get(g)
      r.minY = Math.min(r.minY, n.y)
      r.maxY = Math.max(r.maxY, n.y + n.height)
    }

    var sorted = Array.from(genMap.entries()).sort(function (a, b) { return a[0] - b[0] })
    var palette = [
      ['rgba(102,126,234,0.10)', 'rgba(102,126,234,0.02)'],
      ['rgba(118,75,162,0.10)', 'rgba(118,75,162,0.02)'],
      ['rgba(240,147,251,0.10)', 'rgba(240,147,251,0.02)'],
      ['rgba(245,87,108,0.10)', 'rgba(245,87,108,0.02)']
    ]

    for (var idx = 0; idx < sorted.length; idx++) {
      var gen = sorted[idx][0]
      var range = sorted[idx][1]
      var colors = palette[idx % palette.length]
      var grad = ctx.createLinearGradient(0, range.minY - 30, 0, range.maxY + 30)
      grad.addColorStop(0, colors[0])
      grad.addColorStop(0.5, colors[1])
      grad.addColorStop(1, colors[0])

      ctx.fillStyle = grad
      ctx.fillRect(bounds.minX - 150, range.minY - 30, bounds.width + 300, range.maxY - range.minY + 60)

      ctx.fillStyle = 'rgba(0,0,0,0.55)'
      ctx.font = 'bold 16px "Microsoft YaHei","SimHei",sans-serif'
      ctx.textAlign = 'left'
      ctx.textBaseline = 'top'
      ctx.fillText('Gen ' + gen, bounds.minX - 130, range.minY - 10)
    }
  }

  drawParentChildLines(ctx, edges) {
    ctx.strokeStyle = '#4caf50'
    ctx.lineWidth = 2
    ctx.setLineDash([6, 4])
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    for (var i = 0; i < edges.length; i++) {
      var e = edges[i]
      if (e.type !== 'parent-child') { continue }

      var fn = this.nodeMap.get(e.from)
      var tn = this.nodeMap.get(e.to)
      if (!fn || !tn) { continue }

      var fx = fn.x + fn.width / 2
      var fy = fn.y + fn.height
      var tx = tn.x + tn.width / 2
      var ty = tn.y
      var my = (fy + ty) / 2

      ctx.beginPath()
      ctx.moveTo(fx, fy)
      ctx.lineTo(fx, my)
      ctx.lineTo(tx, my)
      ctx.lineTo(tx, ty)
      ctx.stroke()
    }
    ctx.setLineDash([])
  }

  drawMarriageLines(ctx, edges) {
    ctx.strokeStyle = '#ff9800'
    ctx.lineWidth = 3
    ctx.lineCap = 'round'

    for (var i = 0; i < edges.length; i++) {
      var e = edges[i]
      if (e.type !== 'marriage') { continue }

      var fn = this.nodeMap.get(e.from)
      var tn = this.nodeMap.get(e.to)
      if (!fn || !tn) { continue }

      var fx = fn.x + fn.width
      var fy = fn.y + fn.height / 2
      var tx = tn.x
      var ty = tn.y + tn.height / 2

      ctx.beginPath()
      ctx.moveTo(fx, fy)
      ctx.lineTo(tx, ty)
      ctx.stroke()

      var mx = (fx + tx) / 2
      var my = (fy + ty) / 2

      ctx.fillStyle = '#ff9800'
      ctx.beginPath()
      ctx.arc(mx, my, 6, 0, Math.PI * 2)
      ctx.fill()

      ctx.fillStyle = '#ffffff'
      ctx.beginPath()
      ctx.arc(mx, my, 3, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  drawPersonCards(ctx, nodes) {
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i]
      this.drawOneCard(ctx, n, n.id === this.hoveredNodeId)
    }
  }

  drawOneCard(ctx, node, hovered) {
    var x = node.x
    var y = node.y
    var w = node.width
    var h = node.height
    var r = 10

    var maleMain = '#2196f3'
    var maleDark = '#1565c0'
    var femaleMain = '#e91e63'
    var femaleDark = '#ad1457'

    var mainColor = node.gender === 'male' ? maleMain : femaleMain
    var darkColor = node.gender === 'male' ? maleDark : femaleDark

    if (hovered) {
      ctx.shadowColor = mainColor
      ctx.shadowBlur = 18
      ctx.shadowOffsetX = 0
      ctx.shadowOffsetY = 4
    }

    var grad = ctx.createLinearGradient(x, y, x, y + h)
    grad.addColorStop(0, mainColor)
    grad.addColorStop(1, darkColor)
    ctx.fillStyle = grad

    this.roundRectPath(ctx, x, y, w, h, r)
    ctx.fill()

    ctx.shadowColor = 'transparent'
    ctx.shadowBlur = 0

    ctx.strokeStyle = hovered ? '#ffeb3b' : 'rgba(255,255,255,0.4)'
    ctx.lineWidth = hovered ? 3 : 1.5
    this.roundRectPath(ctx, x, y, w, h, r)
    ctx.stroke()

    ctx.fillStyle = 'rgba(255,255,255,0.18)'
    this.roundRectPath(ctx, x + 2, y + 2, w - 4, h / 2 - 2, r - 2)
    ctx.fill()

    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 14px "Microsoft YaHei","SimHei",sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(node.name, x + w / 2, y + h / 2 - 10)

    ctx.font = '11px "Microsoft YaHei","SimHei",sans-serif'
    ctx.fillStyle = 'rgba(255,255,255,0.9)'
    var dtxt = node.deathYear ? '' + node.deathYear : 'Alive'
    ctx.fillText(node.birthYear + ' - ' + dtxt, x + w / 2, y + h / 2 + 12)

    ctx.font = '10px "Microsoft YaHei","SimHei",sans-serif'
    ctx.fillStyle = 'rgba(255,255,255,0.7)'
    ctx.fillText('Gen ' + node.generation, x + w / 2, y + h - 10)
  }

  roundRectPath(ctx, x, y, w, h, r) {
    if (r > w / 2) { r = w / 2 }
    if (r > h / 2) { r = h / 2 }
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.lineTo(x + w - r, y)
    ctx.quadraticCurveTo(x + w, y, x + w, y + r)
    ctx.lineTo(x + w, y + h - r)
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
    ctx.lineTo(x + r, y + h)
    ctx.quadraticCurveTo(x, y + h, x, y + h - r)
    ctx.lineTo(x, y + r)
    ctx.quadraticCurveTo(x, y, x + r, y)
    ctx.closePath()
  }
}

document.addEventListener('DOMContentLoaded', function () {
  new FamilyTreeApp()
})