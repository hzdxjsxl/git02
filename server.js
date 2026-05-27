const express = require('express');
const path = require('path');
const app = express();
const PORT = 3000;

app.use(express.static('public'));

app.get('/api/break-positions', (req, res) => {
  const balls = generateBilliardBalls();
  res.json(balls);
});

function generateBilliardBalls() {
  const balls = [];
  const radius = 14;
  const startX = 600;
  const startY = 300;
  const spacing = radius * 2 + 1;

  const ballColors = [
    '#FFFFFF',
    '#FFD700',
    '#0000FF',
    '#FF0000',
    '#800080',
    '#FFA500',
    '#008000',
    '#8B0000',
    '#FFD700',
    '#0000FF',
    '#FF0000',
    '#800080',
    '#FFA500',
    '#008000',
    '#8B0000',
    '#000000'
  ];

  balls.push({
    id: 0,
    x: 200,
    y: 300,
    radius: radius,
    color: ballColors[0],
    isCueBall: true
  });

  const rows = 5;
  let ballIndex = 1;
  for (let row = 0; row < rows; row++) {
    const ballsInRow = row + 1;
    const rowY = startY - (row * radius * Math.sqrt(3)) + ((rows - 1) * radius * Math.sqrt(3)) / 2;
    for (let col = 0; col < ballsInRow; col++) {
      balls.push({
        id: ballIndex,
        x: startX + row * spacing,
        y: rowY + col * spacing * Math.sqrt(3) - (row * radius * Math.sqrt(3)),
        radius: radius,
        color: ballColors[ballIndex % ballColors.length],
        isCueBall: false
      });
      ballIndex++;
    }
  }

  return balls;
}

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Billiards Physics Server running at http://localhost:${PORT}`);
});
