"use strict";

const Vec2 = {
  create(x, y) { return { x: x || 0, y: y || 0 }; },
  add(a, b) { return { x: a.x + b.x, y: a.y + b.y }; },
  sub(a, b) { return { x: a.x - b.x, y: a.y - b.y }; },
  scale(a, s) { return { x: a.x * s, y: a.y * s }; },
  dot(a, b) { return a.x * b.x + a.y * b.y; },
  len(a) { return Math.sqrt(a.x * a.x + a.y * a.y); },
  len2(a) { return a.x * a.x + a.y * a.y; },
  norm(a) { const l = Vec2.len(a); return l > 1e-12 ? { x: a.x / l, y: a.y / l } : { x: 0, y: 0 }; },
  clone(a) { return { x: a.x, y: a.y }; },
  reflect(v, n) { const d = Vec2.dot(v, n); return { x: v.x - 2 * d * n.x, y: v.y - 2 * d * n.y }; },
};

function Ball(id, x, y, radius, color, mass) {
  this.id = id;
  this.pos = Vec2.create(x, y);
  this.vel = Vec2.create(0, 0);
  this.radius = radius || 16;
  this.color = color || '#fff';
  this.mass = mass || 1;
  this.invMass = 1 / this.mass;
  this.awake = false;
  this.pocketed = false;
}

Ball.prototype.applyImpulse = function(j, normal) {
  this.vel.x += j * normal.x * this.invMass;
  this.vel.y += j * normal.y * this.invMass;
  this.awake = true;
};

