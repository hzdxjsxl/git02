import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

import {
    EARTH_MU,
    MOON_MU,
    EARTH_RADIUS,
    MOON_RADIUS,
    EARTH_MOON_DISTANCE,
    MOON_SOI,
    vec3Length,
    vec3Distance,
    rk4Step,
    getMoonPosition,
    getMoonVelocity,
    createProbeState
} from './physics.js';

import {
    WORLD_DISPLAY_SCALE,
    worldToDisplay,
    createEarth,
    createMoon,
    createProbe,
    createTrajectoryLine,
    createOrbitRing,
    createStarField,
    createMoonOrbitLine,
    PROBE_SCALE
} from './scene.js';

import {
    MISSION_PHASES,
    createMissionController,
    updateMission,
    getPhaseName,
    getPhaseIndex
} from './mission.js';

let scene, camera, renderer, controls;

let earth, moon, probe;
let trajectoryLine, moonOrbitLine;
let parkingOrbitLine;

let starField;

let probeState;
let missionController;

let simulationTime = 0;
let isRunning = false;
let isPaused = false;
let timeScale = 1;
let cameraMode = 0;

const MAX_TRAJECTORY_POINTS = 50000;
let trajectoryPointCount = 0;
let lastTrajectoryUpdate = 0;

const trajectoryColors = [
    new THREE.Color(0.4, 0.7, 1.0),
    new THREE.Color(1.0, 0.8, 0.0),
    new THREE.Color(1.0, 0.5, 0.3),
    new THREE.Color(0.5, 1.0, 0.5)
];

let lastPhase = -1;

function init() {
    const container = document.getElementById('canvas-container');

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000008);

    camera = new THREE.PerspectiveCamera(
        60,
        window.innerWidth / window.innerHeight,
        0.1,
        3000
    );
    camera.position.set(0, 40, 80);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 5;
    controls.maxDistance = 1500;

    const ambientLight = new THREE.AmbientLight(0x404040, 0.7);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffffff, 2.5);
    sunLight.position.set(100, 60, 100);
    scene.add(sunLight);

    const fillLight = new THREE.DirectionalLight(0x8888ff, 0.5);
    fillLight.position.set(-100, -40, -100);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xffaa44, 0.4);
    rimLight.position.set(0, 100, -100);
    scene.add(rimLight);

    starField = createStarField(8000);
    scene.add(starField);

    earth = createEarth();
    scene.add(earth);

    moon = createMoon();
    scene.add(moon);

    probe = createProbe();
    scene.add(probe);

    trajectoryLine = createTrajectoryLine(MAX_TRAJECTORY_POINTS);
    scene.add(trajectoryLine);

    moonOrbitLine = createMoonOrbitLine();
    scene.add(moonOrbitLine);

    parkingOrbitLine = createOrbitRing(EARTH_RADIUS + 300000, 0x4488ff, 128);
    scene.add(parkingOrbitLine);

    probeState = createProbeState(300000);
    missionController = createMissionController();

    updateVisuals();

    setupEventListeners();

    animate();
}

