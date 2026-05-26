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
const OUTER_RADIUS = 400;
const INNER_RADIUS = 320;
const GAP_ANGLE = 0.008;
const TOP_TRADE_RATIO = 0.2;

canvas.width = CANVAS_SIZE;
canvas.height = CANVAS_SIZE;

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

function calculateCountryStats(countries, trades) {
  return countries.map(country => {
    const countryTrades = trades.filter(t => t.from === country.code || t.to === country.code);
    const totalExport = countryTrades
      .filter(t => t.from === country.code)
      .reduce((sum, t) => sum + t.export, 0);
    const totalImport = countryTrades
      .filter(t => t.to === country.code)
      .reduce((sum, t) => sum + t.import, 0);
    return {
      ...country,
      totalExport,
      totalImport,
      totalTrade: totalExport + totalImport
    };
  });
}

function calculateArcAngles(countriesWithStats) {
  const totalGlobalTrade = countriesWithStats.reduce((sum, c) => sum + c.totalTrade, 0);
  const totalAvailableAngle = Math.PI * 2 - countriesWithStats.length * GAP_ANGLE;
  
  let currentAngle = -Math.PI / 2;
  
  return countriesWithStats.map(country => {
    const countryAngle = (country.totalTrade / totalGlobalTrade) * totalAvailableAngle;
    const exportRatio = country.totalExport / country.totalTrade;
    const importRatio = country.totalImport / country.totalTrade;
    
    const exportAngle = countryAngle * exportRatio;
    const importAngle = countryAngle * importRatio;
    
    const startAngle = currentAngle;
    const exportEndAngle = startAngle + exportAngle;
    const importEndAngle = exportEndAngle + importAngle;
    const endAngle = importEndAngle;
    
    const exportMidAngle = (startAngle + exportEndAngle) / 2;
    const importMidAngle = (exportEndAngle + importEndAngle) / 2;
    const countryMidAngle = (startAngle + endAngle) / 2;
    
    const arc = {
      ...country,
      startAngle,
      endAngle,
      countryAngle,
      exportStartAngle: startAngle,
      exportEndAngle,
      importStartAngle: exportEndAngle,
      importEndAngle: importEndAngle,
      exportAngle,
      importAngle,
      exportMidAngle,
      importMidAngle,
      countryMidAngle
    };
    
    currentAngle = endAngle + GAP_ANGLE;
    return arc;
  });
}