const PhysicsWorld = {
  balls: [],
  tableWidth: 900,
  tableHeight: 500,
  cushion: 30,
  restitution: 0.96,
  friction: 0.018,
  gravityOnFriction: 980,
  minVelocity: 2.0,
  maxVelocity: 3000,
  maxSubSteps: 10,

  init(tableWidth, tableHeight, cushion) {
    this.tableWidth = tableWidth;
    this.tableHeight = tableHeight;
    this.cushion = cushion;
    this.balls = [];
  },

  addBall(id, x, y, radius, color, mass) {
    const b = new Ball(id, x, y, radius, color, mass);
    this.balls.push(b);
    return b;
  },

  clear() {
    this.balls = [];
  },

  ballCircleCollisionTOI(a, b) {
    const dp = Vec2.sub(b.pos, a.pos);
    const dv = Vec2.sub(b.vel, a.vel);
    const rSum = a.radius + b.radius;
    const rSum2 = rSum * rSum;
    const dvLen2 = Vec2.len2(dv);

    if (dvLen2 < 1e-12) return Infinity;

    const dpDotDv = Vec2.dot(dp, dv);
    const dpLen2 = Vec2.len2(dp);

    if (dpLen2 <= rSum2 + 1e-6) return 0;

    if (dpDotDv >= 0) return Infinity;

    const aCoeff = dvLen2;
    const bCoeff = 2 * dpDotDv;
    const cCoeff = dpLen2 - rSum2;

    const disc = bCoeff * bCoeff - 4 * aCoeff * cCoeff;
    if (disc < 0) return Infinity;

    const sqrtDisc = Math.sqrt(disc);
    const t1 = (-bCoeff - sqrtDisc) / (2 * aCoeff);
    const t2 = (-bCoeff + sqrtDisc) / (2 * aCoeff);

    if (t1 >= 0 && t1 <= 1) return t1;
    if (t2 >= 0 && t2 <= 1) return t2;
    return Infinity;
  },

  cushionCollisionTOI(ball, dt) {
    const c = this.cushion;
    const w = this.tableWidth;
    const h = this.tableHeight;
    const r = ball.radius;
    let earliest = Infinity;
    let normal = null;

    const checkWall = (axis, value, dir) => {
      const pos = ball.pos[axis];
      const vel = ball.vel[axis];
      if (Math.abs(vel) < 1e-12) return;
      let t;
      if (dir > 0) {
        t = (value - r - pos) / vel;
      } else {
        t = (value + r - pos) / vel;
      }
      if (t >= 0 && t < earliest) {
        earliest = t;
        normal = axis === 'x'
          ? Vec2.create(dir, 0)
          : Vec2.create(0, dir);
      }
    };

    checkWall('x', c, -1);
    checkWall('x', w - c, 1);
    checkWall('y', c, -1);
    checkWall('y', h - c, 1);

    return { t: earliest, normal: normal };
  },

  resolveBallCollision(a, b) {
    const normal = Vec2.sub(b.pos, a.pos);
    const nLen = Vec2.len(normal);
    if (nLen < 1e-10) return;
    const n = Vec2.scale(normal, 1 / nLen);

    const rv = Vec2.sub(b.vel, a.vel);
    const velAlongNormal = Vec2.dot(rv, n);
    if (velAlongNormal > 0) return;

    const e = this.restitution;
    const jNumerator = -(1 + e) * velAlongNormal;
    const jDenominator = a.invMass + b.invMass;
    if (Math.abs(jDenominator) < 1e-12) return;
    const j = jNumerator / jDenominator;

    const impulse = Vec2.scale(n, j);
    a.vel.x -= impulse.x * a.invMass;
    a.vel.y -= impulse.y * a.invMass;
    b.vel.x += impulse.x * b.invMass;
    b.vel.y += impulse.y * b.invMass;

    const overlap = a.radius + b.radius - nLen;
    if (overlap > 0) {
      const totalInvMass = a.invMass + b.invMass;
      const corrA = (a.invMass / totalInvMass) * overlap;
      const corrB = (b.invMass / totalInvMass) * overlap;
      a.pos.x -= n.x * corrA;
      a.pos.y -= n.y * corrA;
      b.pos.x += n.x * corrB;
      b.pos.y += n.y * corrB;
    }

    a.awake = true;
    b.awake = true;
  },

  resolveCushionCollision(ball, normal) {
    const velAlongNormal = Vec2.dot(ball.vel, normal);
    if (velAlongNormal >= 0) return;
    const e = this.restitution * 0.92;
    const j = -(1 + e) * velAlongNormal / ball.invMass;
    ball.vel.x += j * normal.x * ball.invMass;
    ball.vel.y += j * normal.y * ball.invMass;

    if (normal.x < 0) ball.pos.x = this.cushion + ball.radius + 0.1;
    if (normal.x > 0) ball.pos.x = this.tableWidth - this.cushion - ball.radius - 0.1;
    if (normal.y < 0) ball.pos.y = this.cushion + ball.radius + 0.1;
    if (normal.y > 0) ball.pos.y = this.tableHeight - this.cushion - ball.radius - 0.1;

    ball.awake = true;
  },

  applyFriction(ball, dt) {
    const speed = Vec2.len(ball.vel);
    if (speed < 1e-10) {
      ball.vel.x = 0;
      ball.vel.y = 0;
      return;
    }
    const frictionMag = this.friction * this.gravityOnFriction * dt;
    if (speed <= frictionMag) {
      ball.vel.x = 0;
      ball.vel.y = 0;
      ball.awake = false;
    } else {
      const decay = 1 - frictionMag / speed;
      ball.vel.x *= decay;
      ball.vel.y *= decay;
    }
  },

  clampVelocity(ball) {
    const speed = Vec2.len(ball.vel);
    if (speed > this.maxVelocity) {
      const scale = this.maxVelocity / speed;
      ball.vel.x *= scale;
      ball.vel.y *= scale;
    }
  },

  step(dt) {
    const activeBalls = this.balls.filter(b => !b.pocketed);
    if (activeBalls.length === 0) return;

    for (const b of activeBalls) {
      this.clampVelocity(b);
    }

    for (const b of activeBalls) {
      b._prevPos = Vec2.clone(b.pos);
    }

    let remaining = dt;
    const maxSubSteps = this.maxSubSteps;

    for (let subStep = 0; subStep < maxSubSteps && remaining > 1e-6; subStep++) {
      let earliestTOI = remaining;
      let collisionType = null;
      let collisionData = null;

      for (let i = 0; i < activeBalls.length; i++) {
        for (let j = i + 1; j < activeBalls.length; j++) {
          const a = activeBalls[i];
          const b = activeBalls[j];
          const toi = this.ballCircleCollisionTOI(a, b);
          if (toi < earliestTOI) {
            earliestTOI = toi;
            collisionType = 'ball';
            collisionData = { a: a, b: b };
          }
        }
      }

      for (const ball of activeBalls) {
        const result = this.cushionCollisionTOI(ball, remaining);
        if (result.t < earliestTOI) {
          earliestTOI = result.t;
          collisionType = 'cushion';
          collisionData = { ball: ball, normal: result.normal };
        }
      }

      const stepTime = Math.max(earliestTOI, 1e-8);

      for (const b of activeBalls) {
        b.pos.x += b.vel.x * stepTime;
        b.pos.y += b.vel.y * stepTime;
      }

      if (collisionType === 'ball') {
        this.resolveBallCollision(collisionData.a, collisionData.b);
      } else if (collisionType === 'cushion') {
        this.resolveCushionCollision(collisionData.ball, collisionData.normal);
      }

      remaining -= stepTime;

      if (collisionType === null) break;
    }

    if (remaining > 1e-6) {
      for (const b of activeBalls) {
        b.pos.x += b.vel.x * remaining;
        b.pos.y += b.vel.y * remaining;
      }
    }

    for (const b of activeBalls) {
      this.applyFriction(b, dt);
    }

    for (const b of activeBalls) {
      if (Math.abs(b.vel.x) < this.minVelocity && Math.abs(b.vel.y) < this.minVelocity) {
        b.vel.x = 0;
        b.vel.y = 0;
        b.awake = false;
      }
    }
  }
};
