class GameController {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.physics = new PhysicsEngine();
    this.renderer = new Renderer(this.canvas);
    
    this.isAiming = false;
    this.aimStart = { x: 0, y: 0 };
    this.aimEnd = { x: 0, y: 0 };
    this.maxPower = 600;
    
    this.lastTime = 0;
    this.running = false;
    
    this.init();
  }

  async init() {
    await this.loadBallPositions();
    this.setupEventListeners();
    this.startGameLoop();
  }

  async loadBallPositions() {
    try {
      const response = await fetch('/api/break-positions');
      const ballData = await response.json();
      
      this.physics.balls = [];
      ballData.forEach(ball => {
        this.physics.addBall(ball);
      });
    } catch (error) {
      console.error('Failed to load ball positions:', error);
    }
  }

  setupEventListeners() {
    this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
    this.canvas.addEventListener('mouseup', (e) => this.onMouseUp(e));
    this.canvas.addEventListener('mouseleave', (e) => this.onMouseUp(e));
    
    document.getElementById('resetBtn').addEventListener('click', () => this.resetGame());
    document.getElementById('autoBreakBtn').addEventListener('click', () => this.autoBreak());
  }

  getMousePos(e) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left - this.renderer.offsetX,
      y: e.clientY - rect.top - this.renderer.offsetY
    };
  }

  onMouseDown(e) {
    if (this.physics.isAnythingMoving()) return;
    
    const pos = this.getMousePos(e);
    const cueBall = this.physics.balls.find(b => b.isCueBall && !b.isPocketed);
    
    if (!cueBall) return;
    
    const dist = Math.sqrt(
      Math.pow(pos.x - cueBall.position.x, 2) +
      Math.pow(pos.y - cueBall.position.y, 2)
    );
    
    if (dist < cueBall.radius * 2) {
      this.isAiming = true;
      this.aimStart = { x: cueBall.position.x, y: cueBall.position.y };
      this.aimEnd = { x: pos.x, y: pos.y };
    }
  }

  onMouseMove(e) {
    if (!this.isAiming) return;
    
    const pos = this.getMousePos(e);
    this.aimEnd = { x: pos.x, y: pos.y };
  }

  onMouseUp(e) {
    if (!this.isAiming) return;
    
    this.isAiming = false;
    
    const dx = this.aimStart.x - this.aimEnd.x;
    const dy = this.aimStart.y - this.aimEnd.y;
    const power = Math.min(Math.sqrt(dx * dx + dy * dy), this.maxPower);
    
    if (power > 10) {
      const angle = Math.atan2(dy, dx);
      const vx = Math.cos(angle) * power * 2;
      const vy = Math.sin(angle) * power * 2;
      
      this.physics.setCueVelocity(vx, vy);
    }
  }

  async resetGame() {
    await this.loadBallPositions();
  }

  autoBreak() {
    if (this.physics.isAnythingMoving()) return;
    
    const power = 450 + Math.random() * 150;
    const angle = (Math.random() - 0.5) * 0.2;
    
    const vx = Math.cos(angle) * power;
    const vy = Math.sin(angle) * power;
    
    this.physics.setCueVelocity(vx, vy);
  }

  startGameLoop() {
    this.running = true;
    this.lastTime = performance.now();
    this.gameLoop();
  }

  gameLoop() {
    if (!this.running) return;
    
    const currentTime = performance.now();
    const dt = Math.min((currentTime - this.lastTime) / 1000, 0.033);
    this.lastTime = currentTime;
    
    this.physics.step(dt);
    
    const gameState = this.getGameState();
    this.renderer.render(gameState);
    
    requestAnimationFrame(() => this.gameLoop());
  }

  getGameState() {
    const state = {
      tableWidth: this.physics.table.width,
      tableHeight: this.physics.table.height,
      pockets: this.physics.pockets,
      pocketRadius: this.physics.pocketRadius,
      balls: this.physics.getBallsState(),
      isMoving: this.physics.isAnythingMoving()
    };
    
    if (this.isAiming) {
      const cueBall = this.physics.balls.find(b => b.isCueBall && !b.isPocketed);
      if (cueBall) {
        const dx = this.aimStart.x - this.aimEnd.x;
        const dy = this.aimStart.y - this.aimEnd.y;
        const power = Math.min(Math.sqrt(dx * dx + dy * dy), this.maxPower) / this.maxPower;
        
        state.aimLine = {
          cueBallX: cueBall.position.x,
          cueBallY: cueBall.position.y,
          targetX: this.aimEnd.x,
          targetY: this.aimEnd.y,
          power: power
        };
      }
    }
    
    return state;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new GameController();
});