function calculateTradeBands(countryArcs, trades) {
  const bands = [];
  
  trades.forEach(trade => {
    const fromArc = countryArcs.find(c => c.code === trade.from);
    const toArc = countryArcs.find(c => c.code === trade.to);
    
    if (!fromArc || !toArc) return;
    
    const exportWidthOnFrom = (trade.export / fromArc.totalExport) * fromArc.exportAngle;
    const importWidthOnTo = (trade.export / toArc.totalImport) * toArc.importAngle;
    
    let fromUsedAngle = 0;
    const fromTrades = trades.filter(t => t.from === trade.from);
    fromTrades.sort((a, b) => b.export - a.export);
    for (const t of fromTrades) {
      if (t === trade) break;
      fromUsedAngle += (t.export / fromArc.totalExport) * fromArc.exportAngle;
    }
    
    let toUsedAngle = 0;
    const toTrades = trades.filter(t => t.to === trade.to);
    toTrades.sort((a, b) => a.export - b.export);
    for (const t of toTrades) {
      if (t === trade) break;
      toUsedAngle += (t.export / toArc.totalImport) * toArc.importAngle;
    }
    
    const fromStartAngle = fromArc.exportStartAngle + fromUsedAngle;
    const fromEndAngle = fromStartAngle + exportWidthOnFrom;
    const fromMidAngle = (fromStartAngle + fromEndAngle) / 2;
    
    const toStartAngle = toArc.importStartAngle + toUsedAngle;
    const toEndAngle = toStartAngle + importWidthOnTo;
    const toMidAngle = (toStartAngle + toEndAngle) / 2;
    
    const fromOuter1 = polarToCartesian(OUTER_RADIUS, fromStartAngle);
    const fromOuter2 = polarToCartesian(OUTER_RADIUS, fromEndAngle);
    const fromInner1 = polarToCartesian(INNER_RADIUS, fromStartAngle);
    const fromInner2 = polarToCartesian(INNER_RADIUS, fromEndAngle);
    
    const toOuter1 = polarToCartesian(OUTER_RADIUS, toStartAngle);
    const toOuter2 = polarToCartesian(OUTER_RADIUS, toEndAngle);
    const toInner1 = polarToCartesian(INNER_RADIUS, toStartAngle);
    const toInner2 = polarToCartesian(INNER_RADIUS, toEndAngle);
    
    const fromMidInner = polarToCartesian(INNER_RADIUS - 2, fromMidAngle);
    const toMidInner = polarToCartesian(INNER_RADIUS - 2, toMidAngle);
    
    const fromMidOuter = polarToCartesian(OUTER_RADIUS + 2, fromMidAngle);
    const toMidOuter = polarToCartesian(OUTER_RADIUS + 2, toMidAngle);
    
    const angleDiff = Math.abs(toMidAngle - fromMidAngle);
    const midAngle = (fromMidAngle + toMidAngle) / 2;
    let controlPoint;
    
    if (angleDiff > Math.PI) {
      const farMidAngle = midAngle + Math.PI;
      controlPoint = polarToCartesian(INNER_RADIUS * 0.55, farMidAngle);
    } else {
      controlPoint = polarToCartesian(INNER_RADIUS * 0.55, midAngle);
    }
    
    bands.push({
      from: fromArc,
      to: toArc,
      value: trade.export,
      trade,
      fromStartAngle,
      fromEndAngle,
      toStartAngle,
      toEndAngle,
      fromMidAngle,
      toMidAngle,
      fromOuter1,
      fromOuter2,
      fromInner1,
      fromInner2,
      toOuter1,
      toOuter2,
      toInner1,
      toInner2,
      fromMidInner,
      toMidInner,
      fromMidOuter,
      toMidOuter,
      controlPoint,
      width1: exportWidthOnFrom,
      width2: importWidthOnTo
    });
  });
  
  bands.sort((a, b) => a.value - b.value);
  
  const topCount = Math.ceil(bands.length * TOP_TRADE_RATIO);
  const sortedValues = [...bands].sort((a, b) => b.value - a.value);
  const topThreshold = sortedValues[Math.min(topCount, sortedValues.length - 1)].value;
  
  bands.forEach(band => {
    band.isTopTrade = band.value >= topThreshold;
  });
  
  return bands;
}

