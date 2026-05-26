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

  updateParams(params) {
    Object.assign(this.options, params);
  }

  injectSources(reportData) {
    for (const village of this.villages) {
      const count = reportData[village.id] || 0;
      if (count <= 0) continue;

      const gridX = Math.floor(village.x * this.gridWidth);
      const gridY = Math.floor(village.y * this.gridHeight);

      const baseIntensity = Math.log(count + 1) * 8;
      const radius = Math.min(Math.floor(Math.sqrt(count) / 3 + 2), 12);

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
        newValue = Math.max(0, Math.min(newValue, 1000));

        this.tempField[idx] = newValue;
      }
    }

    [this.scalarField, this.tempField] = [this.tempField, this.scalarField];
  }

  simulate(reportData, iterations = 8) {
    this.initScalarField();
    this.injectSources(reportData);

    for (let i = 0; i < iterations; i++) {
      this.cellularAutomatonStep();
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

  generateContourLevels(count = 8) {
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

    const paths = [];
    const used = new Set();

    for (let i = 0; i < segments.length; i++) {
      if (used.has(i)) continue;

      const path = [segments[i][0], segments[i][1]];
      used.add(i);

      let extended = true;
      while (extended) {
        extended = false;

        const lastPoint = path[path.length - 1];
        for (let j = 0; j < segments.length; j++) {
          if (used.has(j)) continue;

          const seg = segments[j];
          const d1 = this.pointDistance(lastPoint, seg[0]);
          const d2 = this.pointDistance(lastPoint, seg[1]);

          if (d1 < 1.5) {
            path.push(seg[1]);
            used.add(j);
            extended = true;
            break;
          } else if (d2 < 1.5) {
            path.push(seg[0]);
            used.add(j);
            extended = true;
            break;
          }
        }
      }

      const firstPoint = path[0];
      const finalPoint = path[path.length - 1];
      if (this.pointDistance(firstPoint, finalPoint) < 2) {
        path.push({ ...firstPoint });
      }

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
