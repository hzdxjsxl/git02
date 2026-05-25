import * as THREE from 'three';

export class Renderer {
    constructor(container) {
        this.container = container;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.clock = new THREE.Clock();
        this.keyLight = null;
        this.floor = null;
        this._init();
    }

    _init() {
        this._createScene();
        this._createCamera();
        this._createRenderer();
        this._createLights();
        this._createEnvironment();
        this._handleResize();
    }

    _createScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x1a1512);
        this.scene.fog = new THREE.Fog(0x1a1512, 15, 35);
    }

    _createCamera() {
        const aspect = window.innerWidth / window.innerHeight;
        this.camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 100);
        this.camera.position.set(8, 6, 12);
        this.camera.lookAt(0, 0, 0);
    }

    _createRenderer() {
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.1;
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.container.appendChild(this.renderer.domElement);
    }

    _createLights() {
        const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
        this.scene.add(ambientLight);

        const hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x3d2817, 0.35);
        this.scene.add(hemiLight);

        const keyLight = new THREE.DirectionalLight(0xffeedd, 2.0);
        keyLight.position.set(8, 18, 6);
        keyLight.castShadow = true;
        keyLight.shadow.mapSize.width = 4096;
        keyLight.shadow.mapSize.height = 4096;
        keyLight.shadow.camera.near = 0.1;
        keyLight.shadow.camera.far = 60;
        keyLight.shadow.camera.left = -12;
        keyLight.shadow.camera.right = 12;
        keyLight.shadow.camera.top = 12;
        keyLight.shadow.camera.bottom = -12;
        keyLight.shadow.bias = -0.0005;
        keyLight.shadow.normalBias = 0.02;
        keyLight.shadow.radius = 2;
        this.keyLight = keyLight;
        this.scene.add(keyLight);

        const shadowHelper = new THREE.CameraHelper(keyLight.shadow.camera);
        shadowHelper.visible = false;
        this.scene.add(shadowHelper);

        const fillLight = new THREE.DirectionalLight(0xd4c5a0, 0.5);
        fillLight.position.set(-10, 8, -5);
        this.scene.add(fillLight);

        const rimLight = new THREE.DirectionalLight(0x8b7355, 0.35);
        rimLight.position.set(0, 10, -12);
        this.scene.add(rimLight);

        const spotLight = new THREE.SpotLight(0xfff4e0, 0.7);
        spotLight.position.set(0, 22, 0);
        spotLight.angle = Math.PI / 8;
        spotLight.penumbra = 0.3;
        spotLight.castShadow = true;
        spotLight.shadow.mapSize.width = 2048;
        spotLight.shadow.mapSize.height = 2048;
        spotLight.shadow.bias = -0.0002;
        spotLight.shadow.normalBias = 0.01;
        this.scene.add(spotLight);
    }

    _createEnvironment() {
        const floorGeo = new THREE.PlaneGeometry(80, 80, 1, 1);
        const floorMat = new THREE.MeshStandardMaterial({
            color: 0x2a2420,
            roughness: 0.92,
            metalness: 0.08
        });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = -1.5;
        floor.receiveShadow = true;
        this.floor = floor;
        this.scene.add(floor);

        const gridHelper = new THREE.GridHelper(50, 50, 0x3a3028, 0x2a2420);
        gridHelper.position.y = -1.49;
        this.scene.add(gridHelper);

        this._updateShadowCamera();
    }

    _updateShadowCamera() {
        if (!this.keyLight || !this.floor) return;

        const floorY = this.floor.position.y;
        const lightPos = this.keyLight.position;

        this.keyLight.shadow.camera.lookAt(0, 0, 0);
        this.keyLight.shadow.camera.updateProjectionMatrix();
    }

    _handleResize() {
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }

    addObject(object) {
        this.scene.add(object);
    }

    removeObject(object) {
        this.scene.remove(object);
    }

    getWorldPositionFromScreen(screenX, screenY) {
        const rect = this.renderer.domElement.getBoundingClientRect();
        const x = ((screenX - rect.left) / rect.width) * 2 - 1;
        const y = -((screenY - rect.top) / rect.height) * 2 + 1;

        const vector = new THREE.Vector3(x, y, 0.5);
        vector.unproject(this.camera);
        const dir = vector.sub(this.camera.position).normalize();
        const distance = -this.camera.position.y / dir.y;
        return this.camera.position.clone().add(dir.multiplyScalar(distance));
    }

    updateCameraOrbit(target, radius, theta, phi) {
        const x = target.x + radius * Math.sin(phi) * Math.cos(theta);
        const y = target.y + radius * Math.cos(phi);
        const z = target.z + radius * Math.sin(phi) * Math.sin(theta);

        this.camera.position.set(x, y, z);
        this.camera.lookAt(target);
    }

    updateShadowCamera(pieces) {
        if (!this.keyLight) return;

        let minX = Infinity, maxX = -Infinity;
        let minZ = Infinity, maxZ = -Infinity;

        pieces.forEach(piece => {
            const pos = piece.position;
            const size = 3;

            minX = Math.min(minX, pos.x - size);
            maxX = Math.max(maxX, pos.x + size);
            minZ = Math.min(minZ, pos.z - size);
            maxZ = Math.max(maxZ, pos.z + size);
        });

        const padding = 4;
        this.keyLight.shadow.camera.left = minX - padding;
        this.keyLight.shadow.camera.right = maxX + padding;
        this.keyLight.shadow.camera.top = 6;
        this.keyLight.shadow.camera.bottom = -6;
        this.keyLight.shadow.camera.updateProjectionMatrix();
    }

    render() {
        this.renderer.render(this.scene, this.camera);
    }

    getDelta() {
        return this.clock.getDelta();
    }
}
