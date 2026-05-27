class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.offsetX = 50;
    this.offsetY = 50;
    this.scale = 1;
    this.tableColor = '#1a5f1a';
    this.railColor = '#3d2817';
  }

  clear() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  drawTable(width, height) {
    const x = this.offsetX;
    const y = this.offsetY;
    const w = width * this.scale;
    const h = height * this.scale;
    const railWidth = 20;

    this.ctx.fillStyle = this.railColor;
    this.ctx.fillRect(x - railWidth, y - railWidth, w + railWidth * 2, h + railWidth * 2);

    this.ctx.fillStyle = this.tableColor;
    this.ctx.fillRect(x, y, w, h);

    this.ctx.strokeStyle = '#0d3d0d';
    this.ctx.lineWidth = 2;
    for (let i = 0; i < 6; i++) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, y + i * h / 5);
      this.ctx.lineTo(x + w, y + i * h / 5);
      this.ctx.stroke();
    }
  }

  drawPockets(width, height, pockets, pocketRadius) {
    const x = this.offsetX;
    const y = this.offsetY;

    pockets.forEach(pocket => {
      const px = x + pocket.x * this.scale;
      const py = y + pocket.y * this.scale;

      this.ctx.beginPath();
      this.ctx.arc(px, py, pocketRadius + 4, 0, Math.PI * 2);
      this.ctx.fillStyle = '#2a1810';
      this.ctx.fill();

      this.ctx.beginPath();
      this.ctx.arc(px, py, pocketRadius, 0, Math.PI * 2);
      this.ctx.fillStyle = '#0a0505';
      this.ctx.fill();
    });
  }

  drawBalls(balls) {
    const x = this.offsetX;
    const y = this.offsetY;

    balls.forEach(ball => {
      if (ball.isPocketed) return;

      const bx = x + ball.x * this.scale;
      const by = y + ball.y * this.scale;
      const r = ball.radius * this.scale;

      const gradient = this.ctx.createRadialGradient(
        bx - r * 0.3, by - r * 0.3, r * 0.1,
        bx, by, r
      );
      gradient.addColorStop(0, this.lightenColor(ball.color, 50));
      gradient.addColorStop(0.7, ball.color);
      gradient.addColorStop(1, this.darkenColor(ball.color, 30));

      this.ctx.beginPath();
      this.ctx.arc(bx, by, r, 0, Math.PI * 2);
      this.ctx.fillStyle = gradient;
      this.ctx.fill();

      this.ctx.beginPath();
      this.ctx.arc(bx - r * 0.3, by - r * 0.3, r * 0.3, 0, Math.PI * 2);
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      this.ctx.fill();

      this.ctx.beginPath();
      this.ctx.arc(bx, by, r, 0, Math.PI * 2);
      this.ctx.strokeStyle = this.darkenColor(ball.color, 50);
      this.ctx.lineWidth = 1;
      this.ctx.stroke();
    });
  }

  drawAimLine(cueBallX, cueBallY, targetX, targetY, power) {
    if (!cueBallX || !cueBallY) return;

    const x = this.offsetX;
    const y = this.offsetY;

    const startX = x + cueBallX * this.scale;
    const startY = y + cueBallY * this.scale;
    const endX = x + targetX * this.scale;
    const endY = y + targetY * this.scale;

    this.ctx.save();
    this.ctx.setLineDash([10, 5]);
    this.ctx.beginPath();
    this.ctx.moveTo(startX, startY);
    this.ctx.lineTo(endX, endY);
    this.ctx.strokeStyle = `rgba(255, 255, 255, ${0.3 + power * 0.5})`;
    this.ctx.lineWidth = 2;
    this.ctx.stroke();
    this.ctx.restore();

    const powerBarWidth = 100;
    const powerBarHeight = 10;
    const powerBarX = this.canvas.width - powerBarWidth - 20;
    const powerBarY = 20;

    this.ctx.fillStyle = '#333';
    this.ctx.fillRect(powerBarX, powerBarY, powerBarWidth, powerBarHeight);

    this.ctx.fillStyle = power > 0.7 ? '#ff4444' : power > 0.4 ? '#ffaa00' : '#44ff44';
    this.ctx.fillRect(powerBarX, powerBarY, powerBarWidth * power, powerBarHeight);

    this.ctx.fillStyle = '#fff';
    this.ctx.font = '12px Arial';
    this.ctx.fillText('Power', powerBarX, powerBarY - 5);
  }

  drawStats(isMoving) {
    this.ctx.fillStyle = '#fff';
    this.ctx.font = '14px Arial';
    this.ctx.fillText(isMoving ? 'Status: Moving' : 'Status: Ready', 20, 30);
  }

  lightenColor(color, percent) {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.min(255, (num >> 16) + amt);
    const G = Math.min(255, ((num >> 8) & 0x00FF) + amt);
    const B = Math.min(255, (num & 0x0000FF) + amt);
    return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
  }

  darkenColor(color, percent) {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.max(0, (num >> 16) - amt);
    const G = Math.max(0, ((num >> 8) & 0x00FF) - amt);
    const B = Math.max(0, (num & 0x0000FF) - amt);
    return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
  }

  render(gameState) {
    this.clear();
    this.drawTable(gameState.tableWidth, gameState.tableHeight);
    this.drawPockets(gameState.tableWidth, gameState.tableHeight, gameState.pockets, gameState.pocketRadius);
    this.drawBalls(gameState.balls);
    
    if (gameState.aimLine) {
      this.drawAimLine(
        gameState.aimLine.cueBallX,
        gameState.aimLine.cueBallY,
        gameState.aimLine.targetX,
        gameState.aimLine.targetY,
        gameState.aimLine.power
      );
    }
    
    this.drawStats(gameState.isMoving);
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { Renderer };
}
