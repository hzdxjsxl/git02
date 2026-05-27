class Vector2 {
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }

  add(v) {
    return new Vector2(this.x + v.x, this.y + v.y);
  }

  sub(v) {
    return new Vector2(this.x - v.x, this.y - v.y);
  }

  mul(s) {
    return new Vector2(this.x * s, this.y * s);
  }

  div(s) {
    return s !== 0 ? new Vector2(this.x / s, this.y / s) : new Vector2(0, 0);
  }

  dot(v) {
    return this.x * v.x + this.y * v.y;
  }

  length() {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  lengthSq() {
    return this.x * this.x + this.y * this.y;
  }

  normalize() {
    const len = this.length();
    return len > 0 ? this.div(len) : new Vector2(0, 0);
  }

  negate() {
    return new Vector2(-this.x, -this.y);
  }

  clone() {
    return new Vector2(this.x, this.y);
  }
}

class Ball {
  constructor(id, x, y, radius, color, isCueBall = false) {
    this.id = id;
    this.position = new Vector2(x, y);
    this.velocity = new Vector2(0, 0);
    this.radius = radius;
    this.color = color;
    this.isCueBall = isCueBall;
    this.mass = radius * radius * 0.1;
    this.isPocketed = false;
  }

  update(dt) {
    if (this.isPocketed) return;
    this.position = this.position.add(this.velocity.mul(dt));
  }

  applyFriction(friction, dt) {
    const speed = this.velocity.length();
    if (speed > 0) {
      const decay = Math.max(0, 1 - friction * dt / speed);
      this.velocity = this.velocity.mul(decay);
    }
  }

  getState() {
    return {
      id: this.id,
      x: this.position.x,
      y: this.position.y,
      radius: this.radius,
      color: this.color,
      isCueBall: this.isCueBall,
      isPocketed: this.isPocketed
    };
  }
}

class PhysicsEngine {
  constructor() {
    this.balls = [];
    this.table = { width: 800, height: 400 };
    this.friction = 150;
    this.restitution = 0.95;
    this.pockets = [];
    this.pocketRadius = 24;
    this.initPockets();
  }

  initPockets() {
    const w = this.table.width;
    const h = this.table.height;
    this.pockets = [
      new Vector2(0, 0),
      new Vector2(w / 2, 0),
      new Vector2(w, 0),
      new Vector2(0, h),
      new Vector2(w / 2, h),
      new Vector2(w, h)
    ];
  }

  addBall(ballData) {
    const ball = new Ball(
      ballData.id,
      ballData.x,
      ballData.y,
      ballData.radius,
      ballData.color,
      ballData.isCueBall
    );
    this.balls.push(ball);
    return ball;
  }

  setCueVelocity(vx, vy) {
    const cueBall = this.balls.find(b => b.isCueBall && !b.isPocketed);
    if (cueBall) {
      cueBall.velocity = new Vector2(vx, vy);
    }
  }

  step(dt) {
    const subSteps = 4;
    const subDt = dt / subSteps;

    for (let step = 0; step < subSteps; step++) {
      this.handlePockets();
      this.continuousCollisionDetection(subDt);
      this.updatePositions(subDt);
      this.handleWallCollisions();
      this.applyFriction(subDt);
    }
  }

  updatePositions(dt) {
    this.balls.forEach(ball => {
      if (!ball.isPocketed) {
        ball.update(dt);
      }
    });
  }

  applyFriction(dt) {
    this.balls.forEach(ball => {
      if (!ball.isPocketed) {
        ball.applyFriction(this.friction, dt);
      }
    });
  }

  handlePockets() {
    this.balls.forEach(ball => {
      if (ball.isPocketed) return;
      
      for (const pocket of this.pockets) {
        const dist = ball.position.sub(pocket).length();
        if (dist < this.pocketRadius) {
          ball.isPocketed = true;
          ball.velocity = new Vector2(0, 0);
          break;
        }
      }
    });
  }