function drawCountryArc(arc, isHovered, isRelated) {
  ctx.save();
  
  ctx.beginPath();
  ctx.arc(CENTER_X, CENTER_Y, OUTER_RADIUS, arc.exportStartAngle, arc.exportEndAngle);
  ctx.arc(CENTER_X, CENTER_Y, INNER_RADIUS, arc.exportEndAngle, arc.exportStartAngle, true);
  ctx.closePath();
  
  const exportGradient = ctx.createRadialGradient(
    CENTER_X, CENTER_Y, INNER_RADIUS,
    CENTER_X, CENTER_Y, OUTER_RADIUS
  );
  exportGradient.addColorStop(0, arc.color + 'cc');
  exportGradient.addColorStop(1, arc.color + 'ff');
  
  ctx.fillStyle = exportGradient;
  ctx.globalAlpha = isHovered || isRelated ? 1 : 0.85;
  ctx.fill();
  
  ctx.beginPath();
  ctx.arc(CENTER_X, CENTER_Y, OUTER_RADIUS, arc.importStartAngle, arc.importEndAngle);
  ctx.arc(CENTER_X, CENTER_Y, INNER_RADIUS, arc.importEndAngle, arc.importStartAngle, true);
  ctx.closePath();
  
  const importGradient = ctx.createRadialGradient(
    CENTER_X, CENTER_Y, INNER_RADIUS,
    CENTER_X, CENTER_Y, OUTER_RADIUS
  );
  importGradient.addColorStop(0, arc.color + '66');
  importGradient.addColorStop(1, arc.color + '99');
  
  ctx.fillStyle = importGradient;
  ctx.globalAlpha = isHovered || isRelated ? 0.9 : 0.7;
  ctx.fill();
  
  ctx.strokeStyle = isHovered ? '#ffffff' : 'rgba(255,255,255,0.2)';
  ctx.lineWidth = isHovered ? 2 : 0.5;
  
  ctx.beginPath();
  ctx.arc(CENTER_X, CENTER_Y, OUTER_RADIUS, arc.startAngle, arc.endAngle);
  ctx.arc(CENTER_X, CENTER_Y, INNER_RADIUS, arc.endAngle, arc.startAngle, true);
  ctx.closePath();
  ctx.stroke();
  
  ctx.strokeStyle = 'rgba(255,255,255,0.3)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(polarToCartesian(INNER_RADIUS, arc.exportEndAngle).x, polarToCartesian(INNER_RADIUS, arc.exportEndAngle).y);
  ctx.lineTo(polarToCartesian(OUTER_RADIUS, arc.exportEndAngle).x, polarToCartesian(OUTER_RADIUS, arc.exportEndAngle).y);
  ctx.stroke();
  
  const labelRadius = (OUTER_RADIUS + INNER_RADIUS) / 2;
  const labelPoint = polarToCartesian(labelRadius, arc.countryMidAngle);
  
  ctx.save();
  ctx.translate(labelPoint.x, labelPoint.y);
  
  let rotation = arc.countryMidAngle + Math.PI / 2;
  if (rotation > Math.PI / 2 && rotation < Math.PI * 1.5) {
    rotation += Math.PI;
  }
  ctx.rotate(rotation);
  
  ctx.fillStyle = '#ffffff';
  ctx.font = isHovered ? 'bold 13px sans-serif' : '11px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.globalAlpha = 1;
  ctx.fillText(arc.code, 0, 0);
  
  ctx.restore();
  ctx.restore();
}

function drawTaperedBand(band, alpha) {
  if (alpha <= 0) return;
  
  ctx.save();
  
  const p1a = band.fromInner1;
  const p1b = band.fromInner2;
  const p2a = band.toInner1;
  const p2b = band.toInner2;
  
  const cp = band.controlPoint;
  
  const midP1 = {
    x: (p1a.x + p1b.x) / 2,
    y: (p1a.y + p1b.y) / 2
  };
  const midP2 = {
    x: (p2a.x + p2b.x) / 2,
    y: (p2a.y + p2b.y) / 2
  };
  
  const color1 = band.from.color;
  const color2 = band.to.color;
  
  const gradient = ctx.createLinearGradient(midP1.x, midP1.y, midP2.x, midP2.y);
  gradient.addColorStop(0, color1 + Math.floor(alpha * 200).toString(16).padStart(2, '0'));
  gradient.addColorStop(0.3, lerpColor(color1, color2, 0.3) + Math.floor(alpha * 180).toString(16).padStart(2, '0'));
  gradient.addColorStop(0.7, lerpColor(color1, color2, 0.7) + Math.floor(alpha * 180).toString(16).padStart(2, '0'));
  gradient.addColorStop(1, color2 + Math.floor(alpha * 200).toString(16).padStart(2, '0'));
  
  ctx.beginPath();
  ctx.moveTo(p1a.x, p1a.y);
  ctx.quadraticCurveTo(cp.x, cp.y, p2a.x, p2a.y);
  ctx.lineTo(p2b.x, p2b.y);
  ctx.quadraticCurveTo(cp.x, cp.y, p1b.x, p1b.y);
  ctx.closePath();
  
  ctx.fillStyle = gradient;
  ctx.fill();
  
  if (alpha > 0.5) {
    ctx.beginPath();
    ctx.moveTo(midP1.x, midP1.y);
    ctx.quadraticCurveTo(cp.x, cp.y, midP2.x, midP2.y);
    ctx.strokeStyle = 'rgba(255,255,255,' + (alpha * 0.3) + ')';
    ctx.lineWidth = 0.8;
    ctx.stroke();
  }
  
  ctx.restore();
}

