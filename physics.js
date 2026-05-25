// ============================================================
// 物理求解器模块 - 独立的N体引力计算与微分方程求解
// 纯手写力学迭代，不依赖任何物理引擎插件
// ============================================================

const G = 6.674e-11;

const SUN_MU = 1.32712440018e20;
const EARTH_MU = 3.986004418e14;
const MOON_MU = 4.90280056e12;

const EARTH_MASS = 5.972e24;
const MOON_MASS = 7.342e22;

const EARTH_RADIUS = 6371000;
const MOON_RADIUS = 1737400;

const EARTH_MOON_DISTANCE = 384400000;
const MOON_ORBITAL_PERIOD = 2.36e6;
const MOON_ORBITAL_SPEED = 1022;

const EARTH_SOI = 924000000;
const MOON_SOI = 66100000;

function createVec3(x = 0, y = 0, z = 0) {
    return [x, y, z];
}

function vec3Add(a, b) {
    return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

function vec3Sub(a, b) {
    return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function vec3Scale(v, s) {
    return [v[0] * s, v[1] * s, v[2] * s];
}

function vec3Dot(a, b) {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function vec3Cross(a, b) {
    return [
        a[1] * b[2] - a[2] * b[1],
        a[2] * b[0] - a[0] * b[2],
        a[0] * b[1] - a[1] * b[0]
    ];
}

function vec3Length(v) {
    return Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
}

function vec3Normalize(v) {
    const len = vec3Length(v);
    if (len < 1e-15) return [0, 0, 0];
    return [v[0] / len, v[1] / len, v[2] / len];
}

function vec3Distance(a, b) {
    return vec3Length(vec3Sub(a, b));
}

function computeGravitationalAcceleration(position, bodyPosition, bodyMu) {
    const r = vec3Sub(bodyPosition, position);
    const dist = vec3Length(r);

    if (dist < 1e-10) {
        return [0, 0, 0];
    }

    const distCubed = dist * dist * dist;
    const factor = bodyMu / distCubed;

    return vec3Scale(r, factor);
}

function computeTotalAcceleration(probeState, bodies) {
    let totalAccel = [0, 0, 0];

    for (const body of bodies) {
        const accel = computeGravitationalAcceleration(
            probeState.position,
            body.position,
            body.mu
        );
        totalAccel = vec3Add(totalAccel, accel);
    }

    return totalAccel;
}

function computeDerivatives(state, bodies, thrustAccel) {
    const accel = computeTotalAcceleration(state, bodies);

    const totalAccel = vec3Add(accel, thrustAccel || [0, 0, 0]);

    return {
        dPosition: state.velocity,
        dVelocity: totalAccel
    };
}

function rk4Step(state, bodies, dt, thrustAccel) {
    const k1 = computeDerivatives(state, bodies, thrustAccel);

    const state2 = {
        position: vec3Add(state.position, vec3Scale(k1.dPosition, dt / 2)),
        velocity: vec3Add(state.velocity, vec3Scale(k1.dVelocity, dt / 2))
    };
    const k2 = computeDerivatives(state2, bodies, thrustAccel);

    const state3 = {
        position: vec3Add(state.position, vec3Scale(k2.dPosition, dt / 2)),
        velocity: vec3Add(state.velocity, vec3Scale(k2.dVelocity, dt / 2))
    };
    const k3 = computeDerivatives(state3, bodies, thrustAccel);

    const state4 = {
        position: vec3Add(state.position, vec3Scale(k3.dPosition, dt)),
        velocity: vec3Add(state.velocity, vec3Scale(k3.dVelocity, dt))
    };
    const k4 = computeDerivatives(state4, bodies, thrustAccel);

    const newPosition = vec3Add(
        state.position,
        vec3Scale(
            vec3Add(
                vec3Add(k1.dPosition, vec3Scale(k2.dPosition, 2)),
                vec3Add(vec3Scale(k3.dPosition, 2), k4.dPosition)
            ),
            dt / 6
        )
    );

    const newVelocity = vec3Add(
        state.velocity,
        vec3Scale(
            vec3Add(
                vec3Add(k1.dVelocity, vec3Scale(k2.dVelocity, 2)),
                vec3Add(vec3Scale(k3.dVelocity, 2), k4.dVelocity)
            ),
            dt / 6
        )
    );

    return {
        position: newPosition,
        velocity: newVelocity
    };
}

function computeOrbitalVelocity(mu, radius, altitude) {
    const r = radius + altitude;
    return Math.sqrt(mu / r);
}

function computeEscapeVelocity(mu, radius, altitude) {
    const r = radius + altitude;
    return Math.sqrt(2 * mu / r);
}

function computeOrbitalElements(position, velocity, centralBodyMu) {
    const r = vec3Length(position);
    const v = vec3Length(velocity);

    const specificAngularMomentum = vec3Cross(position, velocity);
    const h = vec3Length(specificAngularMomentum);

    const eccentricityVec = vec3Sub(
        vec3Scale(
            vec3Cross(velocity, specificAngularMomentum),
            1 / centralBodyMu
        ),
        vec3Scale(vec3Normalize(position), 1)
    );
    const eccentricity = vec3Length(eccentricityVec);

    const specificEnergy = v * v / 2 - centralBodyMu / r;

    let semiMajorAxis;
    if (Math.abs(eccentricity - 1) > 1e-10) {
        semiMajorAxis = -centralBodyMu / (2 * specificEnergy);
    } else {
        semiMajorAxis = Infinity;
    }

    let inclination = 0;
    if (h > 1e-10) {
        inclination = Math.acos(Math.max(-1, Math.min(1, specificAngularMomentum[2] / h)));
    }

    return {
        semiMajorAxis,
        eccentricity,
        inclination,
        specificAngularMomentum,
        specificEnergy,
        period: eccentricity < 1 ? 2 * Math.PI * Math.sqrt(semiMajorAxis * semiMajorAxis * semiMajorAxis / centralBodyMu) : Infinity
    };
}

function getMoonPosition(t) {
    const angle = (2 * Math.PI * t) / MOON_ORBITAL_PERIOD;
    return [
        EARTH_MOON_DISTANCE * Math.cos(angle),
        0,
        EARTH_MOON_DISTANCE * Math.sin(angle)
    ];
}

function getMoonVelocity(t) {
    const angle = (2 * Math.PI * t) / MOON_ORBITAL_PERIOD;
    return [
        -MOON_ORBITAL_SPEED * Math.sin(angle),
        0,
        MOON_ORBITAL_SPEED * Math.cos(angle)
    ];
}

function createProbeState(altitude = 300000) {
    const r = EARTH_RADIUS + altitude;
    const orbitalSpeed = computeOrbitalVelocity(EARTH_MU, EARTH_RADIUS, altitude);

    return {
        position: [r, 0, 0],
        velocity: [0, 0, orbitalSpeed]
    };
}

function getPrimaryBody(probeState, earthPos, moonPos) {
    const distEarth = vec3Distance(probeState.position, earthPos);
    const distMoon = vec3Distance(probeState.position, moonPos);

    if (distMoon < MOON_SOI) {
        return 'moon';
    }
    return 'earth';
}

export {
    G,
    SUN_MU,
    EARTH_MU,
    MOON_MU,
    EARTH_MASS,
    MOON_MASS,
    EARTH_RADIUS,
    MOON_RADIUS,
    EARTH_MOON_DISTANCE,
    MOON_ORBITAL_PERIOD,
    MOON_ORBITAL_SPEED,
    EARTH_SOI,
    MOON_SOI,
    createVec3,
    vec3Add,
    vec3Sub,
    vec3Scale,
    vec3Dot,
    vec3Cross,
    vec3Length,
    vec3Normalize,
    vec3Distance,
    computeGravitationalAcceleration,
    computeTotalAcceleration,
    computeDerivatives,
    rk4Step,
    computeOrbitalVelocity,
    computeEscapeVelocity,
    computeOrbitalElements,
    getMoonPosition,
    getMoonVelocity,
    createProbeState,
    getPrimaryBody
};