  handleWallCollisions() {
    this.balls.forEach(ball => {
      if (ball.isPocketed) return;

      const r = ball.radius;
      
      if (ball.position.x - r < 0) {
        ball.position.x = r;
        ball.velocity.x = -ball.velocity.x * this.restitution;
      }
      if (ball.position.x + r > this.table.width) {
        ball.position.x = this.table.width - r;
        ball.velocity.x = -ball.velocity.x * this.restitution;
      }
      if (ball.position.y - r < 0) {
        ball.position.y = r;
        ball.velocity.y = -ball.velocity.y * this.restitution;
      }
      if (ball.position.y + r > this.table.height) {
        ball.position.y = this.table.height - r;
        ball.velocity.y = -ball.velocity.y * this.restitution;
      }
    });
  }

  continuousCollisionDetection(dt) {
    let collision = true;
    let iterations = 0;
    const maxIterations = 10;

    while (collision && iterations < maxIterations) {
      collision = false;
      iterations++;

      const earliestCollision = this.findEarliestCollision(dt);
      
      if (earliestCollision && earliestCollision.time < dt) {
        this.advanceToCollision(earliestCollision.time);
        this.resolveCollision(earliestCollision);
        dt -= earliestCollision.time;
        collision = true;
      }
    }
  }

  findEarliestCollision(dt) {
    let earliest = null;

    for (let i = 0; i < this.balls.length; i++) {
      for (let j = i + 1; j < this.balls.length; j++) {
        const a = this.balls[i];
        const b = this.balls[j];
        
        if (a.isPocketed || b.isPocketed) continue;

        const collision = this.checkBallCollision(a, b, dt);
        if (collision && (!earliest || collision.time < earliest.time)) {
          earliest = collision;
        }
      }
    }

    return earliest;
  }

  checkBallCollision(a, b, dt) {
    const relVel = a.velocity.sub(b.velocity);
    const relPos = a.position.sub(b.position);
    const minDist = a.radius + b.radius;
    const minDistSq = minDist * minDist;
    
    const currentDistSq = relPos.lengthSq();
    
    if (currentDistSq < minDistSq) {
      return {
        time: 0,
        a: a,
        b: b,
        normal: relPos.normalize()
      };
    }

    const aDotV = relPos.dot(relVel);
    if (aDotV >= 0) {
      return null;
    }

    const vDotV = relVel.dot(relVel);
    if (vDotV === 0) {
      return null;
    }

    const discriminant = aDotV * aDotV - vDotV * (currentDistSq - minDistSq);
    if (discriminant < 0) {
      return null;
    }

    const t = (-aDotV - Math.sqrt(discriminant)) / vDotV;

    if (t >= 0 && t <= dt) {
      const posA = a.position.add(a.velocity.mul(t));
      const posB = b.position.add(b.velocity.mul(t));
      const normal = posA.sub(posB).normalize();
      
      return {
        time: t,
        a: a,
        b: b,
        normal: normal
      };
    }

    return null;
  }

  advanceToCollision(time) {
    if (time <= 0) return;
    
    this.balls.forEach(ball => {
      if (!ball.isPocketed) {
        ball.position = ball.position.add(ball.velocity.mul(time));
      }
    });
  }

  resolveCollision(collision) {
    const a = collision.a;
    const b = collision.b;
    const normal = collision.normal;

    const relVel = a.velocity.sub(b.velocity);
    const velAlongNormal = relVel.dot(normal);

    if (velAlongNormal > 0) return;

    const e = this.restitution;
    const j = -(1 + e) * velAlongNormal;
    const invMassA = 1 / a.mass;
    const invMassB = 1 / b.mass;
    const impulse = j / (invMassA + invMassB);

    const impulseVec = normal.mul(impulse);
    
    a.velocity = a.velocity.add(impulseVec.mul(invMassA));
    b.velocity = b.velocity.sub(impulseVec.mul(invMassB));

    this.separateBalls(a, b, normal);
  }

  separateBalls(a, b, normal) {
    const overlap = (a.radius + b.radius) - a.position.sub(b.position).length();
    if (overlap > 0) {
      const separation = normal.mul(overlap * 0.51);
      a.position = a.position.add(separation);
      b.position = b.position.sub(separation);
    }
  }

  getBallsState() {
    return this.balls.map(ball => ball.getState());
  }

  isAnythingMoving() {
    const threshold = 0.5;
    return this.balls.some(ball => {
      if (ball.isPocketed) return false;
      return ball.velocity.length() > threshold;
    });
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { PhysicsEngine, Ball, Vector2 };
}
