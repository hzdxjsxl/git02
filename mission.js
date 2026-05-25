import {
    EARTH_MU,
    MOON_MU,
    EARTH_RADIUS,
    MOON_RADIUS,
    EARTH_MOON_DISTANCE,
    MOON_ORBITAL_SPEED,
    computeOrbitalVelocity,
    vec3Length,
    vec3Sub,
    vec3Normalize,
    vec3Scale,
    vec3Add,
    vec3Distance,
    vec3Dot,
    getMoonPosition,
    getMoonVelocity,
    createProbeState
} from './physics.js';

const MISSION_PHASES = {
    PARKING: 'parking',
    TRANS_LUNAR: 'trans_lunar',
    LUNAR_CAPTURE: 'lunar_capture',
    LUNAR_ORBIT: 'lunar_orbit'
};

function createMissionController() {
    return {
        phase: MISSION_PHASES.PARKING,
        phaseStartTime: 0,
        tliCompleted: false,
        captureCompleted: false,
        parkingOrbitTime: 0,
        tliBurnTime: 0,
        captureBurnTime: 0,

        thrustAcceleration: [0, 0, 0],
        thrustActive: false,
        thrustDuration: 0,
        thrustDirection: [0, 0, 0],

        trajectoryColor: [
            { r: 0.4, g: 0.7, b: 1.0 },
            { r: 1.0, g: 0.8, b: 0.0 },
            { r: 1.0, g: 0.5, b: 0.3 }
        ]
    };
}

function computeParkingOrbitParameters(altitude = 300000) {
    const r = EARTH_RADIUS + altitude;
    const v = computeOrbitalVelocity(EARTH_MU, EARTH_RADIUS, altitude);
    const period = 2 * Math.PI * Math.sqrt(r * r * r / EARTH_MU);

    return {
        radius: r,
        velocity: v,
        period: period,
        altitude: altitude
    };
}

function computeTLIDeltaV(parkingAltitude = 300000) {
    const rPark = EARTH_RADIUS + parkingAltitude;
    const vPark = computeOrbitalVelocity(EARTH_MU, EARTH_RADIUS, parkingAltitude);

    const aTransfer = (rPark + EARTH_MOON_DISTANCE) / 2;

    const vAtEarth = Math.sqrt(
        EARTH_MU * (2 / rPark - 1 / aTransfer)
    );

    const deltaV = vAtEarth - vPark;

    return {
        deltaV: deltaV,
        vAtEarth: vAtEarth,
        aTransfer: aTransfer,
        transferTime: Math.PI * Math.sqrt(aTransfer * aTransfer * aTransfer / EARTH_MU)
    };
}

function computeLunarCaptureParameters(probeState, moonPos, moonVel) {
    const relPos = vec3Sub(probeState.position, moonPos);
    const relVel = vec3Sub(probeState.velocity, moonVel);

    const r = vec3Length(relPos);
    const v = vec3Length(relVel);

    const targetOrbitAltitude = 100000;
    const targetR = MOON_RADIUS + targetOrbitAltitude;

    const vTarget = computeOrbitalVelocity(MOON_MU, MOON_RADIUS, targetOrbitAltitude);

    const aCurrent = -MOON_MU / (v * v / 2 - MOON_MU / r);

    const vAtTarget = Math.sqrt(MOON_MU * (2 / targetR - 1 / aCurrent));

    const deltaV = vTarget - vAtTarget;

    return {
        deltaV: Math.abs(deltaV),
        vTarget: vTarget,
        targetR: targetR,
        captureAltitude: targetOrbitAltitude
    };
}

function updateMission(controller, probeState, currentTime, dt) {
    controller.thrustActive = false;
    controller.thrustAcceleration = [0, 0, 0];

    switch (controller.phase) {
        case MISSION_PHASES.PARKING:
            return updateParkingPhase(controller, probeState, currentTime, dt);

        case MISSION_PHASES.TRANS_LUNAR:
            return updateTransLunarPhase(controller, probeState, currentTime, dt);

        case MISSION_PHASES.LUNAR_CAPTURE:
            return updateLunarCapturePhase(controller, probeState, currentTime, dt);

        case MISSION_PHASES.LUNAR_ORBIT:
            return controller;

        default:
            return controller;
    }
}

