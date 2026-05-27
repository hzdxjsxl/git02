"use strict";

function Renderer(canvas) {
  this.canvas = canvas;
  this.ctx = canvas.getContext('2d');
  this.width = canvas.width;
  this.height = canvas.height;
  this.cushion = 30;
  this.ballRadius = 16;
}

Renderer.prototype.drawTable = function() {
  const ctx = this.ctx;
  const w = this.width;
  const h = this.height;
  const c = this.cushion;

  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, '#0f2a0f');
  grad.addColorStop(1, '#1a4a1a');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = '#5a3a1a';
  ctx.fillRect(0, 0, w, c);
  ctx.fillRect(0, h - c, w, c);
  ctx.fillRect(0, 0, c, h);
  ctx.fillRect(w - c, 0, c, h);

  ctx.strokeStyle = '#7a5a3a';
  ctx.lineWidth = 2;
  ctx.strokeRect(c, c, w - 2 * c, h - 2 * c);

  const pocketRadius = 22;
  const pockets = [
    { x: c, y: c },
    { x: w / 2, y: c - 4 },
    { x: w - c, y: c },
    { x: c, y: h - c },
    { x: w / 2, y: h - c + 4 },
    { x: w - c, y: h - c }
  ];

  for (const p of pockets) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, pocketRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#000';
    ctx.fill();
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(w / 2, c);
  ctx.lineTo(w / 2, h - c);
  ctx.stroke();

  ctx.setLineDash([6, 6]);
  ctx.beginPath();
  ctx.arc(w * 0.25, h / 2, 3, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.beginPath();
  ctx.arc(w * 0.25, h / 2, 30, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.stroke();
};

Renderer.prototype.drawBall = function(ball) {
  if (ball.pocketed) return;
  const ctx = this.ctx;
  const x = ball.pos.x;
  const y = ball.pos.y;
  const r = ball.radius;

  ctx.save();

  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 2;

  const ballGrad = ctx.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r);
  if (ball.id === 0) {
    ballGrad.addColorStop(0, '#ffffff');
    ballGrad.addColorStop(0.6, '#e8e8e8');
    ballGrad.addColorStop(1, '#a0a0a0');
  } else if (ball.id === 8) {
    ballGrad.addColorStop(0, '#555');
    ballGrad.addColorStop(0.5, '#222');
    ballGrad.addColorStop(1, '#000');
  } else {
    ballGrad.addColorStop(0, this.lightenColor(ball.color, 40));
    ballGrad.addColorStop(0.5, ball.color);
    ballGrad.addColorStop(1, this.darkenColor(ball.color, 30));
  }

  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = ballGrad;
  ctx.fill();

  ctx.restore();

  if (ball.id > 0 && ball.id !== 8) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.clip();

    const stripeH = r * 0.55;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.rect(x - r, y - stripeH / 2, r * 2, stripeH);
    ctx.fill();

    if (ball.id > 8) {
      ctx.fillStyle = ball.color;
      ctx.beginPath();
      ctx.arc(x, y, r * 0.55, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  if (ball.id > 0 && ball.id !== 8) {
    ctx.save();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(x, y, r * 0.35, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#000';
    ctx.font = 'bold 11px Consolas, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(ball.id.toString(), x, y);
    ctx.restore();
  }

  if (ball.awake && Vec2.len(ball.vel) > 5) {
    const dir = Vec2.norm(ball.vel);
    const speed = Vec2.len(ball.vel);
    const trailLen = Math.min(speed * 0.015, 30);
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - dir.x * trailLen, y - dir.y * trailLen);
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.restore();
  }
};

Renderer.prototype.lightenColor = function(hex, amount) {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, (num >> 16) + amount);
  const g = Math.min(255, ((num >> 8) & 0x00FF) + amount);
  const b = Math.min(255, (num & 0x0000FF) + amount);
  return `rgb(${r},${g},${b})`;
};

Renderer.prototype.darkenColor = function(hex, amount) {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, (num >> 16) - amount);
  const g = Math.max(0, ((num >> 8) & 0x00FF) - amount);
  const b = Math.max(0, (num & 0x0000FF) - amount);
  return `rgb(${r},${g},${b})`;
};

Renderer.prototype.render = function(balls) {
  this.drawTable();
  for (const ball of balls) {
    this.drawBall(ball);
  }
};

