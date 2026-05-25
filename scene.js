import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {
    EARTH_RADIUS,
    MOON_RADIUS,
    EARTH_MOON_DISTANCE
} from './physics.js';

const WORLD_DISPLAY_SCALE = 3 / 1000000;

const EARTH_DISPLAY_RADIUS = EARTH_RADIUS * WORLD_DISPLAY_SCALE;
const MOON_DISPLAY_RADIUS = MOON_RADIUS * WORLD_DISPLAY_SCALE;

const PROBE_SCALE = 3;

function worldToDisplay(worldPos) {
    return new THREE.Vector3(
        worldPos[0] * WORLD_DISPLAY_SCALE,
        worldPos[2] * WORLD_DISPLAY_SCALE,
        worldPos[1] * WORLD_DISPLAY_SCALE
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

    const atmosphereGeometry = new THREE.SphereGeometry(EARTH_DISPLAY_RADIUS * 1.06, 64, 64);
    const atmosphereMaterial = new THREE.MeshPhongMaterial({
        color: 0x4488ff,
        transparent: true,
        opacity: 0.12,
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

    const s = PROBE_SCALE;

    const bodyGeom = new THREE.CylinderGeometry(0.6 * s, 0.8 * s, 2.0 * s, 12);
    const bodyMat = new THREE.MeshPhongMaterial({
        color: 0xffffff,
        shininess: 100,
        specular: 0xffffff
    });
    const body = new THREE.Mesh(bodyGeom, bodyMat);
    body.rotation.x = Math.PI / 2;
    group.add(body);

    const noseGeom = new THREE.ConeGeometry(0.6 * s, 1.0 * s, 12);
    const noseMat = new THREE.MeshPhongMaterial({
        color: 0xff4422,
        shininess: 120,
        specular: 0xffaaaa
    });
    const nose = new THREE.Mesh(noseGeom, noseMat);
    nose.position.z = 1.5 * s;
    group.add(nose);

    const engineGeom = new THREE.CylinderGeometry(0.35 * s, 0.5 * s, 0.6 * s, 8);
    const engineMat = new THREE.MeshPhongMaterial({
        color: 0x555555,
        shininess: 60
    });
    const engine = new THREE.Mesh(engineGeom, engineMat);
    engine.position.z = -1.3 * s;
    engine.rotation.x = Math.PI / 2;
    group.add(engine);

    const panelGeom = new THREE.BoxGeometry(3.0 * s, 0.08 * s, 1.0 * s);
    const panelMat = new THREE.MeshPhongMaterial({
        color: 0x2244cc,
        shininess: 40
    });
    const panelLeft = new THREE.Mesh(panelGeom, panelMat);
    panelLeft.position.set(-2.0 * s, 0, 0);
    group.add(panelLeft);

    const panelRight = new THREE.Mesh(panelGeom, panelMat);
    panelRight.position.set(2.0 * s, 0, 0);
    group.add(panelRight);

    const frameGeom = new THREE.BoxGeometry(3.2 * s, 0.12 * s, 0.12 * s);
    const frameMat = new THREE.MeshPhongMaterial({ color: 0x333333 });

    const ft1 = new THREE.Mesh(frameGeom, frameMat);
    ft1.position.set(-2.0 * s, 0, 0.55 * s);
    group.add(ft1);

    const fb1 = new THREE.Mesh(frameGeom, frameMat);
    fb1.position.set(-2.0 * s, 0, -0.55 * s);
    group.add(fb1);

    const ft2 = new THREE.Mesh(frameGeom, frameMat);
    ft2.position.set(2.0 * s, 0, 0.55 * s);
    group.add(ft2);

    const fb2 = new THREE.Mesh(frameGeom, frameMat);
    fb2.position.set(2.0 * s, 0, -0.55 * s);
    group.add(fb2);

    const dishGeom = new THREE.SphereGeometry(0.7 * s, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    const dishMat = new THREE.MeshPhongMaterial({
        color: 0xeeeeee,
        shininess: 80,
        side: THREE.DoubleSide
    });
    const dish = new THREE.Mesh(dishGeom, dishMat);
    dish.position.set(0, -0.8 * s, -0.2 * s);
    dish.rotation.x = Math.PI / 2;
    group.add(dish);

    const dishStemGeom = new THREE.CylinderGeometry(0.06 * s, 0.06 * s, 0.8 * s, 6);
    const dishStemMat = new THREE.MeshPhongMaterial({ color: 0x555555 });
    const dishStem = new THREE.Mesh(dishStemGeom, dishStemMat);
    dishStem.position.set(0, -0.4 * s, -0.2 * s);
    dishStem.rotation.x = Math.PI / 2;
    group.add(dishStem);

    const glowGeom = new THREE.SphereGeometry(1.2 * s, 16, 16);
    const glowMat = new THREE.MeshBasicMaterial({
        color: 0x66aaff,
        transparent: true,
        opacity: 0.12,
        depthWrite: false
    });
    const glow = new THREE.Mesh(glowGeom, glowMat);
    group.add(glow);

    const thrustGeom = new THREE.ConeGeometry(0.4 * s, 1.2 * s, 8);
    const thrustMat = new THREE.MeshBasicMaterial({
        color: 0xff8844,
        transparent: true,
        opacity: 0.0,
        depthWrite: false
    });
    const thrust = new THREE.Mesh(thrustGeom, thrustMat);
    thrust.position.set(0, 0, -2.0 * s);
    thrust.rotation.x = -Math.PI / 2;
    group.add(thrust);

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
            Math.cos(angle) * radius * WORLD_DISPLAY_SCALE,
            0,
            Math.sin(angle) * radius * WORLD_DISPLAY_SCALE
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
        const radius = 500 + Math.random() * 200;

        positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
        positions[i * 3 + 2] = radius * Math.cos(phi);

        const brightness = 0.5 + Math.random() * 0.5;
        const tint = Math.random();
        if (tint < 0.15) {
            colors[i * 3] = brightness * 0.7;
            colors[i * 3 + 1] = brightness * 0.85;
            colors[i * 3 + 2] = brightness;
        } else if (tint < 0.25) {
            colors[i * 3] = brightness;
            colors[i * 3 + 1] = brightness * 0.75;
            colors[i * 3 + 2] = brightness * 0.65;
        } else {
            colors[i * 3] = brightness;
            colors[i * 3 + 1] = brightness;
            colors[i * 3 + 2] = brightness;
        }
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
        size: 1.0,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0.9,
        vertexColors: true
    });

    return new THREE.Points(geometry, material);
}

function createMoonOrbitLine() {
    return createOrbitRing(EARTH_MOON_DISTANCE, 0x333355, 256);
}

export {
    WORLD_DISPLAY_SCALE,
    EARTH_DISPLAY_RADIUS,
    MOON_DISPLAY_RADIUS,
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
