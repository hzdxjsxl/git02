interface Point {
  x: number;
  y: number;
}

interface PathResult {
  colorIndex: number;
  path: [number, number][];
  totalLength: number;
  stitchCount: number;
}

interface WorkerInput {
  colorMatrix: number[][];
  gridSize: number;
  numColors: number;
}

interface WorkerProgress {
  type: 'progress';
  progress: number;
  text: string;
}

interface WorkerResult {
  type: 'result';
  paths: PathResult[];
}

type WorkerMessage = WorkerProgress | WorkerResult;

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

const twoOpt = (path: Point[], maxIterations: number = 50): Point[] => {
  if (path.length <= 3) return path;

  let bestPath = [...path];
  let bestLen = pathLength(bestPath);
  let iteration = 0;
  let improved = true;

  while (improved && iteration < maxIterations) {
    improved = false;
    iteration++;

    for (let i = 1; i < bestPath.length - 2; i++) {
      for (let j = i + 1; j < bestPath.length; j++) {
        const newPath = [
          ...bestPath.slice(0, i),
          ...bestPath.slice(i, j).reverse(),
          ...bestPath.slice(j),
        ];

        const newLen = pathLength(newPath);
        if (newLen < bestLen - 0.001) {
          bestPath = newPath;
          bestLen = newLen;
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

const calculatePathsForColor = (
  colorMatrix: number[][],
  gridSize: number,
  colorIdx: number
): PathResult => {
  const points: Point[] = [];

  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
      if (colorMatrix[y][x] === colorIdx) {
        points.push({ x, y });
      }
    }
  }

  if (points.length === 0) {
    return {
      colorIndex: colorIdx,
      path: [],
      totalLength: 0,
      stitchCount: 0,
    };
  }

  if (points.length === 1) {
    return {
      colorIndex: colorIdx,
      path: [[points[0].x, points[0].y]],
      totalLength: 0,
      stitchCount: 1,
    };
  }

  const maxPointsForOpt = 500;
  let sampledPoints = points;

  if (points.length > maxPointsForOpt) {
    const step = Math.ceil(points.length / maxPointsForOpt);
    sampledPoints = points.filter((_, i) => i % step === 0 || i === points.length - 1);
  }

  let path = nearestNeighbor(sampledPoints);

  const maxIterForOpt = Math.min(20, Math.max(5, Math.floor(1000 / sampledPoints.length)));
  path = twoOpt(path, maxIterForOpt);

  const segments = divideIntoSegments(path);
  const orderedPath: [number, number][] = [];

  for (const segment of segments) {
    for (const point of segment) {
      orderedPath.push([point.x, point.y]);
    }
  }

  const totalLength = pathLength(path);

  return {
    colorIndex: colorIdx,
    path: orderedPath,
    totalLength,
    stitchCount: points.length,
  };
};

const findPaths = (
  colorMatrix: number[][],
  gridSize: number,
  numColors: number
): PathResult[] => {
  const paths: PathResult[] = [];
  const startTime = Date.now();

  for (let colorIdx = 0; colorIdx < numColors; colorIdx++) {
    const progress = ((colorIdx + 1) / numColors) * 100;
    const message: WorkerProgress = {
      type: 'progress',
      progress,
      text: `计算路径 ${colorIdx + 1}/${numColors}`,
    };
    postMessage(message);

    paths.push(calculatePathsForColor(colorMatrix, gridSize, colorIdx));

    const elapsed = Date.now() - startTime;
    if (elapsed > 50) {
      const elapsed = Date.now() - startTime;
      if (elapsed > 10) {
      }
    }
  }

  return paths;
};

self.onmessage = (e: MessageEvent<WorkerInput>) => {
  const { colorMatrix, gridSize, numColors } = e.data;

  try {
    const paths = findPaths(colorMatrix, gridSize, numColors);

    const result: WorkerResult = {
      type: 'result',
      paths,
    };
    postMessage(result);
  } catch (error) {
    console.error('Path worker error:', error);
    postMessage({
      type: 'result',
      paths: [],
      error: String(error),
    });
  }
};

export {};
