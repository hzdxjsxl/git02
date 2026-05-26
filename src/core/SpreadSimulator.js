export class SpreadSimulator {
  constructor(villages, options = {}) {
    this.villages = villages;
    this.options = {
      spreadRate: options.spreadRate || 0.8,
      decayRate: options.decayRate || 0.03,
      windFactor: options.windFactor || 0.3,
      windVector: options.windVector || { x: 0.3, y: -0.2 },
      gridResolution: options.gridResolution || 80,
      ...options
    };

    this.gridWidth = this.options.gridResolution;
    this.gridHeight = this.options.gridResolution;
    this.scalarField = [];
    this.tempField = [];

    this.initScalarField();
  }

  initScalarField() {
    this.scalarField = new Float32Array(this.gridWidth * this.gridHeight);
    this.tempField = new Float32Array(this.gridWidth * this.gridHeight);
  }

  getIndex(x, y) {
    return y * this.gridWidth + x;
  }

  getValue(x, y) {
    if (x < 0 || x >= this.gridWidth || y < 0 || y >= this.gridHeight) {
      return 0;
    }
    return this.scalarField[this.getIndex(x, y)];
  }

  setValue(x, y, value) {
    if (x >= 0 && x < this.gridWidth && y >= 0 && y < this.gridHeight) {
      this.scalarField[this.getIndex(x, y)] = value;
    }
  }

  addValue(x, y, value) {
    if (x >= 0 && x < this.gridWidth && y >= 0 && y < this.gridHeight) {
      this.scalarField[this.getIndex(x, y)] += value;
    }
  }

  getInterpolatedValue(mapX, mapY) {
    const gx = mapX * this.gridWidth;
    const gy = mapY * this.gridHeight;

    const x0 = Math.floor(gx);
    const y0 = Math.floor(gy);
    const x1 = Math.min(x0 + 1, this.gridWidth - 1);
    const y1 = Math.min(y0 + 1, this.gridHeight - 1);

    const fx = gx - x0;
    const fy = gy - y0;

    const v00 = this.getValue(x0, y0);
    const v10 = this.getValue(x1, y0);
    const v01 = this.getValue(x0, y1);
    const v11 = this.getValue(x1, y1);

    const top = v00 * (1 - fx) + v10 * fx;
    const bottom = v01 * (1 - fx) + v11 * fx;

    return top * (1 - fy) + bottom * fy;
  }

  updateParams(params) {
    Object.assign(this.options, params);
  }

  injectSources(reportData) {
    for (const village of this.villages) {
      const count = reportData[village.id] || 0;
      if (count <= 0) continue;

      const gridX = Math.floor(village.x * this.gridWidth);
      const gridY = Math.floor(village.y * this.gridHeight);

      const baseIntensity = Math.log(count + 1) * 12;
      const radius = Math.min(Math.floor(Math.sqrt(count) / 2 + 3), 18);

      this.injectGaussianSource(gridX, gridY, baseIntensity, radius);
    }
  }

  injectGaussianSource(cx, cy, intensity, radius) {
    const sigma = radius / 3;
    const twoSigmaSq = 2 * sigma * sigma;

    for (let y = Math.max(0, cy - radius); y <= Math.min(this.gridHeight - 1, cy + radius); y++) {
      for (let x = Math.max(0, cx - radius); x <= Math.min(this.gridWidth - 1, cx + radius); x++) {
        const dx = x - cx;
        const dy = y - cy;
        const distSq = dx * dx + dy * dy;

        if (distSq <= radius * radius) {
          const gaussian = Math.exp(-distSq / twoSigmaSq);
          this.addValue(x, y, intensity * gaussian);
        }
      }
    }
  }

  cellularAutomatonStep() {
    const windX = this.options.windVector.x * this.options.windFactor;
    const windY = this.options.windVector.y * this.options.windFactor;
    const spreadRate = this.options.spreadRate;
    const decayRate = this.options.decayRate;

    for (let y = 0; y < this.gridHeight; y++) {
      for (let x = 0; x < this.gridWidth; x++) {
        const idx = this.getIndex(x, y);
        let newValue = 0;

        const anisotropicKernel = [
          { dx: -1, dy: -1, weight: 0.05 },
          { dx: 0, dy: -1, weight: 0.10 },
          { dx: 1, dy: -1, weight: 0.05 },
          { dx: -1, dy: 0, weight: 0.10 },
          { dx: 0, dy: 0, weight: 0.40 },
          { dx: 1, dy: 0, weight: 0.10 },
          { dx: -1, dy: 1, weight: 0.05 },
          { dx: 0, dy: 1, weight: 0.10 },
          { dx: 1, dy: 1, weight: 0.05 }
        ];

        for (const k of anisotropicKernel) {
          const nx = x + k.dx;
          const ny = y + k.dy;
          const neighborValue = this.getValue(nx, ny);

          const dotProduct = k.dx * windX + k.dy * windY;
          const windModulation = 1 + dotProduct * 2.5;
          const adjustedWeight = k.weight * Math.max(0.1, windModulation);

          newValue += neighborValue * adjustedWeight * spreadRate;
        }

        newValue *= (1 - decayRate);
        newValue = Math.max(0, newValue);

        this.tempField[idx] = newValue;
      }
    }

    [this.scalarField, this.tempField] = [this.tempField, this.scalarField];
  }

  simulate(reportData, iterations = 8, reset = true) {
    if (reset) {
      this.initScalarField();
    }
    this.injectSources(reportData);

    for (let i = 0; i < iterations; i++) {
      this.cellularAutomatonStep();
    }

    return this.scalarField;
  }

  advanceStep(reportData) {
    const prevField = new Float32Array(this.scalarField);

    this.injectSources(reportData);
    this.cellularAutomatonStep();

    for (let i = 0; i < this.scalarField.length; i++) {
      this.scalarField[i] = prevField[i] * 0.6 + this.scalarField[i] * 0.4;
    }

    return this.scalarField;
  }

  getMaxValue() {
    let max = 0;
    for (let i = 0; i < this.scalarField.length; i++) {
      max = Math.max(max, this.scalarField[i]);
    }
    return max;
  }

  generateContourLevels(count = 10) {
    const maxVal = this.getMaxValue();
    const levels = [];

    if (maxVal <= 0.01) return levels;

    const logMax = Math.log(maxVal + 1);

    for (let i = 1; i <= count; i++) {
      const t = i / (count + 1);
      const level = Math.exp(t * logMax) - 1;
      levels.push(level);
    }

    return levels;
  }

  marchingSquares(level) {
    const segments = [];

    for (let y = 0; y < this.gridHeight - 1; y++) {
      for (let x = 0; x < this.gridWidth - 1; x++) {
        const v0 = this.getValue(x, y);
        const v1 = this.getValue(x + 1, y);
        const v2 = this.getValue(x + 1, y + 1);
        const v3 = this.getValue(x, y + 1);

        let caseIndex = 0;
        if (v0 >= level) caseIndex |= 1;
        if (v1 >= level) caseIndex |= 2;
        if (v2 >= level) caseIndex |= 4;
        if (v3 >= level) caseIndex |= 8;

        if (caseIndex === 0 || caseIndex === 15) continue;

        const interpolate = (a, b, va, vb) => {
          if (Math.abs(vb - va) < 0.0001) return a;
          const t = (level - va) / (vb - va);
          return a + t * (b - a);
        };

        const top = { x: interpolate(x, x + 1, v0, v1), y };
        const right = { x: x + 1, y: interpolate(y, y + 1, v1, v2) };
        const bottom = { x: interpolate(x, x + 1, v3, v2), y: y + 1 };
        const left = { x, y: interpolate(y, y + 1, v0, v3) };

        switch (caseIndex) {
          case 1:
          case 14:
            segments.push([{ ...left }, { ...top }]);
            break;
          case 2:
          case 13:
            segments.push([{ ...top }, { ...right }]);
            break;
          case 3:
          case 12:
            segments.push([{ ...left }, { ...right }]);
            break;
          case 4:
          case 11:
            segments.push([{ ...right }, { ...bottom }]);
            break;
          case 5:
            segments.push([{ ...left }, { ...top }]);
            segments.push([{ ...right }, { ...bottom }]);
            break;
          case 6:
          case 9:
            segments.push([{ ...top }, { ...bottom }]);
            break;
          case 7:
          case 8:
            segments.push([{ ...left }, { ...bottom }]);
            break;
          case 10:
            segments.push([{ ...top }, { ...right }]);
            segments.push([{ ...left }, { ...bottom }]);
            break;
        }
      }
    }

    return segments;
  }

  buildContourPaths(level) {
    const segments = this.marchingSquares(level);
    if (segments.length === 0) return [];

    const endpointMap = new Map();
    const segmentData = segments.map((seg, idx) => {
      const p0 = { ...seg[0], segIdx: idx, end: 0 };
      const p1 = { ...seg[1], segIdx: idx, end: 1 };
      return { seg, p0, p1 };
    });

    for (const sd of segmentData) {
      const key0 = `${sd.p0.x.toFixed(2)}_${sd.p0.y.toFixed(2)}`;
      const key1 = `${sd.p1.x.toFixed(2)}_${sd.p1.y.toFixed(2)}`;

      if (!endpointMap.has(key0)) endpointMap.set(key0, []);
      if (!endpointMap.has(key1)) endpointMap.set(key1, []);

      endpointMap.get(key0).push({ point: sd.p0, other: sd.p1, segIdx: sd.p0.segIdx });
      endpointMap.get(key1).push({ point: sd.p1, other: sd.p0, segIdx: sd.p1.segIdx });
    }

    const usedSegments = new Set();
    const paths = [];

    const buildPath = (startPoint, isClosed = true) => {
      const path = [{ x: startPoint.x, y: startPoint.y }];
      let current = startPoint;

      let safety = 0;
      const maxIterations = segments.length * 2;

      while (safety < maxIterations) {
        safety++;
        const key = `${current.x.toFixed(2)}_${current.y.toFixed(2)}`;
        const connections = endpointMap.get(key);

        if (!connections || connections.length === 0) break;

        let nextConnection = null;

        for (const conn of connections) {
          if (usedSegments.has(conn.segIdx)) continue;

          if (path.length > 1) {
            const prev = path[path.length - 2];
            const dx = conn.other.x - current.x;
            const dy = conn.other.y - current.y;
            const prevDx = current.x - prev.x;
            const prevDy = current.y - prev.y;

            const dotProduct = dx * prevDx + dy * prevDy;
            const len1 = Math.sqrt(dx * dx + dy * dy);
            const len2 = Math.sqrt(prevDx * prevDx + prevDy * prevDy);

            if (len1 > 0 && len2 > 0) {
              const cosAngle = dotProduct / (len1 * len2);
              if (cosAngle < -0.5) continue;
            }
          }

          nextConnection = conn;
          break;
        }

        if (!nextConnection) {
          for (const conn of connections) {
            if (!usedSegments.has(conn.segIdx)) {
              nextConnection = conn;
              break;
            }
          }
        }

        if (!nextConnection) break;

        usedSegments.add(nextConnection.segIdx);
        path.push({ x: nextConnection.other.x, y: nextConnection.other.y });
        current = nextConnection.other;

        if (isClosed) {
          const first = path[0];
          const last = path[path.length - 1];
          const dist = Math.sqrt((first.x - last.x) ** 2 + (first.y - last.y) ** 2);
          if (dist < 1.5 && path.length >= 3) {
            path.push({ x: first.x, y: first.y });
            return path;
          }
        }
      }

      return path;
    };

    for (const sd of segmentData) {
      if (usedSegments.has(sd.p0.segIdx)) continue;

      usedSegments.add(sd.p0.segIdx);
      const path = buildPath(sd.p0, true);

      if (path.length >= 3) {
        paths.push(path);
      }
    }

    return paths;
  }

  pointDistance(p1, p2) {
    return Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
  }
}