function updateParkingPhase(controller, probeState, currentTime, dt) {
    const parkingParams = computeParkingOrbitParameters(300000);

    if (controller.parkingOrbitTime < parkingParams.period * 1.5) {
        controller.parkingOrbitTime += dt;
    } else if (!controller.tliCompleted) {
        const tliParams = computeTLIDeltaV(300000);

        const moonPos = getMoonPosition(currentTime + tliParams.transferTime * 0.8);

        const earthToMoon = vec3Normalize(moonPos);

        const currentPos = probeState.position;
        const currentVel = probeState.velocity;
        const posDir = vec3Normalize(currentPos);

        const velDir = vec3Normalize(currentVel);
        const earthToMoonDir = vec3Normalize(moonPos);

        const alignment = vec3Dot(velDir, earthToMoonDir);

        if (alignment > 0.95 || controller.tliBurnTime > 0) {
            controller.thrustActive = true;
            controller.thrustDuration = tliParams.deltaV / 15;
            controller.thrustDirection = velDir;

            const thrustMag = 15;
            controller.thrustAcceleration = vec3Scale(velDir, thrustMag);

            controller.tliBurnTime += dt;

            if (controller.tliBurnTime >= controller.thrustDuration) {
                controller.tliCompleted = true;
                controller.phase = MISSION_PHASES.TRANS_LUNAR;
                controller.phaseStartTime = currentTime;
                controller.tliBurnTime = 0;
            }
        }
    }

    return controller;
}

function updateTransLunarPhase(controller, probeState, currentTime, dt) {
    const moonPos = getMoonPosition(currentTime);
    const distToMoon = vec3Distance(probeState.position, moonPos);

    const moonSOI = 66100000;

    if (distToMoon < moonSOI && !controller.captureCompleted) {
        controller.phase = MISSION_PHASES.LUNAR_CAPTURE;
        controller.phaseStartTime = currentTime;
    }

    return controller;
}

function updateLunarCapturePhase(controller, probeState, currentTime, dt) {
    const moonPos = getMoonPosition(currentTime);
    const moonVel = getMoonVelocity(currentTime);

    const relPos = vec3Sub(probeState.position, moonPos);
    const relVel = vec3Sub(probeState.velocity, moonVel);

    const r = vec3Length(relPos);
    const targetR = MOON_RADIUS + 100000;

    if (Math.abs(r - targetR) < targetR * 0.3 && controller.captureBurnTime < 1) {
        const vRel = vec3Length(relVel);
        const vTarget = computeOrbitalVelocity(MOON_MU, MOON_RADIUS, 100000);

        const deltaV = vTarget - vRel;

        if (Math.abs(deltaV) > 1) {
            controller.thrustActive = true;
            const relVelDir = vec3Normalize(relVel);
            const thrustDir = deltaV > 0 ? relVelDir : vec3Scale(relVelDir, -1);
            const thrustMag = Math.min(Math.abs(deltaV) / 10, 20);
            controller.thrustAcceleration = vec3Scale(thrustDir, thrustMag);
            controller.thrustDirection = thrustDir;
            controller.captureBurnTime += dt;
        } else {
            controller.captureCompleted = true;
            controller.phase = MISSION_PHASES.LUNAR_ORBIT;
            controller.phaseStartTime = currentTime;
        }
    } else if (controller.captureBurnTime >= 1) {
        controller.captureCompleted = true;
        controller.phase = MISSION_PHASES.LUNAR_ORBIT;
        controller.phaseStartTime = currentTime;
    }

    return controller;
}

function getPhaseName(phase) {
    const names = {
        [MISSION_PHASES.PARKING]: '地球停泊轨道',
        [MISSION_PHASES.TRANS_LUNAR]: '地月转移轨道 (TLI)',
        [MISSION_PHASES.LUNAR_CAPTURE]: '月球引力捕获',
        [MISSION_PHASES.LUNAR_ORBIT]: '月球轨道运行'
    };
    return names[phase] || '未知';
}

function getPhaseIndex(phase) {
    const indices = {
        [MISSION_PHASES.PARKING]: 0,
        [MISSION_PHASES.TRANS_LUNAR]: 1,
        [MISSION_PHASES.LUNAR_CAPTURE]: 2,
        [MISSION_PHASES.LUNAR_ORBIT]: 3
    };
    return indices[phase] || 0;
}

export {
    MISSION_PHASES,
    createMissionController,
    computeParkingOrbitParameters,
    computeTLIDeltaV,
    computeLunarCaptureParameters,
    updateMission,
    getPhaseName,
    getPhaseIndex
};