function setupEventListeners() {
    document.getElementById('btn-launch').addEventListener('click', startMission);
    document.getElementById('btn-pause').addEventListener('click', togglePause);
    document.getElementById('btn-reset').addEventListener('click', resetMission);
    document.getElementById('btn-speed-up').addEventListener('click', changeSpeed);
    document.getElementById('btn-camera').addEventListener('click', changeCamera);

    window.addEventListener('resize', onWindowResize);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function startMission() {
    if (!isRunning) {
        isRunning = true;
        isPaused = false;
        document.getElementById('btn-launch').textContent = '🚀 任务进行中';
        document.getElementById('btn-launch').disabled = true;
        updatePhaseDisplay();
    }
}

function togglePause() {
    if (isRunning) {
        isPaused = !isPaused;
        document.getElementById('btn-pause').textContent = isPaused ? '▶ 继续' : '⏸ 暂停';
    }
}

function resetMission() {
    isRunning = false;
    isPaused = false;
    simulationTime = 0;
    timeScale = 1;

    probeState = createProbeState(300000);
    missionController = createMissionController();

    trajectoryPointCount = 0;
    trajectoryLine.geometry.setDrawRange(0, 0);

    const positions = trajectoryLine.geometry.attributes.position.array;
    const colors = trajectoryLine.geometry.attributes.color.array;
    positions.fill(0);
    colors.fill(0);
    trajectoryLine.geometry.attributes.position.needsUpdate = true;
    trajectoryLine.geometry.attributes.color.needsUpdate = true;

    document.getElementById('btn-launch').textContent = '🚀 开始任务';
    document.getElementById('btn-launch').disabled = false;
    document.getElementById('btn-pause').textContent = '⏸ 暂停';
    document.getElementById('btn-speed-up').textContent = '⏩ 加速 1x';

    cameraMode = 0;
    controls.target.set(0, 0, 0);
    camera.position.set(0, 40, 80);

    updateInfoDisplay();
    updateVisuals();
    lastPhase = -1;
    resetPhaseDisplay();
}

function changeSpeed() {
    const speeds = [1, 2, 5, 10, 20, 50, 100, 200];
    const currentIndex = speeds.indexOf(timeScale);
    timeScale = speeds[(currentIndex + 1) % speeds.length];
    document.getElementById('btn-speed-up').textContent = `⏩ 加速 ${timeScale}x`;
}

function changeCamera() {
    cameraMode = (cameraMode + 1) % 5;
    const probePos = probe.position;
    const moonPos = moon.position;

    switch (cameraMode) {
        case 0:
            controls.target.set(0, 0, 0);
            camera.position.set(0, 40, 80);
            break;
        case 1:
            controls.target.set(0, 0, 0);
            camera.position.set(0, 120, 1);
            break;
        case 2:
            controls.target.copy(probePos);
            camera.position.set(
                probePos.x + 10,
                probePos.y + 10,
                probePos.z + 10
            );
            break;
        case 3:
            controls.target.copy(moonPos);
            camera.position.set(
                moonPos.x + 20,
                moonPos.y + 20,
                moonPos.z + 20
            );
            break;
        case 4:
            const midPoint = new THREE.Vector3().addVectors(probePos, moonPos).multiplyScalar(0.5);
            controls.target.copy(midPoint);
            camera.position.set(
                midPoint.x + 50,
                midPoint.y + 50,
                midPoint.z + 50
            );
            break;
    }
}

function updatePhysics(dt) {
    if (!isRunning || isPaused) return;

    const scaledDt = dt * timeScale;

    const subSteps = Math.max(1, Math.ceil(scaledDt / 30));
    const subDt = scaledDt / subSteps;

    for (let i = 0; i < subSteps; i++) {
        const currentTime = simulationTime + subDt * i;

        missionController = updateMission(
            missionController,
            probeState,
            currentTime,
            subDt
        );

        const bodies = [
            {
                position: [0, 0, 0],
                mu: EARTH_MU
            },
            {
                position: getMoonPosition(currentTime),
                mu: MOON_MU
            }
        ];

        probeState = rk4Step(
            probeState,
            bodies,
            subDt,
            missionController.thrustAcceleration
        );
    }

    simulationTime += scaledDt;
}

function updateTrajectory() {
    if (!isRunning) return;

    if (trajectoryPointCount >= MAX_TRAJECTORY_POINTS) return;

    const minInterval = 30;
    if (simulationTime - lastTrajectoryUpdate < minInterval) return;
    lastTrajectoryUpdate = simulationTime;

    const displayPos = worldToDisplay(probeState.position);
    const positions = trajectoryLine.geometry.attributes.position.array;
    const colors = trajectoryLine.geometry.attributes.color.array;

    const phaseIndex = getPhaseIndex(missionController.phase);
    const color = trajectoryColors[phaseIndex];

    const idx = trajectoryPointCount * 3;
    positions[idx] = displayPos.x;
    positions[idx + 1] = displayPos.y;
    positions[idx + 2] = displayPos.z;

    colors[idx] = color.r;
    colors[idx + 1] = color.g;
    colors[idx + 2] = color.b;

    trajectoryPointCount++;
    trajectoryLine.geometry.setDrawRange(0, trajectoryPointCount);
    trajectoryLine.geometry.attributes.position.needsUpdate = true;
    trajectoryLine.geometry.attributes.color.needsUpdate = true;
}

function updateVisuals() {
    const currentTime = simulationTime;

    const moonPos = getMoonPosition(currentTime);
    const moonDisplayPos = worldToDisplay(moonPos);
    moon.position.copy(moonDisplayPos);

    const probeDisplayPos = worldToDisplay(probeState.position);
    probe.position.copy(probeDisplayPos);

    const earthRotation = (currentTime / 86400) * Math.PI * 2;
    earth.rotation.y = earthRotation;

    const moonRotation = (currentTime / 2360000) * Math.PI * 2;
    moon.rotation.y = moonRotation;

    if (cameraMode === 2) {
        controls.target.copy(probe.position);
    } else if (cameraMode === 3) {
        controls.target.copy(moon.position);
    } else if (cameraMode === 4) {
        const midPoint = new THREE.Vector3().addVectors(probe.position, moon.position).multiplyScalar(0.5);
        controls.target.copy(midPoint);
    }

    if (missionController.thrustActive) {
        probe.children[11].material.opacity = 0.8;
        probe.children[10].material.opacity = 0.25;
    } else {
        probe.children[11].material.opacity = 0.0;
        probe.children[10].material.opacity = 0.12;
    }
}

function updateInfoDisplay() {
    const currentTime = simulationTime;
    const days = currentTime / 86400;

    const velocity = vec3Length(probeState.velocity) / 1000;

    const distEarth = vec3Distance(probeState.position, [0, 0, 0]) / 1000;

    const moonPos = getMoonPosition(currentTime);
    const distMoon = vec3Distance(probeState.position, moonPos) / 1000;

    const phaseName = getPhaseName(missionController.phase);

    document.getElementById('flight-time').textContent = days.toFixed(2) + ' 天';
    document.getElementById('velocity').textContent = velocity.toFixed(2) + ' km/s';
    document.getElementById('dist-earth').textContent = distEarth.toFixed(0) + ' km';
    document.getElementById('dist-moon').textContent = distMoon.toFixed(0) + ' km';
    document.getElementById('current-phase').textContent = phaseName;

    const currentPhaseIndex = getPhaseIndex(missionController.phase);
    if (currentPhaseIndex !== lastPhase) {
        updatePhaseDisplay();
        lastPhase = currentPhaseIndex;
    }
}

function updatePhaseDisplay() {
    const currentPhaseIndex = getPhaseIndex(missionController.phase);

    for (let i = 0; i <= 3; i++) {
        const element = document.getElementById(`phase-${i}`);
        element.classList.remove('active', 'done');

        if (i < currentPhaseIndex) {
            element.classList.add('done');
        } else if (i === currentPhaseIndex) {
            element.classList.add('active');
        }
    }
}

function resetPhaseDisplay() {
    for (let i = 0; i <= 3; i++) {
        const element = document.getElementById(`phase-${i}`);
        element.classList.remove('active', 'done');
    }
}

let lastTime = 0;

function animate(currentTime) {
    requestAnimationFrame(animate);

    if (!lastTime) lastTime = currentTime;
    const deltaTime = (currentTime - lastTime) / 1000;
    lastTime = currentTime;

    updatePhysics(deltaTime);
    updateTrajectory();
    updateVisuals();
    updateInfoDisplay();

    controls.update();
    renderer.render(scene, camera);
}

init();
