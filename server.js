const express = require('express');
const path = require('path');
const app = express();
const PORT = 3000;

app.use(express.static(path.join(__dirname, 'public')));

const BALL_RADIUS = 16;
const TABLE_WIDTH = 900;
const TABLE_HEIGHT = 500;
const CUSHION = 30;

const BALL_COLORS = [
  '#FFFFFF', '#FFD700', '#1E90FF', '#FF0000', '#4B0082',
  '#FF4500', '#006400', '#8B0000', '#000000', '#FFD700',
  '#1E90FF', '#FF0000', '#4B0082', '#FF4500', '#006400',
  '#8B0000'
];

function generateInitialBalls() {
  const balls = [];
  const cx = TABLE_WIDTH * 0.25;
  const cy = TABLE_HEIGHT / 2;

  balls.push({
    id: 0,
    x: cx,
    y: cy,
    color: BALL_COLORS[0],
    radius: BALL_RADIUS
  });

  const apexX = TABLE_WIDTH * 0.70;
  const apexY = TABLE_HEIGHT / 2;
  const spacing = BALL_RADIUS * 2 + 0.5;

  const rackOrder = [1, 9, 2, 10, 3, 8, 11, 4, 12, 5, 13, 6, 14, 7, 15];
  let orderIdx = 0;

  for (let row = 0; row < 5; row++) {
    for (let col = 0; col <= row; col++) {
      if (orderIdx >= rackOrder.length) break;
      const ballId = rackOrder[orderIdx];
      const x = apexX + row * spacing * Math.cos(Math.PI / 6);
      const y = apexY + (col - row / 2) * spacing;
      balls.push({
        id: ballId,
        x: x,
        y: y,
        color: BALL_COLORS[ballId],
        radius: BALL_RADIUS
      });
      orderIdx++;
    }
  }

  return balls;
}

app.get('/api/initial-balls', (req, res) => {
  res.json({
    tableWidth: TABLE_WIDTH,
    tableHeight: TABLE_HEIGHT,
    cushion: CUSHION,
    ballRadius: BALL_RADIUS,
    balls: generateInitialBalls()
  });
});

app.listen(PORT, () => {
  console.log(`Billiards server running at http://localhost:${PORT}`);
});