function drawBandHighlight(band) {
  ctx.save();
  
  const p1a = band.fromInner1;
  const p1b = band.fromInner2;
  const p2a = band.toInner1;
  const p2b = band.toInner2;
  const cp = band.controlPoint;
  
  ctx.beginPath();
  ctx.moveTo(p1a.x, p1a.y);
  ctx.quadraticCurveTo(cp.x, cp.y, p2a.x, p2a.y);
  ctx.lineTo(p2b.x, p2b.y);
  ctx.quadraticCurveTo(cp.x, cp.y, p1b.x, p1b.y);
  ctx.closePath();
  
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.8;
  ctx.stroke();
  
  const midP1 = { x: (p1a.x + p1b.x) / 2, y: (p1a.y + p1b.y) / 2 };
  const midP2 = { x: (p2a.x + p2b.x) / 2, y: (p2a.y + p2b.y) / 2 };
  const gradient = ctx.createLinearGradient(midP1.x, midP1.y, midP2.x, midP2.y);
  gradient.addColorStop(0, band.from.color + 'ff');
  gradient.addColorStop(1, band.to.color + 'ff');
  
  ctx.fillStyle = gradient;
  ctx.globalAlpha = 1;
  ctx.fill();
  
  ctx.restore();
}

function drawCenterInfo() {
  ctx.save();
  
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.beginPath();
  ctx.arc(CENTER_X, CENTER_Y, 100, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.strokeStyle = 'rgba(78, 205, 196, 0.4)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  
  ctx.fillStyle = '#4ecdc4';
  ctx.font = 'bold 20px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('全球贸易', CENTER_X, CENTER_Y - 15);
  
  if (tradeData) {
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.font = '12px sans-serif';
    ctx.fillText(`${tradeData.countries.length} 经济体`, CENTER_X, CENTER_Y + 10);
    ctx.fillText('流向分析', CENTER_X, CENTER_Y + 28);
  }
  
  ctx.restore();
}

function getBandAlpha(band) {
  if (hoveredBand === band) return 1;
  
  if (hoveredCountry) {
    if (band.from === hoveredCountry || band.to === hoveredCountry) {
      return 0.95;
    }
    return 0.05;
  }
  
  return band.isTopTrade ? 0.75 : 0.15;
}

function render() {
  ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
  
  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
  ctx.beginPath();
  ctx.arc(CENTER_X, CENTER_Y, OUTER_RADIUS + 15, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  
  drawCenterInfo();
  
  if (tradeBands.length > 0) {
    tradeBands.forEach(band => {
      if (band !== hoveredBand) {
        const alpha = getBandAlpha(band) * animationProgress;
        drawTaperedBand(band, alpha);
      }
    });
    
    if (hoveredBand) {
      drawBandHighlight(hoveredBand);
    }
  }
  
  if (countryArcs.length > 0) {
    countryArcs.forEach(arc => {
      const isHovered = hoveredCountry === arc;
      const isRelated = hoveredBand && (hoveredBand.from === arc || hoveredBand.to === arc);
      drawCountryArc(arc, isHovered, isRelated);
    });
  }
}

function pointInArc(x, y, arc) {
  const dx = x - CENTER_X;
  const dy = y - CENTER_Y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  if (distance < INNER_RADIUS - 15 || distance > OUTER_RADIUS + 15) {
    return false;
  }
  
  let angle = Math.atan2(dy, dx);
  if (angle < -Math.PI / 2) angle += Math.PI * 2;
  
  let startAngle = arc.startAngle;
  let endAngle = arc.endAngle;
  if (startAngle < -Math.PI / 2) startAngle += Math.PI * 2;
  if (endAngle < -Math.PI / 2) endAngle += Math.PI * 2;
  
  if (startAngle <= endAngle) {
    return angle >= startAngle - GAP_ANGLE && angle <= endAngle + GAP_ANGLE;
  } else {
    return angle >= startAngle - GAP_ANGLE || angle <= endAngle + GAP_ANGLE;
  }
}

function pointInTaperedBand(px, py, band) {
  const p1a = band.fromInner1;
  const p1b = band.fromInner2;
  const p2a = band.toInner1;
  const p2b = band.toInner2;
  const cp = band.controlPoint;
  
  const steps = 30;
  let minDist = Infinity;
  
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const mt = 1 - t;
    
    const xa = mt * mt * p1a.x + 2 * mt * t * cp.x + t * t * p2a.x;
    const ya = mt * mt * p1a.y + 2 * mt * t * cp.y + t * t * p2a.y;
    const xb = mt * mt * p1b.x + 2 * mt * t * cp.x + t * t * p2b.x;
    const yb = mt * mt * p1b.y + 2 * mt * t * cp.y + t * t * p2b.y;
    
    const mx = (xa + xb) / 2;
    const my = (ya + yb) / 2;
    const halfWidth = Math.sqrt((xb - xa) * (xb - xa) + (yb - ya) * (yb - ya)) / 2 + 3;
    
    const dist = Math.sqrt((px - mx) * (px - mx) + (py - my) * (py - my));
    minDist = Math.min(minDist, dist - halfWidth);
  }
  
  return minDist <= 0;
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
      if (pointInTaperedBand(pos.x, pos.y, tradeBands[i])) {
        hoveredBand = tradeBands[i];
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
    const balance = country.totalExport - country.totalImport;
    
    countryInfoEl.innerHTML = `
      <h3>${country.name} (${country.code})</h3>
      <div class="info-item">
        <div class="info-label">总出口</div>
        <div class="info-value positive">${country.totalExport.toLocaleString()} 亿美元</div>
      </div>
      <div class="info-item">
        <div class="info-label">总进口</div>
        <div class="info-value negative">${country.totalImport.toLocaleString()} 亿美元</div>
      </div>
      <div class="info-item">
        <div class="info-label">贸易差额</div>
        <div class="info-value ${balance >= 0 ? 'positive' : 'negative'}">
          ${balance >= 0 ? '+' : ''}${balance.toLocaleString()} 亿美元
        </div>
      </div>
      <div class="info-item">
        <div class="info-label">顺逆差率</div>
        <div class="info-value ${balance >= 0 ? 'positive' : 'negative'}">
          ${((balance / country.totalTrade) * 100).toFixed(1)}%
        </div>
      </div>
    `;
  } else {
    countryInfoEl.innerHTML = `
      <h3>国家信息</h3>
      <p class="hint">悬停在圆弧上查看详情</p>
      <p class="hint" style="margin-top: 8px; font-size: 0.8rem;">
        圆弧左半段（深色）= 出口区<br>
        圆弧右半段（浅色）= 进口区
      </p>
    `;
  }
  
  if (hoveredBand) {
    const band = hoveredBand;
    const reverseTrade = tradeData.trade.find(
      t => t.from === band.to.code && t.to === band.from.code
    );
    const reverseValue = reverseTrade ? reverseTrade.export : 0;
    const netFlow = band.value - reverseValue;
    
    tradeInfoEl.innerHTML = `
      <h3>${band.from.name} → ${band.to.name}</h3>
      <div class="info-item">
        <div class="info-label">出口额</div>
        <div class="info-value positive">${band.value.toLocaleString()} 亿美元</div>
      </div>
      <div class="info-item">
        <div class="info-label">反向进口</div>
        <div class="info-value">${reverseValue.toLocaleString()} 亿美元</div>
      </div>
      <div class="info-item">
        <div class="info-label">${band.from.name}顺差</div>
        <div class="info-value ${netFlow >= 0 ? 'positive' : 'negative'}">
          ${netFlow >= 0 ? '+' : ''}${netFlow.toLocaleString()} 亿美元
        </div>
      </div>
      <div class="info-item">
        <div class="info-label">宽度比</div>
        <div class="info-value">
          ${(band.width1 / band.width2).toFixed(2)} : 1
        </div>
      </div>
    `;
  } else {
    tradeInfoEl.innerHTML = `
      <h3>贸易详情</h3>
      <p class="hint">悬停在色带上查看贸易数据</p>
      <p class="hint" style="margin-top: 8px; font-size: 0.8rem;">
        色带两端宽度不同<br>
        直观体现顺逆差关系
      </p>
    `;
  }
}

async function loadData() {
  try {
    const response = await fetch('/api/trade-data');
    tradeData = await response.json();
    
    const countriesWithStats = calculateCountryStats(tradeData.countries, tradeData.trade);
    countryArcs = calculateArcAngles(countriesWithStats);
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
    animationProgress += 0.025;
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
