const SNAP = (() => {
  const PURE_WHITE = 250;

  function getGray(imageData, x, y) {
    const w = imageData.width;
    if (x < 0 || x >= w || y < 0 || y >= imageData.height) return 255;
    const i = (y * w + x) * 4;
    const d = imageData.data;
    return (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114);
  }

  function isPureWhite(imageData, x, y) {
    return getGray(imageData, x, y) >= PURE_WHITE;
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

  function regionHasTextPixels(imageData, x, y, w, h, minPixels = 1) {
    const x1 = Math.max(0, Math.floor(x));
    const y1 = Math.max(0, Math.floor(y));
    const x2 = Math.min(imageData.width - 1, Math.ceil(x + w));
    const y2 = Math.min(imageData.height - 1, Math.ceil(y + h));
    let count = 0;
    for (let py = y1; py <= y2; py += 2) {
      for (let px = x1; px <= x2; px += 2) {
        if (!isPureWhite(imageData, px, py)) {
          count++;
          if (count >= minPixels) return true;
        }
      }
    }
    return count >= minPixels;
  }

  function findNearestTextBoundary(imageData, targetX, targetY, maxSearch = 100) {
    if (!isPureWhite(imageData, targetX, targetY)) {
      return { x: targetX, y: targetY, dist: 0, hit: true };
    }
    let best = null;
    let bestDist = Infinity;
    for (let r = 2; r <= maxSearch; r += 2) {
      for (let angle = 0; angle < 360; angle += 15) {
        const rad = angle * Math.PI / 180;
        const sx = Math.round(targetX + Math.cos(rad) * r);
        const sy = Math.round(targetY + Math.sin(rad) * r);
        if (!isPureWhite(imageData, sx, sy)) {
          if (r < bestDist) {
            bestDist = r;
            best = { x: sx, y: sy, dist: r, hit: true };
          }
        }
      }
      if (best && bestDist < r + 4) break;
    }
    if (best) {
      const edge = detectEdgeOnLine(imageData, targetX, targetY, best.x, best.y, {
        threshold: 30,
        scanStep: 1
      });
      if (edge) {
        return { x: edge.x, y: edge.y, dist: Math.hypot(edge.x - targetX, edge.y - targetY), hit: true };
      }
    }
    return { x: targetX, y: targetY, dist: bestDist, hit: false };
  }

  function snapCorner(imageData, cornerX, cornerY, rect, opts = {}) {
    const searchRadius = opts.searchRadius != null ? opts.searchRadius : 30;
    const threshold = opts.threshold != null ? opts.threshold : 35;
    const scanStep = opts.scanStep != null ? opts.scanStep : 1;
    const enforceBoundary = opts.enforceBoundary !== false;

    let snapped = null;
    let bestScore = -1;

    const directions = [
      { dx: -1, dy: 0, dir: 'left' },
      { dx: 1, dy: 0, dir: 'right' },
      { dx: 0, dy: -1, dir: 'up' },
      { dx: 0, dy: 1, dir: 'down' },
      { dx: -1, dy: -1, dir: 'ul' },
      { dx: 1, dy: -1, dir: 'ur' },
      { dx: -1, dy: 1, dir: 'dl' },
      { dx: 1, dy: 1, dir: 'dr' }
    ];

    for (const d of directions) {
      for (let r = 4; r <= searchRadius; r += 2) {
        const candX = cornerX + d.dx * r;
        const candY = cornerY + d.dy * r;
        const edge = detectEdgeOnLine(imageData, cornerX, cornerY, candX, candY, {
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
    }

    if (snapped) {
      return {
        x: snapped.x,
        y: snapped.y,
        snapped: true,
        diff: snapped.diff,
        boundaryValid: true
      };
    }

    if (enforceBoundary) {
      const boundary = findNearestTextBoundary(imageData, cornerX, cornerY, searchRadius * 1.5);
      if (boundary.hit) {
        return {
          x: boundary.x,
          y: boundary.y,
          snapped: true,
          diff: 100,
          boundaryValid: true,
          boundaryFallback: true
        };
      }
    }

    return {
      x: cornerX,
      y: cornerY,
      snapped: false,
      boundaryValid: !enforceBoundary,
      boundaryFallback: false
    };
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

  function validateBoxPosition(imageData, proposedBox, originalBox) {
    const { x, y, w, h } = proposedBox;

    if (regionHasTextPixels(imageData, x - 5, y - 5, w + 10, h + 10, 2)) {
      return { valid: true, box: proposedBox, reason: 'has-text' };
    }

    const corners = [
      { x: x, y: y, handle: 'tl' },
      { x: x + w, y: y, handle: 'tr' },
      { x: x, y: y + h, handle: 'bl' },
      { x: x + w, y: y + h, handle: 'br' }
    ];

    const snappedCorners = corners.map(c => {
      const s = snapCorner(imageData, c.x, c.y, proposedBox, {
        searchRadius: 80,
        threshold: 30,
        enforceBoundary: true
      });
      return { ...c, snapped: s };
    });

    const validSnaps = snappedCorners.filter(c => c.snapped.boundaryValid);
    if (validSnaps.length >= 2) {
      const xs = validSnaps.map(c => c.snapped.x);
      const ys = validSnaps.map(c => c.snapped.y);
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);

      const rebound = {
        x: minX,
        y: minY,
        w: Math.max(20, maxX - minX),
        h: Math.max(20, maxY - minY),
        text: proposedBox.text,
        id: proposedBox.id
      };

      return {
        valid: false,
        box: rebound,
        reason: 'rebound-to-nearest-text',
        rebound: true
      };
    }

    return {
      valid: false,
      box: { ...originalBox },
      reason: 'no-text-found-revert',
      revert: true
    };
  }

  function buildTextBoundaryMap(imageData) {
    const w = imageData.width;
    const h = imageData.height;
    const map = new Float32Array(w * h);

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        map[y * w + x] = isPureWhite(imageData, x, y) ? 1 : 0;
      }
    }

    for (let y = 0; y < h; y++) {
      let dist = 9999;
      for (let x = 0; x < w; x++) {
        if (map[y * w + x] === 0) dist = 0;
        else dist++;
        map[y * w + x] = Math.min(map[y * w + x], dist);
      }
      dist = 9999;
      for (let x = w - 1; x >= 0; x--) {
        if (map[y * w + x] === 0) dist = 0;
        else dist++;
        map[y * w + x] = Math.min(map[y * w + x], dist);
      }
    }

    for (let x = 0; x < w; x++) {
      let dist = 9999;
      for (let y = 0; y < h; y++) {
        if (map[y * w + x] === 0) dist = 0;
        else dist = Math.min(dist + 1, map[y * w + x]);
        map[y * w + x] = dist;
      }
      dist = 9999;
      for (let y = h - 1; y >= 0; y--) {
        if (map[y * w + x] === 0) dist = 0;
        else dist = Math.min(dist + 1, map[y * w + x]);
        map[y * w + x] = Math.min(map[y * w + x], dist);
      }
    }

    return { map, width: w, height: h };
  }

  return {
    getGray,
    isPureWhite,
    scanAlongLine,
    detectEdgeOnLine,
    snapCorner,
    snapEdgeSide,
    regionHasTextPixels,
    findNearestTextBoundary,
    validateBoxPosition,
    buildTextBoundaryMap
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = SNAP;
}
