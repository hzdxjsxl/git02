import { GridResult, PathResult } from "../types";

interface Point {
  x: number;
  y: number;
}

const distance = (a: Point, b: Point): number => {
  return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
};

const pathLength = (path: Point[]): number => {
  let total = 0;
  for (let i = 1; i < path.length; i++) {
    total += distance(path[i - 1], path[i]);
  }
  return total;
};

const nearestNeighbor = (points: Point[]): Point[] => {
  if (points.length <= 2) return [...points];

  const result: Point[] = [points[0]];
  const remaining = new Set(points.slice(1).map((_, i) => i + 1));

  while (remaining.size > 0) {
    const current = result[result.length - 1];
    let nearestIdx = -1;
    let nearestDist = Infinity;

    for (const idx of remaining) {
      const dist = distance(current, points[idx]);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestIdx = idx;
      }
    }

    if (nearestIdx >= 0) {
      result.push(points[nearestIdx]);
      remaining.delete(nearestIdx);
    }
  }

  return result;
};

const twoOpt = (path: Point[]): Point[] => {
  if (path.length <= 3) return path;

  let improved = true;
  let bestPath = [...path];

  while (improved) {
    improved = false;
    const bestLen = pathLength(bestPath);

    for (let i = 1; i < bestPath.length - 2; i++) {
      for (let j = i + 1; j < bestPath.length; j++) {
        const newPath = [
          ...bestPath.slice(0, i),
          ...bestPath.slice(i, j).reverse(),
          ...bestPath.slice(j),
        ];

        const newLen = pathLength(newPath);
        if (newLen < bestLen) {
          bestPath = newPath;
          improved = true;
        }
      }
    }
  }

  return bestPath;
};

const divideIntoSegments = (path: Point[], maxStitches: number = 50): Point[][] => {
  if (path.length <= maxStitches) return [path];

  const segments: Point[][] = [];
  for (let i = 0; i < path.length; i += maxStitches) {
    const end = Math.min(i + maxStitches, path.length);
    segments.push(path.slice(i, end));
  }

  return segments;
};

export const findPaths = (
  gridResult: GridResult,
  numColors: number,
  onProgress?: (progress: number, text: string) => void
): PathResult[] => {
  const { colorMatrix, gridSize } = gridResult;
  const paths: PathResult[] = [];

  for (let colorIdx = 0; colorIdx < numColors; colorIdx++) {
    onProgress?.(
      (colorIdx / numColors) * 100,
      `计算路径 ${colorIdx + 1}/${numColors}`
    );

    const points: Point[] = [];

    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        if (colorMatrix[y][x] === colorIdx) {
          points.push({ x, y });
        }
      }
    }

    if (points.length === 0) {
      paths.push({
        colorIndex: colorIdx,
        path: [],
        totalLength: 0,
        stitchCount: 0,
      });
      continue;
    }

    if (points.length === 1) {
      paths.push({
        colorIndex: colorIdx,
        path: [[points[0].x, points[0].y]],
        totalLength: 0,
        stitchCount: 1,
      });
      continue;
    }

    let path = nearestNeighbor(points);
    path = twoOpt(path);

    const segments = divideIntoSegments(path);
    const orderedPath: [number, number][] = [];

    for (const segment of segments) {
      for (const point of segment) {
        orderedPath.push([point.x, point.y]);
      }
    }

    const totalLength = pathLength(path);

    paths.push({
      colorIndex: colorIdx,
      path: orderedPath,
      totalLength,
      stitchCount: points.length,
    });
  }

  onProgress?.(100, "路径计算完成");

  return paths;
};

export const getColorSegments = (
  path: PathResult,
  maxStitches: number = 50
): [number, number][][] => {
  const segments: [number, number][][] = [];

  for (let i = 0; i < path.path.length; i += maxStitches) {
    const end = Math.min(i + maxStitches, path.path.length);
    segments.push(path.path.slice(i, end));
  }

  return segments;
};
