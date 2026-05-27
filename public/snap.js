const SNAP = (() => {
  function getGray(imageData, x, y) {
    const w = imageData.width;
    const i = (y * w + x) * 4;
    const d = imageData.data;
    return (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114);
  }

  function scanAlongLine(imageData, x0, y0, x1, y1, stepPx = 1) {
    const samples = [];
    const dx = x1 - x0;
    const dy = y1 - y0;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 1) return samples;
    const steps = Math.ceil(dist / stepPx);
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const x = Math.round(x0 + dx * t);
      const y = Math.round(y0 + dy * t);
      if (x >= 0 && x < imageData.width && y >= 0 && y < imageData.height) {
        samples.push({ x, y, gray: getGray(imageData, x, y), t });
      }
    }
    return samples;
  }

  function detectEdgeOnLine(imageData, x0, y0, x1, y1, opts = {}) {
    const threshold = opts.threshold != null ? opts.threshold : 40;
    const scanStep = opts.scanStep != null ? opts.scanStep : 1;
    const samples = scanAlongLine(imageData, x0, y0, x1, y1, scanStep);
    if (samples.length < 2) return null;

    let bestIdx = -1;
    let bestScore = 0;
    for (let i = 1; i < samples.length; i++) {
      const diff = Math.abs(samples[i].gray - samples[i - 1].gray);
      if (diff > bestScore && diff >= threshold) {
        bestScore = diff;
        bestIdx = i;
      }
    }
    if (bestIdx < 0) return null;
    const s0 = samples[bestIdx - 1];
    const s1 = samples[bestIdx];
    return {
      x: Math.round((s0.x + s1.x) / 2),
      y: Math.round((s0.y + s1.y) / 2),
      grayBefore: s0.gray,
      grayAfter: s1.gray,
      diff: bestScore
    };
  }

  function snapCorner(imageData, cornerX, cornerY, rect, opts = {}) {
    const searchRadius = opts.searchRadius != null ? opts.searchRadius : 30;
    const threshold = opts.threshold != null ? opts.threshold : 35;
    const scanStep = opts.scanStep != null ? opts.scanStep : 1;

    let snapped = null;
    let bestScore = -1;

    const candidates = [];
    for (let r = 4; r <= searchRadius; r += 2) {
      candidates.push({ x: cornerX - r, y: cornerY, dir: 'left' });
      candidates.push({ x: cornerX + r, y: cornerY, dir: 'right' });
      candidates.push({ x: cornerX, y: cornerY - r, dir: 'up' });
      candidates.push({ x: cornerX, y: cornerY + r, dir: 'down' });
      candidates.push({ x: cornerX - r, y: cornerY - r, dir: 'ul' });
      candidates.push({ x: cornerX + r, y: cornerY - r, dir: 'ur' });
      candidates.push({ x: cornerX - r, y: cornerY + r, dir: 'dl' });
      candidates.push({ x: cornerX + r, y: cornerY + r, dir: 'dr' });
    }

    for (const cand of candidates) {
      const edge = detectEdgeOnLine(imageData, cornerX, cornerY, cand.x, cand.y, {
        threshold,
        scanStep
      });
      if (!edge) continue;
      const dist = Math.hypot(edge.x - cornerX, edge.y - cornerY);
      if (dist > searchRadius) continue;
      const score = edge.diff - dist * 0.5;
      if (score > bestScore) {
        bestScore = score;
        snapped = edge;
      }
    }

    if (!snapped) return { x: cornerX, y: cornerY, snapped: false };
    return { x: snapped.x, y: snapped.y, snapped: true, diff: snapped.diff };
  }

  function snapEdgeSide(imageData, side, rect, opts = {}) {
    const searchRadius = opts.searchRadius != null ? opts.searchRadius : 25;
    const threshold = opts.threshold != null ? opts.threshold : 35;

    const { x, y, w, h } = rect;
    let centerX, centerY, dirX, dirY;
    if (side === 'top') {
      centerX = x + w / 2;
      centerY = y;
      dirX = 0; dirY = -1;
    } else if (side === 'bottom') {
      centerX = x + w / 2;
      centerY = y + h;
      dirX = 0; dirY = 1;
    } else if (side === 'left') {
      centerX = x;
      centerY = y + h / 2;
      dirX = -1; dirY = 0;
    } else if (side === 'right') {
      centerX = x + w;
      centerY = y + h / 2;
      dirX = 1; dirY = 0;
    } else {
      return null;
    }

    const endX = centerX + dirX * searchRadius;
    const endY = centerY + dirY * searchRadius;
    const edge = detectEdgeOnLine(imageData, centerX, centerY, endX, endY, { threshold });
    if (!edge) return null;
    return { x: edge.x, y: edge.y };
  }

  return {
    getGray,
    scanAlongLine,
    detectEdgeOnLine,
    snapCorner,
    snapEdgeSide
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = SNAP;
}
