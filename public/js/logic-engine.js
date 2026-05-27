class LogicEngine {
  constructor() {
    this.gates = new Map();
    this.connections = [];
    this.tickCount = 0;
    this.isRunning = false;
    this.tickInterval = null;
    this.tickRate = 100;
    this.onTickCallback = null;
  }

  loadCircuit(circuitData) {
    this.gates.clear();
    this.connections = [];

    circuitData.gates.forEach(gate => {
      this.gates.set(gate.id, {
        ...gate,
        inputs: {},
        output: 0
      });
    });

    circuitData.connections.forEach(conn => {
      this.connections.push({ ...conn });
    });

    this.buildDAG();
  }

  buildDAG() {
    this.gates.forEach(gate => {
      gate.inputs = {};
      gate.output = 0;
    });

    this.connections.forEach(conn => {
      const toGate = this.gates.get(conn.to);
      if (toGate) {
        toGate.inputs[conn.toPort] = {
          fromGate: conn.from,
          fromPort: conn.fromPort
        };
      }
    });
  }

  topologicalSort() {
    const visited = new Set();
    const result = [];
    const temp = new Set();

    const visit = (gateId) => {
      if (temp.has(gateId)) {
        return;
      }
      if (visited.has(gateId)) {
        return;
      }

      temp.add(gateId);
      const gate = this.gates.get(gateId);

      this.connections
        .filter(c => c.to === gateId)
        .forEach(c => visit(c.from));

      temp.delete(gateId);
      visited.add(gateId);
      result.unshift(gateId);
    };

    this.gates.forEach((_, id) => visit(id));
    return result;
  }

  evaluateGate(gate) {
    const getInputValue = (portName) => {
      const input = gate.inputs[portName];
      if (!input) return 0;
      const fromGate = this.gates.get(input.fromGate);
      return fromGate ? fromGate.output : 0;
    };

    switch (gate.type) {
      case 'INPUT':
        return gate.value !== undefined ? gate.value : 0;
      case 'OUTPUT':
        return getInputValue('in1');
      case 'AND':
        return getInputValue('in1') & getInputValue('in2');
      case 'OR':
        return getInputValue('in1') | getInputValue('in2');
      case 'NOT':
        return getInputValue('in1') ? 0 : 1;
      case 'NAND':
        return (getInputValue('in1') & getInputValue('in2')) ? 0 : 1;
      case 'NOR':
        return (getInputValue('in1') | getInputValue('in2')) ? 0 : 1;
      case 'XOR':
        return getInputValue('in1') ^ getInputValue('in2');
      default:
        return 0;
    }
  }

  tick() {
    const sortedGates = this.topologicalSort();

    sortedGates.forEach(gateId => {
      const gate = this.gates.get(gateId);
      if (gate) {
        gate.output = this.evaluateGate(gate);
      }
    });

    this.tickCount++;

    if (this.onTickCallback) {
      this.onTickCallback(this.tickCount);
    }
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.tickInterval = setInterval(() => this.tick(), this.tickRate);
  }

  stop() {
    this.isRunning = false;
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
  }

  setTickRate(ms) {
    this.tickRate = ms;
    if (this.isRunning) {
      this.stop();
      this.start();
    }
  }

  setInput(gateId, value) {
    const gate = this.gates.get(gateId);
    if (gate && gate.type === 'INPUT') {
      gate.value = value ? 1 : 0;
    }
  }

  getGateOutput(gateId) {
    const gate = this.gates.get(gateId);
    return gate ? gate.output : 0;
  }

  onTick(callback) {
    this.onTickCallback = callback;
  }

  getGates() {
    return Array.from(this.gates.values());
  }

  getConnections() {
    return this.connections;
  }
}