const Game = {
  canvas: null,
  renderer: null,
  physics: PhysicsWorld,
  initialBallsData: null,
  running: false,
  lastTime: 0,
  fixedDt: 1 / 240,
  accumulator: 0,
  fps: 0,
  frameCount: 0,
  fpsTime: 0,
  totalCollisionSteps: 0,
  statsEl: null,

  init() {
    this.canvas = document.getElementById('gameCanvas');
    this.renderer = new Renderer(this.canvas);
    this.statsEl = document.getElementById('statsText');
    this.physics.init(900, 500, 30);

    document.getElementById('breakBtn').addEventListener('click', () => this.breakShot());
    document.getElementById('resetBtn').addEventListener('click', () => this.reset());

    this.loadInitialData();
  },

  async loadInitialData() {
    this.statsEl.textContent = '加载初始球位数据...';
    try {
      const resp = await fetch('/api/initial-balls');
      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      const data = await resp.json();
      this.initialBallsData = data;
      this.statsEl.textContent = '数据加载成功，点击"开球"开始';
      this.reset();
    } catch (err) {
      console.error('Failed to load initial balls:', err);
      this.statsEl.textContent = '加载失败: ' + err.message + ' (使用内置默认数据)';
      this.initialBallsData = this.fallbackData();
      this.reset();
    }
  },

  fallbackData() {
    return {
      tableWidth: 900,
      tableHeight: 500,
      cushion: 30,
      ballRadius: 16,
      balls: [
        { id: 0, x: 225, y: 250, color: '#FFFFFF', radius: 16 },
        { id: 1, x: 630, y: 250, color: '#FFD700', radius: 16 },
        { id: 9, x: 658, y: 234, color: '#FFD700', radius: 16 },
        { id: 2, x: 658, y: 266, color: '#1E90FF', radius: 16 },
        { id: 10, x: 686, y: 218, color: '#1E90FF', radius: 16 },
        { id: 3, x: 686, y: 250, color: '#FF0000', radius: 16 },
        { id: 8, x: 686, y: 282, color: '#000000', radius: 16 },
        { id: 11, x: 714, y: 202, color: '#FF0000', radius: 16 },
        { id: 4, x: 714, y: 234, color: '#4B0082', radius: 16 },
        { id: 12, x: 714, y: 266, color: '#4B0082', radius: 16 },
        { id: 5, x: 714, y: 298, color: '#FF4500', radius: 16 },
        { id: 13, x: 742, y: 186, color: '#FF4500', radius: 16 },
        { id: 6, x: 742, y: 218, color: '#006400', radius: 16 },
        { id: 14, x: 742, y: 250, color: '#006400', radius: 16 },
        { id: 7, x: 742, y: 282, color: '#8B0000', radius: 16 },
        { id: 15, x: 742, y: 314, color: '#8B0000', radius: 16 }
      ]
    };
  },

  reset() {
    this.physics.clear();
    if (!this.initialBallsData) return;
    const d = this.initialBallsData;
    this.physics.tableWidth = d.tableWidth;
    this.physics.tableHeight = d.tableHeight;
    this.physics.cushion = d.cushion;

    for (const b of d.balls) {
      this.physics.addBall(b.id, b.x, b.y, b.radius, b.color, 1);
    }
    this.renderer.render(this.physics.balls);
    this.statsEl.textContent = '已重置 | 点击"开球"开始物理模拟';
    document.getElementById('breakBtn').disabled = false;
  },

  breakShot() {
    const cueBall = this.physics.balls.find(b => b.id === 0);
    if (!cueBall) return;
    const power = parseInt(document.getElementById('power').value);
    const spread = (Math.random() - 0.5) * 0.08;
    const angle = spread;
    cueBall.vel.x = Math.cos(angle) * power;
    cueBall.vel.y = Math.sin(angle) * power;
    cueBall.awake = true;

    this.accumulator = 0;
    this.lastTime = performance.now();
    this.running = true;
    document.getElementById('breakBtn').disabled = true;
    this.statsEl.textContent = '模拟运行中...';
    requestAnimationFrame((t) => this.loop(t));
  },

  loop(timestamp) {
    if (!this.running) return;
    const now = timestamp;
    let frameDt = (now - this.lastTime) / 1000;
    this.lastTime = now;
    if (frameDt > 0.05) frameDt = 0.05;

    this.accumulator += frameDt;

    let steps = 0;
    while (this.accumulator >= this.fixedDt && steps < 8) {
      this.physics.step(this.fixedDt);
      this.accumulator -= this.fixedDt;
      steps++;
    }
    if (steps >= 8) this.accumulator = 0;

    this.renderer.render(this.physics.balls);

    this.frameCount++;
    this.fpsTime += frameDt;
    if (this.fpsTime >= 0.5) {
      this.fps = Math.round(this.frameCount / this.fpsTime);
      this.frameCount = 0;
      this.fpsTime = 0;
      const movingCount = this.physics.balls.filter(b => b.awake && !b.pocketed).length;
      this.statsEl.textContent = `FPS: ${this.fps} | 子步长: ${steps} | 运动中: ${movingCount} 球`;

      if (movingCount === 0) {
        this.running = false;
        document.getElementById('breakBtn').disabled = false;
        this.statsEl.textContent += ' | 所有球静止，可再次开球';
        return;
      }
    }

    requestAnimationFrame((t) => this.loop(t));
  }
};

window.addEventListener('DOMContentLoaded', () => Game.init());
