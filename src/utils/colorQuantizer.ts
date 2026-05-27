import { LAB, FlossColor, QuantizeResult } from "../types";
import { rgbToLab, labDistance, labToRgb } from "./colorSpace";
import { DMC_FLOSS_COLORS } from "../data/flossColors";

interface LabPixel {
  lab: LAB;
  index: number;
}

const kMeansPlusPlusInit = (pixels: LabPixel[], k: number): LAB[] => {
  const centers: LAB[] = [];
  const n = pixels.length;

  const firstIdx = Math.floor(Math.random() * n);
  centers.push(pixels[firstIdx].lab);

  for (let i = 1; i < k; i++) {
    const distances: number[] = new Array(n);
    let totalDist = 0;

    for (let j = 0; j < n; j++) {
      let minDist = Infinity;
      for (const center of centers) {
        const dist = labDistance(pixels[j].lab, center);
        if (dist < minDist) minDist = dist;
      }
      distances[j] = minDist * minDist;
      totalDist += distances[j];
    }

    if (totalDist === 0) {
      centers.push(pixels[Math.floor(Math.random() * n)].lab);
      continue;
    }

    let r = Math.random() * totalDist;
    for (let j = 0; j < n; j++) {
      r -= distances[j];
      if (r <= 0) {
        centers.push(pixels[j].lab);
        break;
      }
    }
  }

  return centers;
};

const findClosestCenter = (lab: LAB, centers: LAB[]): number => {
  let minDist = Infinity;
  let closest = 0;

  for (let i = 0; i < centers.length; i++) {
    const dist = labDistance(lab, centers[i]);
    if (dist < minDist) {
      minDist = dist;
      closest = i;
    }
  }

  return closest;
};

const mapToDMCColors = (centers: LAB[]): FlossColor[] => {
  return centers.map((center) => {
    let minDist = Infinity;
    let closest = DMC_FLOSS_COLORS[0];

    for (const dmcColor of DMC_FLOSS_COLORS) {
      const dist = labDistance(center, dmcColor.lab);
      if (dist < minDist) {
        minDist = dist;
        closest = dmcColor;
      }
    }

    return closest;
  });
};

export const quantizeColors = (
  imageData: ImageData,
  k: number = 20,
  maxIterations: number = 30,
  onProgress?: (progress: number, text: string) => void
): QuantizeResult => {
  const { data, width, height } = imageData;

  onProgress?.(0, "转换颜色空间...");

  const pixels: LabPixel[] = [];
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue;
    const lab = rgbToLab({ r: data[i], g: data[i + 1], b: data[i + 2] });
    pixels.push({ lab, index: pixels.length });
  }

  if (pixels.length === 0) {
    return { palette: [], colorMap: [], width, height };
  }

  onProgress?.(10, "初始化聚类中心...");

  let centers = kMeansPlusPlusInit(pixels, k);

  const assignments = new Int32Array(pixels.length);

  for (let iter = 0; iter < maxIterations; iter++) {
    onProgress?.(10 + (iter / maxIterations) * 60, `聚类迭代 ${iter + 1}/${maxIterations}`);

    let changed = false;
    for (let i = 0; i < pixels.length; i++) {
      const newCenter = findClosestCenter(pixels[i].lab, centers);
      if (newCenter !== assignments[i]) {
        assignments[i] = newCenter;
        changed = true;
      }
    }

    if (!changed && iter > 0) break;

    const sums: LAB[] = centers.map(() => ({ L: 0, a: 0, b: 0 }));
    const counts = new Array(k).fill(0);

    for (let i = 0; i < pixels.length; i++) {
      const c = assignments[i];
      sums[c].L += pixels[i].lab.L;
      sums[c].a += pixels[i].lab.a;
      sums[c].b += pixels[i].lab.b;
      counts[c]++;
    }

    for (let c = 0; c < k; c++) {
      if (counts[c] > 0) {
        centers[c] = {
          L: sums[c].L / counts[c],
          a: sums[c].a / counts[c],
          b: sums[c].b / counts[c],
        };
      }
    }
  }

  onProgress?.(75, "映射到DMC刺绣线色...");

  const mappedCenters = mapToDMCColors(centers);
  const uniqueColors: FlossColor[] = [];
  const centerToColorIdx = new Map<number, number>();

  for (let i = 0; i < mappedCenters.length; i++) {
    const color = mappedCenters[i];
    let existingIdx = -1;
    for (let j = 0; j < uniqueColors.length; j++) {
      if (uniqueColors[j].id === color.id) {
        existingIdx = j;
        break;
      }
    }
    if (existingIdx === -1) {
      centerToColorIdx.set(i, uniqueColors.length);
      uniqueColors.push(color);
    } else {
      centerToColorIdx.set(i, existingIdx);
    }
  }

  onProgress?.(85, "生成颜色映射...");

  const colorMap: number[][] = [];
  let pixelIdx = 0;

  for (let y = 0; y < height; y++) {
    colorMap[y] = [];
    for (let x = 0; x < width; x++) {
      const dataIdx = (y * width + x) * 4;
      if (data[dataIdx + 3] === 0) {
        colorMap[y][x] = -1;
      } else {
        const centerIdx = assignments[pixelIdx];
        colorMap[y][x] = centerToColorIdx.get(centerIdx) ?? 0;
        pixelIdx++;
      }
    }
  }

  onProgress?.(100, "颜色量化完成");

  return {
    palette: uniqueColors,
    colorMap,
    width,
    height,
  };
};
