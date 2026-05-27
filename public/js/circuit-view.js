class CircuitView {
  constructor(canvasId, engine) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.engine = engine;
    this.gateWidth = 80;
    this.gateHeight = 50;
    this.portRadius = 6;
    this.onInputClick = null;
  }

  resize(width, height) {
    this.canvas.width = width;
    this.canvas.height = height;
  }

  getPortPosition(gate, portName, isOutput) {
    const x = gate.x;
    const y = gate.y;
    
    if (isOutput) {
      return { x: x + this.gateWidth, y: y + this.gateHeight / 2 };
    }
    
    if (portName === 'in1') {
      return { x: x, y: y + this.gateHeight / 3 };
    } else if (portName === 'in2') {
      return { x: x, y: y + (this.gateHeight * 2) / 3 };
    }
    
    return { x: x, y: y + this.gateHeight / 2 };
  }

  drawGate(gate) {
    const ctx = this.ctx;
    const x = gate.x;
    const y = gate.y;
    const w = this.gateWidth;
    const h = this.gateHeight;
    const output = this.engine.getGateOutput(gate.id);

    ctx.save();
    
    ctx.fillStyle = output ? '#22c55e' : '#64748b';
    ctx.strokeStyle = output ? '#16a34a' : '#1e293b';
    ctx.lineWidth = output ? 4 : 2;

    if (output) {
      ctx.shadowColor = '#22c55e';
      ctx.shadowBlur = 15;
    }

    switch (gate.type) {
      case 'INPUT':
        this.drawInputGate(x, y, w, h, gate);
        break;
      case 'OUTPUT':
        this.drawOutputGate(x, y, w, h, output);
        break;
      case 'AND':
        this.drawAndGate(x, y, w, h);
        break;
      case 'OR':
        this.drawOrGate(x, y, w, h);
        break;
      case 'NOT':
        this.drawNotGate(x, y, w, h);
        break;
      case 'NAND':
        this.drawNandGate(x, y, w, h);
        break;
      case 'NOR':
        this.drawNorGate(x, y, w, h);
        break;
      case 'XOR':
        this.drawXorGate(x, y, w, h);
        break;
      default:
        ctx.fillRect(x, y, w, h);
        ctx.strokeRect(x, y, w, h);
    }

    if (gate.type !== 'INPUT' && gate.type !== 'OUTPUT') {
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 10px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(gate.type, x + w / 2, y + h / 2 - 6);

      ctx.font = 'bold 14px Arial';
      ctx.fillStyle = output ? '#fef08a' : '#e2e8f0';
      ctx.fillText(output ? '1' : '0', x + w / 2, y + h / 2 + 10);
    }

    this.drawPorts(gate);

    ctx.restore();
  }

  drawInputGate(x, y, w, h, gate) {
    const ctx = this.ctx;
    const value = gate.value || 0;
    
    ctx.fillStyle = value ? '#22c55e' : '#64748b';
    ctx.strokeStyle = value ? '#16a34a' : '#1e293b';
    ctx.lineWidth = value ? 4 : 2;
    if (value) {
      ctx.shadowColor = '#22c55e';
      ctx.shadowBlur = 15;
    }
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 8);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(value ? '1' : '0', x + w / 2, y + h / 2);
  }

  drawOutputGate(x, y, w, h, output) {
    const ctx = this.ctx;
    
    ctx.fillStyle = output ? '#22c55e' : '#64748b';
    ctx.strokeStyle = output ? '#16a34a' : '#1e293b';
    ctx.lineWidth = output ? 4 : 2;
    if (output) {
      ctx.shadowColor = '#22c55e';
      ctx.shadowBlur = 15;
    }
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 8);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(output ? '1' : '0', x + w / 2, y + h / 2);
  }

  drawAndGate(x, y, w, h) {
    const ctx = this.ctx;
    
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + w * 0.5, y);
    ctx.quadraticCurveTo(x + w, y + h / 2, x + w * 0.5, y + h);
    ctx.lineTo(x, y + h);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  drawOrGate(x, y, w, h) {
    const ctx = this.ctx;
    
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + w * 0.3, y + h / 2, x, y + h);
    ctx.quadraticCurveTo(x + w * 0.5, y + h, x + w, y + h / 2);
    ctx.quadraticCurveTo(x + w * 0.5, y, x, y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  drawNotGate(x, y, w, h) {
    const ctx = this.ctx;
    
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + w * 0.7, y + h / 2);
    ctx.lineTo(x, y + h);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(x + w * 0.7 + 8, y + h / 2, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  drawNandGate(x, y, w, h) {
    const ctx = this.ctx;
    
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + w * 0.4, y);
    ctx.quadraticCurveTo(x + w * 0.8, y + h / 2, x + w * 0.4, y + h);
    ctx.lineTo(x, y + h);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(x + w * 0.8 + 8, y + h / 2, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  drawNorGate(x, y, w, h) {
    const ctx = this.ctx;
    
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + w * 0.3, y + h / 2, x, y + h);
    ctx.quadraticCurveTo(x + w * 0.4, y + h, x + w * 0.7, y + h / 2);
    ctx.quadraticCurveTo(x + w * 0.4, y, x, y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(x + w * 0.7 + 8, y + h / 2, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  drawXorGate(x, y, w, h) {
    const ctx = this.ctx;
    
    ctx.beginPath();
    ctx.moveTo(x + 10, y);
    ctx.quadraticCurveTo(x + w * 0.3, y + h / 2, x + 10, y + h);
    ctx.quadraticCurveTo(x + w * 0.5, y + h, x + w, y + h / 2);
    ctx.quadraticCurveTo(x + w * 0.5, y, x + 10, y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + w * 0.2, y + h / 2, x, y + h);
    ctx.stroke();
  }

  drawPorts(gate) {
    const ctx = this.ctx;
    const inputPorts = gate.type === 'NOT' || gate.type === 'OUTPUT' 
      ? ['in1'] 
      : gate.type === 'INPUT' 
        ? [] 
        : ['in1', 'in2'];
    const outputPorts = gate.type === 'OUTPUT' ? [] : ['out'];

    inputPorts.forEach(portName => {
      const pos = this.getPortPosition(gate, portName, false);
      ctx.fillStyle = '#94a3b8';
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, this.portRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    outputPorts.forEach(portName => {
      const pos = this.getPortPosition(gate, portName, true);
      const output = this.engine.getGateOutput(gate.id);
      ctx.fillStyle = output ? '#22c55e' : '#94a3b8';
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, this.portRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      ctx.stroke();
    });
  }

  drawConnection(conn) {
    const ctx = this.ctx;
    const fromGate = this.engine.gates.get(conn.from);
    const toGate = this.engine.gates.get(conn.to);

    if (!fromGate || !toGate) return;

    const fromPos = this.getPortPosition(fromGate, conn.fromPort, true);
    const toPos = this.getPortPosition(toGate, conn.toPort, false);
    const signalValue = this.engine.getGateOutput(conn.from);

    const midX = (fromPos.x + toPos.x) / 2;

    ctx.beginPath();
    ctx.moveTo(fromPos.x, fromPos.y);
    ctx.bezierCurveTo(midX, fromPos.y, midX, toPos.y, toPos.x, toPos.y);
    
    ctx.strokeStyle = signalValue ? '#22c55e' : '#64748b';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(fromPos.x, fromPos.y, this.portRadius - 2, 0, Math.PI * 2);
    ctx.fillStyle = signalValue ? '#22c55e' : '#64748b';
    ctx.fill();
  }

  render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    const gridSize = 20;
    for (let x = 0; x < this.canvas.width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < this.canvas.height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.canvas.width, y);
      ctx.stroke();
    }

    const connections = this.engine.getConnections();
    connections.forEach(conn => this.drawConnection(conn));

    const gates = this.engine.getGates();
    gates.forEach(gate => this.drawGate(gate));
  }

  handleClick(e) {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const gates = this.engine.getGates();
    for (const gate of gates) {
      if (gate.type === 'INPUT') {
        if (x >= gate.x && x <= gate.x + this.gateWidth &&
            y >= gate.y && y <= gate.y + this.gateHeight) {
          if (this.onInputClick) {
            this.onInputClick(gate.id);
          }
          return;
        }
      }
    }
  }
}
