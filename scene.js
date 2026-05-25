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

    const atmosphereGeometry = new THREE.SphereGeometry(EARTH_DISPLAY_RADIUS * 1.05, 64, 64);
    const atmosphereMaterial = new THREE.MeshPhongMaterial({
        color: 0x4488ff,
        transparent: true,
        opacity: 0.2,
        side: THREE.BackSide
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

    const bodyGeometry = new THREE.ConeGeometry(0.3, 1, 8);
    const bodyMaterial = new THREE.MeshPhongMaterial({
        color: 0xcccccc,
        shininess: 100,
        specular: 0xffffff
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.rotation.x = Math.PI / 2;
    group.add(body);

    const solarGeometry = new THREE.BoxGeometry(0.1, 2, 0.02);
    const solarMaterial = new THREE.MeshPhongMaterial({
        color: 0x2244aa,
        shininess: 50
    });
    const solarLeft = new THREE.Mesh(solarGeometry, solarMaterial);
    solarLeft.position.x = -1.2;
    solarLeft.position.y = 0.3;
    group.add(solarLeft);

    const solarRight = new THREE.Mesh(solarGeometry, solarMaterial);
    solarRight.position.x = 1.2;
    solarRight.position.y = 0.3;
    group.add(solarRight);

    const dishGeometry = new THREE.SphereGeometry(0.4, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    const dishMaterial = new THREE.MeshPhongMaterial({
        color: 0xdddddd,
        shininess: 80
    });
    const dish = new THREE.Mesh(dishGeometry, dishMaterial);
    dish.position.y = -0.6;
    dish.rotation.x = Math.PI;
    group.add(dish);

    const glowGeometry = new THREE.SphereGeometry(0.8, 16, 16);
    const glowMaterial = new THREE.MeshBasicMaterial({
        color: 0xffff00,
        transparent: true,
        opacity: 0.3
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    group.add(glow);

    return group;
}

function createTrajectoryLine(maxPoints = 10000) {
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
        opacity: 0.9
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

function createStarField(count = 3000) {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    for (let i = 0; i < count; i++) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const radius = 200 + Math.random() * 50;

        positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
        positions[i * 3 + 2] = radius * Math.cos(phi);

        sizes[i] = Math.random() * 2 + 0.5;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.5,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0.8
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
    worldToDisplay,
    createEarth,
    createMoon,
    createProbe,
    createTrajectoryLine,
    createOrbitRing,
    createStarField,
    createMoonOrbitLine
};
