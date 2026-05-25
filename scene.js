import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {
    EARTH_RADIUS,
    MOON_RADIUS,
    EARTH_MOON_DISTANCE
} from './physics.js';

const SCALE = 1 / 1000000;

const EARTH_DISPLAY_RADIUS = EARTH_RADIUS * SCALE * 3;
const MOON_DISPLAY_RADIUS = MOON_RADIUS * SCALE * 3;

const EARTH_POSITION_SCALE = 1 / 5000000;

const PROBE_SCALE = 5;

function worldToDisplay(worldPos) {
    return new THREE.Vector3(
        worldPos[0] * EARTH_POSITION_SCALE,
        worldPos[2] * EARTH_POSITION_SCALE,
        worldPos[1] * EARTH_POSITION_SCALE
    );
}

function createEarth() {
    const geometry = new THREE.SphereGeometry(EARTH_DISPLAY_RADIUS, 64, 64);

    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    const gradient = ctx.createLinearGradient(0, 0, 1024, 0);
    gradient.addColorStop(0, '#1a4a7a');
    gradient.addColorStop(0.3, '#2a6aaa');
    gradient.addColorStop(0.5, '#1a5a8a');
    gradient.addColorStop(0.7, '#2a7aaa');
    gradient.addColorStop(1, '#1a4a7a');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1024, 512);

    ctx.fillStyle = '#2d8a4a';
    ctx.beginPath();
    ctx.ellipse(200, 150, 120, 80, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(280, 280, 80, 60, -0.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#3a9a5a';
    ctx.beginPath();
    ctx.ellipse(700, 200, 150, 100, 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(750, 350, 100, 70, -0.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#4aaa6a';
    ctx.beginPath();
    ctx.ellipse(500, 380, 60, 40, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    for (let i = 0; i < 50; i++) {
        const x = Math.random() * 1024;
        const y = Math.random() * 512;
        const r = Math.random() * 40 + 10;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);

    const material = new THREE.MeshPhongMaterial({
        map: texture,
        shininess: 25,
        specular: 0x333333
    });

    const earth = new THREE.Mesh(geometry, material);

    const atmosphereGeometry = new THREE.SphereGeometry(EARTH_DISPLAY_RADIUS * 1.08, 64, 64);
    const atmosphereMaterial = new THREE.MeshPhongMaterial({
        color: 0x4488ff,
        transparent: true,
        opacity: 0.15,
        side: THREE.BackSide,
        depthWrite: false
    });
    const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
    earth.add(atmosphere);

    return earth;
}

function createMoon() {
    const geometry = new THREE.SphereGeometry(MOON_DISPLAY_RADIUS, 48, 48);

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#a0a0a0';
    ctx.fillRect(0, 0, 512, 256);

    ctx.fillStyle = '#808080';
    for (let i = 0; i < 200; i++) {
        const x = Math.random() * 512;
        const y = Math.random() * 256;
        const r = Math.random() * 15 + 2;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.fillStyle = '#606060';
    for (let i = 0; i < 100; i++) {
        const x = Math.random() * 512;
        const y = Math.random() * 256;
        const r = Math.random() * 25 + 5;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.fillStyle = '#707070';
    for (let i = 0; i < 50; i++) {
        const x = Math.random() * 512;
        const y = Math.random() * 256;
        const r = Math.random() * 35 + 10;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);

    const material = new THREE.MeshPhongMaterial({
        map: texture,
        shininess: 10,
        specular: 0x222222
    });

    return new THREE.Mesh(geometry, material);
}

function createProbe() {
    const group = new THREE.Group();

    const mainBodyGeom = new THREE.CylinderGeometry(0.8 * PROBE_SCALE, 1.0 * PROBE_SCALE, 2.5 * PROBE_SCALE, 12);
    const mainBodyMat = new THREE.MeshPhongMaterial({
        color: 0xe8e8e8,
        shininess: 80,
        specular: 0xffffff
    });
    const mainBody = new THREE.Mesh(mainBodyGeom, mainBodyMat);
    mainBody.rotation.x = Math.PI / 2;
    group.add(mainBody);

    const noseGeom = new THREE.ConeGeometry(0.8 * PROBE_SCALE, 1.2 * PROBE_SCALE, 12);
    const noseMat = new THREE.MeshPhongMaterial({
        color: 0xff6644,
        shininess: 100,
        specular: 0xffaaaa
    });
    const nose = new THREE.Mesh(noseGeom, noseMat);
    nose.position.z = 1.85 * PROBE_SCALE;
    group.add(nose);

    const engineGeom = new THREE.CylinderGeometry(0.5 * PROBE_SCALE, 0.7 * PROBE_SCALE, 0.8 * PROBE_SCALE, 8);
    const engineMat = new THREE.MeshPhongMaterial({
        color: 0x666666,
        shininess: 60
    });
    const engine = new THREE.Mesh(engineGeom, engineMat);
    engine.position.z = -1.65 * PROBE_SCALE;
    engine.rotation.x = Math.PI / 2;
    group.add(engine);

    const solarPanelGeom = new THREE.BoxGeometry(4 * PROBE_SCALE, 0.1 * PROBE_SCALE, 1.2 * PROBE_SCALE);
    const solarPanelMat = new THREE.MeshPhongMaterial({
        color: 0x2244aa,
        shininess: 30
    });
    const solarLeft = new THREE.Mesh(solarPanelGeom, solarPanelMat);
    solarLeft.position.set(-2.5 * PROBE_SCALE, 0, 0);
    group.add(solarLeft);

    const solarRight = new THREE.Mesh(solarPanelGeom, solarPanelMat);
    solarRight.position.set(2.5 * PROBE_SCALE, 0, 0);
    group.add(solarRight);

    const panelFrameGeom = new THREE.BoxGeometry(4.2 * PROBE_SCALE, 0.15 * PROBE_SCALE, 0.15 * PROBE_SCALE);
    const panelFrameMat = new THREE.MeshPhongMaterial({ color: 0x444444 });

    const frameTop1 = new THREE.Mesh(panelFrameGeom, panelFrameMat);
    frameTop1.position.set(-2.5 * PROBE_SCALE, 0, 0.65 * PROBE_SCALE);
    group.add(frameTop1);

    const frameBot1 = new THREE.Mesh(panelFrameGeom, panelFrameMat);
    frameBot1.position.set(-2.5 * PROBE_SCALE, 0, -0.65 * PROBE_SCALE);
    group.add(frameBot1);

    const frameTop2 = new THREE.Mesh(panelFrameGeom, panelFrameMat);
    frameTop2.position.set(2.5 * PROBE_SCALE, 0, 0.65 * PROBE_SCALE);
    group.add(frameTop2);

    const frameBot2 = new THREE.Mesh(panelFrameGeom, panelFrameMat);
    frameBot2.position.set(2.5 * PROBE_SCALE, 0, -0.65 * PROBE_SCALE);
    group.add(frameBot2);

    const dishGeom = new THREE.SphereGeometry(0.8 * PROBE_SCALE, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    const dishMat = new THREE.MeshPhongMaterial({
        color: 0xdddddd,
        shininess: 80,
        side: THREE.DoubleSide
    });
    const dish = new THREE.Mesh(dishGeom, dishMat);
    dish.position.set(0, -1.0 * PROBE_SCALE, -0.3 * PROBE_SCALE);
    dish.rotation.x = Math.PI / 2;
    group.add(dish);

    const dishStemGeom = new THREE.CylinderGeometry(0.08 * PROBE_SCALE, 0.08 * PROBE_SCALE, 1.0 * PROBE_SCALE, 6);
    const dishStemMat = new THREE.MeshPhongMaterial({ color: 0x555555 });
    const dishStem = new THREE.Mesh(dishStemGeom, dishStemMat);
    dishStem.position.set(0, -0.5 * PROBE_SCALE, -0.3 * PROBE_SCALE);
    dishStem.rotation.x = Math.PI / 2;
    group.add(dishStem);

    const glowGeom = new THREE.SphereGeometry(1.5 * PROBE_SCALE, 16, 16);
    const glowMat = new THREE.MeshBasicMaterial({
        color: 0x66aaff,
        transparent: true,
        opacity: 0.15,
        depthWrite: false
    });
    const glow = new THREE.Mesh(glowGeom, glowMat);
    group.add(glow);

    const engineGlowGeom = new THREE.ConeGeometry(0.6 * PROBE_SCALE, 1.5 * PROBE_SCALE, 8);
    const engineGlowMat = new THREE.MeshBasicMaterial({
        color: 0xff8844,
        transparent: true,
        opacity: 0.0,
        depthWrite: false
    });
    const engineGlow = new THREE.Mesh(engineGlowGeom, engineGlowMat);
    engineGlow.position.set(0, 0, -2.5 * PROBE_SCALE);
    engineGlow.rotation.x = -Math.PI / 2;
    group.add(engineGlow);

    return group;
}

function createTrajectoryLine(maxPoints = 50000) {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(maxPoints * 3);
    const colors = new Float32Array(maxPoints * 3);

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setDrawRange(0, 0);

    const material = new THREE.LineBasicMaterial({
        vertexColors: true,
        linewidth: 2,
        transparent: true,
        opacity: 0.95
    });

    return new THREE.Line(geometry, material);
}

function createOrbitRing(radius, color = 0x444488, segments = 128) {
    const points = [];
    for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * Math.PI * 2;
        points.push(new THREE.Vector3(
            Math.cos(angle) * radius * EARTH_POSITION_SCALE,
            0,
            Math.sin(angle) * radius * EARTH_POSITION_SCALE
        ));
    }

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.4,
        linewidth: 1
    });

    return new THREE.Line(geometry, material);
}

function createStarField(count = 5000) {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const radius = 300 + Math.random() * 100;

        positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
        positions[i * 3 + 2] = radius * Math.cos(phi);

        const brightness = 0.5 + Math.random() * 0.5;
        const tint = Math.random();
        if (tint < 0.2) {
            colors[i * 3] = brightness * 0.8;
            colors[i * 3 + 1] = brightness * 0.9;
            colors[i * 3 + 2] = brightness;
        } else if (tint < 0.3) {
            colors[i * 3] = brightness;
            colors[i * 3 + 1] = brightness * 0.8;
            colors[i * 3 + 2] = brightness * 0.7;
        } else {
            colors[i * 3] = brightness;
            colors[i * 3 + 1] = brightness;
            colors[i * 3 + 2] = brightness;
        }
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
        size: 0.8,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0.9,
        vertexColors: true
    });

    return new THREE.Points(geometry, material);
}

function createMoonOrbitLine() {
    return createOrbitRing(EARTH_MOON_DISTANCE, 0x444466, 256);
}

export {
    SCALE,
    EARTH_DISPLAY_RADIUS,
    MOON_DISPLAY_RADIUS,
    EARTH_POSITION_SCALE,
    PROBE_SCALE,
    worldToDisplay,
    createEarth,
    createMoon,
    createProbe,
    createTrajectoryLine,
    createOrbitRing,
    createStarField,
    createMoonOrbitLine
};
