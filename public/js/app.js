class App {
  constructor() {
    this.engine = new LogicEngine();
    this.view = null;
    this.animationId = null;
  }

  async init() {
    this.view = new CircuitView('circuitCanvas', this.engine);
    this.view.resize(800, 500);

    await this.loadCircuit();
    this.setupEventListeners();
    this.startRenderLoop();

    this.engine.onTick(() => {
      document.getElementById('tickCount').textContent = this.engine.tickCount;
    });

    document.getElementById('tickRate').textContent = this.engine.tickRate;
    document.getElementById('status').textContent = 'Stopped';
  }

  async loadCircuit() {
    try {
      const response = await fetch('/api/circuit');
      const plainText = await response.text();
      console.log('Received circuit data (plain text):', plainText);
      
      const circuitData = JSON.parse(plainText);
      this.engine.loadCircuit(circuitData);
      
      console.log('Circuit loaded successfully');
    } catch (error) {
      console.error('Failed to load circuit:', error);
    }
  }

  setupEventListeners() {
    document.getElementById('startBtn').addEventListener('click', () => {
      this.engine.start();
      document.getElementById('status').textContent = 'Running';
      document.getElementById('status').style.color = '#22c55e';
    });

    document.getElementById('stopBtn').addEventListener('click', () => {
      this.engine.stop();
      document.getElementById('status').textContent = 'Stopped';
      document.getElementById('status').style.color = '#ef4444';
    });

    document.getElementById('stepBtn').addEventListener('click', () => {
      this.engine.tick();
    });

    document.getElementById('resetBtn').addEventListener('click', () => {
      this.engine.tickCount = 0;
      document.getElementById('tickCount').textContent = '0';
    });

    document.getElementById('fasterBtn').addEventListener('click', () => {
      const newRate = Math.max(10, this.engine.tickRate - 50);
      this.engine.setTickRate(newRate);
      document.getElementById('tickRate').textContent = newRate;
    });

    document.getElementById('slowerBtn').addEventListener('click', () => {
      const newRate = Math.min(2000, this.engine.tickRate + 50);
      this.engine.setTickRate(newRate);
      document.getElementById('tickRate').textContent = newRate;
    });

    this.view.onInputClick = (gateId) => {
      const gate = this.engine.gates.get(gateId);
      if (gate && gate.type === 'INPUT') {
        const newValue = gate.value ? 0 : 1;
        this.engine.setInput(gateId, newValue);
      }
    };

    this.view.canvas.addEventListener('click', (e) => {
      this.view.handleClick(e);
    });
  }

  startRenderLoop() {
    const render = () => {
      this.view.render();
      this.animationId = requestAnimationFrame(render);
    };
    render();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.init();
});
