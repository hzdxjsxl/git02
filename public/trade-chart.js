const canvas = document.getElementById('tradeCanvas');
const ctx = canvas.getContext('2d');
const refreshBtn = document.getElementById('refreshBtn');
const countryInfoEl = document.getElementById('countryInfo');
const tradeInfoEl = document.getElementById('tradeInfo');

let tradeData = null;
let countryArcs = [];
let tradeBands = [];
let hoveredCountry = null;
let hoveredBand = null;
let animationProgress = 0;
let animationId = null;

const CANVAS_SIZE = 900;
const CENTER_X = CANVAS_SIZE / 2;
const CENTER_Y = CANVAS_SIZE / 2;
const OUTER_RADIUS = 380;
const INNER_RADIUS = 300;
const BAND_MIN_WIDTH = 1;
const BAND_MAX_WIDTH = 25;
const GAP_ANGLE = 0.02;

canvas.width = CANVAS_SIZE;
canvas.height = CANVAS_SIZE;

function degToRad(deg) {
  return deg * Math.PI / 180;
}

function polarToCartesian(radius, angle) {
  return {
    x: CENTER_X + radius * Math.cos(angle),
    y: CENTER_Y + radius * Math.sin(angle)
  };
}

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(x => {
    const hex = Math.round(Math.max(0, Math.min(255, x))).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

function lerpColor(color1, color2, t) {
  const c1 = hexToRgb(color1);
  const c2 = hexToRgb(color2);
  if (!c1 || !c2) return color1;
  return rgbToHex(
    c1.r + (c2.r - c1.r) * t,
    c1.g + (c2.g - c1.g) * t,
    c1.b + (c2.b - c1.b) * t
  );
}

function createGradient(ctx, x1, y1, x2, y2, color1, color2) {
  const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
  gradient.addColorStop(0, color1 + 'cc');
  gradient.addColorStop(0.5, lerpColor(color1, color2, 0.5) + '99');
  gradient.addColorStop(1, color2 + 'cc');
  return gradient;
}

function calculateArcAngles(countries) {
  const totalAngle = Math.PI * 2 - countries.length * GAP_ANGLE;
  const avgAngle = totalAngle / countries.length;
  let currentAngle = -Math.PI / 2;
  
  return countries.map((country, index) => {
    const startAngle = currentAngle;
    const endAngle = currentAngle + avgAngle;
    const midAngle = (startAngle + endAngle) / 2;
    
    currentAngle = endAngle + GAP_ANGLE;
    
    return {
      ...country,
      index,
      startAngle,
      endAngle,
      midAngle,
      outerStart: polarToCartesian(OUTER_RADIUS, startAngle),
      outerEnd: polarToCartesian(OUTER_RADIUS, endAngle),
      innerStart: polarToCartesian(INNER_RADIUS, startAngle),
      innerEnd: polarToCartesian(INNER_RADIUS, endAngle),
      midOuter: polarToCartesian(OUTER_RADIUS, midAngle),
      midInner: polarToCartesian(INNER_RADIUS, midAngle)
    };
  });
}

function calculateTradeBands(countries, tradeData) {
  const bands = [];
  const maxTrade = Math.max(...tradeData.map(t => Math.max(t.export, t.import)));
  
  tradeData.forEach(trade => {
    const fromCountry = countries.find(c => c.code === trade.from);
    const toCountry = countries.find(c => c.code === trade.to);
    
    if (!fromCountry || !toCountry) return;
    
    const fromIndex = countries.findIndex(c => c.code === trade.from);
    const toIndex = countries.findIndex(c => c.code === trade.to);
    
    const exportWidth = BAND_MIN_WIDTH + (trade.export / maxTrade) * (BAND_MAX_WIDTH - BAND_MIN_WIDTH);
    const importWidth = BAND_MIN_WIDTH + (trade.import / maxTrade) * (BAND_MAX_WIDTH - BAND_MIN_WIDTH);
    
    const fromMidAngle = fromCountry.midAngle;
    const toMidAngle = toCountry.midAngle;
    
    const fromInner = polarToCartesian(INNER_RADIUS - 5, fromMidAngle);
    const toInner = polarToCartesian(INNER_RADIUS - 5, toMidAngle);
    
    const angleDiff = Math.abs(toMidAngle - fromMidAngle);
    const controlRadius = INNER_RADIUS * 0.6;
    const midAngle = (fromMidAngle + toMidAngle) / 2;
    
    let controlPoint;
    if (angleDiff > Math.PI) {
      controlPoint = polarToCartesian(controlRadius * 0.8, midAngle + Math.PI);
    } else {
      controlPoint = polarToCartesian(controlRadius, midAngle);
    }
    
    bands.push({
      type: 'export',
      from: fromCountry,
      to: toCountry,
      fromIndex,
      toIndex,
      value: trade.export,
      width: exportWidth,
      fromPoint: fromInner,
      toPoint: toInner,
      controlPoint,
      color: fromCountry.color,
      toColor: toCountry.color,
      trade
    });
    
    bands.push({
      type: 'import',
      from: toCountry,
      to: fromCountry,
      fromIndex: toIndex,
      toIndex: fromIndex,
      value: trade.import,
      width: importWidth,
      fromPoint: toInner,
      toPoint: fromInner,
      controlPoint,
      color: toCountry.color,
      toColor: fromCountry.color,
      trade
    });
  });
  
  return bands.sort((a, b) => a.width - b.width);
}

function drawArc(arc, isHovered) {
  ctx.save();
  
  ctx.beginPath();
  ctx.arc(CENTER_X, CENTER_Y, OUTER_RADIUS, arc.startAngle, arc.endAngle);
  ctx.arc(CENTER_X, CENTER_Y, INNER_RADIUS, arc.endAngle, arc.startAngle, true);
  ctx.closePath();
  
  const gradient = ctx.createRadialGradient(
    CENTER_X, CENTER_Y, INNER_RADIUS,
    CENTER_X, CENTER_Y, OUTER_RADIUS
  );
  gradient.addColorStop(0, arc.color + '99');
  gradient.addColorStop(1, arc.color + 'ff');
  
  ctx.fillStyle = gradient;
  ctx.fill();
  
  ctx.strokeStyle = isHovered ? '#ffffff' : 'rgba(255,255,255,0.3)';
  ctx.lineWidth = isHovered ? 3 : 1;
  ctx.stroke();
  
  const labelRadius = (OUTER_RADIUS + INNER_RADIUS) / 2;
  const labelPoint = polarToCartesian(labelRadius, arc.midAngle);
  
  ctx.save();
  ctx.translate(labelPoint.x, labelPoint.y);
  
  let rotation = arc.midAngle + Math.PI / 2;
  if (rotation > Math.PI / 2 && rotation < Math.PI * 1.5) {
    rotation += Math.PI;
  }
  ctx.rotate(rotation);
  
  ctx.fillStyle = '#ffffff';
  ctx.font = isHovered ? 'bold 14px sans-serif' : '12px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(arc.code, 0, 0);
  
  ctx.restore();
  ctx.restore();
}

function drawBand(band, progress) {
  if (progress <= 0) return;
  
  ctx.save();
  
  const p1 = band.fromPoint;
  const p2 = band.toPoint;
  const cp = band.controlPoint;
  
  const t = progress;
  const currentP1 = {
    x: p1.x + (cp.x - p1.x) * t * 0.3,
    y: p1.y + (cp.y - p1.y) * t * 0.3
  };
  const currentP2 = {
    x: p2.x + (cp.x - p2.x) * t * 0.3,
    y: p2.y + (cp.y - p2.y) * t * 0.3
  };
  
  const gradient = createGradient(
    ctx,
    currentP1.x, currentP1.y,
    currentP2.x, currentP2.y,
    band.color,
    band.toColor
  );
  
  ctx.beginPath();
  ctx.moveTo(currentP1.x, currentP1.y);
  ctx.quadraticCurveTo(cp.x, cp.y, currentP2.x, currentP2.y);
  ctx.strokeStyle = gradient;
  ctx.lineWidth = band.width * progress;
  ctx.lineCap = 'round';
  ctx.globalAlpha = 0.7;
  ctx.stroke();
  
  ctx.restore();
}

function drawBandHighlight(band) {
  ctx.save();
  
  const p1 = band.fromPoint;
  const p2 = band.toPoint;
  const cp = band.controlPoint;
  
  ctx.beginPath();
  ctx.moveTo(p1.x, p1.y);
  ctx.quadraticCurveTo(cp.x, cp.y, p2.x, p2.y);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = band.width + 4;
  ctx.lineCap = 'round';
  ctx.globalAlpha = 0.5;
  ctx.stroke();
  
  ctx.beginPath();
  ctx.moveTo(p1.x, p1.y);
  ctx.quadraticCurveTo(cp.x, cp.y, p2.x, p2.y);
  const gradient = createGradient(ctx, p1.x, p1.y, p2.x, p2.y, band.color, band.toColor);
  ctx.strokeStyle = gradient;
  ctx.lineWidth = band.width;
  ctx.lineCap = 'round';
  ctx.globalAlpha = 1;
  ctx.stroke();
  
  ctx.restore();
}

function drawCenterInfo() {
  ctx.save();
  
  ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.beginPath();
  ctx.arc(CENTER_X, CENTER_Y, 120, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.strokeStyle = 'rgba(78, 205, 196, 0.3)';
  ctx.lineWidth = 2;
  ctx.stroke();
  
  ctx.fillStyle = '#4ecdc4';
  ctx.font = 'bold 24px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('贸易流向', CENTER_X, CENTER_Y - 20);
  
  if (tradeData) {
    ctx.fillStyle = '#ffffff';
    ctx.font = '14px sans-serif';
    ctx.fillText(`${tradeData.countries.length} 个国家`, CENTER_X, CENTER_Y + 10);
    ctx.fillText(`${tradeData.trade.length} 条贸易线`, CENTER_X, CENTER_Y + 35);
  }
  
  ctx.restore();
}

function render() {
  ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
  
  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
  ctx.beginPath();
  ctx.arc(CENTER_X, CENTER_Y, OUTER_RADIUS + 20, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  
  drawCenterInfo();
  
  if (tradeBands.length > 0) {
    tradeBands.forEach(band => {
      if (band !== hoveredBand) {
        drawBand(band, animationProgress);
      }
    });
    
    if (hoveredBand) {
      drawBandHighlight(hoveredBand);
    }
  }
  
  if (countryArcs.length > 0) {
    countryArcs.forEach(arc => {
      const isHovered = hoveredCountry === arc || 
        (hoveredBand && (hoveredBand.from === arc || hoveredBand.to === arc));
      drawArc(arc, isHovered);
    });
  }
}

function pointInArc(x, y, arc) {
  const dx = x - CENTER_X;
  const dy = y - CENTER_Y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  if (distance < INNER_RADIUS - 10 || distance > OUTER_RADIUS + 10) {
    return false;
  }
  
  let angle = Math.atan2(dy, dx);
  if (angle < -Math.PI / 2) angle += Math.PI * 2;
  
  let startAngle = arc.startAngle;
  let endAngle = arc.endAngle;
  if (startAngle < -Math.PI / 2) startAngle += Math.PI * 2;
  if (endAngle < -Math.PI / 2) endAngle += Math.PI * 2;
  
  if (startAngle <= endAngle) {
    return angle >= startAngle - GAP_ANGLE / 2 && angle <= endAngle + GAP_ANGLE / 2;
  } else {
    return angle >= startAngle - GAP_ANGLE / 2 || angle <= endAngle + GAP_ANGLE / 2;
  }
}

function distanceToCurve(px, py, x1, y1, cx, cy, x2, y2) {
  let minDist = Infinity;
  const steps = 20;
  
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const mt = 1 - t;
    const x = mt * mt * x1 + 2 * mt * t * cx + t * t * x2;
    const y = mt * mt * y1 + 2 * mt * t * cy + t * t * y2;
    const dist = Math.sqrt((px - x) * (px - x) + (py - y) * (py - y));
    minDist = Math.min(minDist, dist);
  }
  
  return minDist;
}

function getMousePos(e) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  return {
    x: (e.clientX - rect.left) * scaleX,
    y: (e.clientY - rect.top) * scaleY
  };
}

canvas.addEventListener('mousemove', (e) => {
  const pos = getMousePos(e);
  
  hoveredCountry = null;
  hoveredBand = null;
  
  for (let i = countryArcs.length - 1; i >= 0; i--) {
    if (pointInArc(pos.x, pos.y, countryArcs[i])) {
      hoveredCountry = countryArcs[i];
      break;
    }
  }
  
  if (!hoveredCountry) {
    for (let i = tradeBands.length - 1; i >= 0; i--) {
      const band = tradeBands[i];
      const dist = distanceToCurve(
        pos.x, pos.y,
        band.fromPoint.x, band.fromPoint.y,
        band.controlPoint.x, band.controlPoint.y,
        band.toPoint.x, band.toPoint.y
      );
      if (dist < band.width / 2 + 5) {
        hoveredBand = band;
        break;
      }
    }
  }
  
  updateInfoPanel();
  render();
});

canvas.addEventListener('mouseleave', () => {
  hoveredCountry = null;
  hoveredBand = null;
  updateInfoPanel();
  render();
});

function updateInfoPanel() {
  if (hoveredCountry) {
    const country = hoveredCountry;
    const countryTrades = tradeData.trade.filter(
      t => t.from === country.code || t.to === country.code
    );
    const totalExport = countryTrades
      .filter(t => t.from === country.code)
      .reduce((sum, t) => sum + t.export, 0);
    const totalImport = countryTrades
      .filter(t => t.to === country.code)
      .reduce((sum, t) => sum + t.import, 0);
    const balance = totalExport - totalImport;
    
    countryInfoEl.innerHTML = `
      <h3>${country.name} (${country.code})</h3>
      <div class="info-item">
        <div class="info-label">总出口</div>
        <div class="info-value positive">${totalExport.toLocaleString()} 亿美元</div>
      </div>
      <div class="info-item">
        <div class="info-label">总进口</div>
        <div class="info-value negative">${totalImport.toLocaleString()} 亿美元</div>
      </div>
      <div class="info-item">
        <div class="info-label">贸易差额</div>
        <div class="info-value ${balance >= 0 ? 'positive' : 'negative'}">
          ${balance >= 0 ? '+' : ''}${balance.toLocaleString()} 亿美元
        </div>
      </div>
      <div class="info-item">
        <div class="info-label">贸易伙伴数</div>
        <div class="info-value">${countryTrades.length} 个</div>
      </div>
    `;
  } else {
    countryInfoEl.innerHTML = `
      <h3>国家信息</h3>
      <p class="hint">悬停在圆弧上查看详情</p>
    `;
  }
  
  if (hoveredBand) {
    const band = hoveredBand;
    tradeInfoEl.innerHTML = `
      <h3>${band.from.name} → ${band.to.name}</h3>
      <div class="info-item">
        <div class="info-label">${band.from.name} 出口</div>
        <div class="info-value positive">${band.trade.export.toLocaleString()} 亿美元</div>
      </div>
      <div class="info-item">
        <div class="info-label">${band.to.name} 出口</div>
        <div class="info-value positive">${band.trade.import.toLocaleString()} 亿美元</div>
      </div>
      <div class="info-item">
        <div class="info-label">贸易差额</div>
        <div class="info-value ${band.trade.balance >= 0 ? 'positive' : 'negative'}">
          ${band.trade.balance >= 0 ? '+' : ''}${band.trade.balance.toLocaleString()} 亿美元
        </div>
      </div>
      <div class="info-item">
        <div class="info-label">总贸易额</div>
        <div class="info-value">${(band.trade.export + band.trade.import).toLocaleString()} 亿美元</div>
      </div>
    `;
  } else {
    tradeInfoEl.innerHTML = `
      <h3>贸易详情</h3>
      <p class="hint">悬停在色带上查看贸易数据</p>
    `;
  }
}

async function loadData() {
  try {
    const response = await fetch('/api/trade-data');
    tradeData = await response.json();
    
    countryArcs = calculateArcAngles(tradeData.countries);
    tradeBands = calculateTradeBands(countryArcs, tradeData.trade);
    
    animationProgress = 0;
    animate();
  } catch (error) {
    console.error('加载数据失败:', error);
  }
}

function animate() {
  if (animationId) {
    cancelAnimationFrame(animationId);
  }
  
  function step() {
    animationProgress += 0.03;
    if (animationProgress >= 1) {
      animationProgress = 1;
      render();
      return;
    }
    render();
    animationId = requestAnimationFrame(step);
  }
  
  step();
}

refreshBtn.addEventListener('click', loadData);

loadData();
