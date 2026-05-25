import * as THREE from 'three';
import { Renderer } from './renderer.js';
import { PhysicsEngine } from './physics.js';

export class InteractionManager {
    constructor(renderer, physics) {
        this.renderer = renderer;
        this.physics = physics;
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        this.selectedPiece = null;
        this.isDragging = false;
        this.isOrbiting = false;
        this.dragPlane = new THREE.Plane();
        this.dragOffset = new THREE.Vector3();

        this.orbitTarget = new THREE.Vector3(0, 0, 0);
        this.orbitRadius = 15;
        this.orbitTheta = Math.PI / 4;
        this.orbitPhi = Math.PI / 3;

        this.rotationSpeed = 0.03;

        this.onSelectionChange = null;
        this.onStatusUpdate = null;

        this._initEventListeners();
        this._updateCameraOrbit();
    }

    _initEventListeners() {
        const canvas = this.renderer.renderer.domElement;

        canvas.addEventListener('mousedown', (e) => this._onMouseDown(e));
        canvas.addEventListener('mousemove', (e) => this._onMouseMove(e));
        canvas.addEventListener('mouseup', (e) => this._onMouseUp(e));
        canvas.addEventListener('wheel', (e) => this._onWheel(e), { passive: false });
        canvas.addEventListener('contextmenu', (e) => e.preventDefault());

        window.addEventListener('keydown', (e) => this._onKeyDown(e));
    }

    _onMouseDown(event) {
        if (event.button === 0) {
            this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
            this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

            this.raycaster.setFromCamera(this.mouse, this.renderer.camera);

            const allMeshes = [];
            for (const piece of this.physics.pieces) {
                piece.traverse((child) => {
                    if (child.isMesh) {
                        allMeshes.push(child);
                    }
                });
            }

            const intersects = this.raycaster.intersectObjects(allMeshes, false);

            if (intersects.length > 0) {
                let obj = intersects[0].object;
                while (obj.parent && !obj.userData.type) {
                    obj = obj.parent;
                }

                if (obj.userData.type) {
                    if (this.physics.snapAnimation) {
                        return;
                    }

                    if (obj.userData.snapped) {
                        this.physics.releaseSnap(obj);
                    }

                    this.selectedPiece = obj;
                    this.isDragging = true;

                    this.dragPlane.setFromNormalAndCoplanarPoint(
                        new THREE.Vector3(0, 1, 0),
                        this.selectedPiece.position
                    );

                    const intersection = new THREE.Vector3();
                    this.raycaster.ray.intersectPlane(this.dragPlane, intersection);
                    this.dragOffset.copy(intersection).sub(this.selectedPiece.position);

                    if (this.onSelectionChange) {
                        this.onSelectionChange(this.selectedPiece);
                    }
                }
            }
        } else if (event.button === 2) {
            this.isOrbiting = true;
        }
    }

    _onMouseMove(event) {
        if (this.isDragging && this.selectedPiece) {
            if (this.physics.snapAnimation) {
                this.isDragging = false;
                this.selectedPiece = null;
                if (this.onSelectionChange) {
                    this.onSelectionChange(null);
                }
                return;
            }

            this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
            this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

            this.raycaster.setFromCamera(this.mouse, this.renderer.camera);

            const intersection = new THREE.Vector3();
            if (this.raycaster.ray.intersectPlane(this.dragPlane, intersection)) {
                this.selectedPiece.position.copy(intersection.sub(this.dragOffset));

                const status = this.physics.getAlignmentStatus(this.selectedPiece);
                if (this.onStatusUpdate) {
                    this.onStatusUpdate(status);
                }

                const snapReady = this.physics.checkSnapReady(this.selectedPiece);
                if (snapReady) {
                    this.physics.performSnap(this.selectedPiece, snapReady.target, true);
                    this.isDragging = false;
                    this.selectedPiece = null;
                    if (this.onSelectionChange) {
                        this.onSelectionChange(null);
                    }
                }
            }
        } else if (this.isOrbiting) {
            const deltaX = event.movementX * 0.005;
            const deltaY = event.movementY * 0.005;

            this.orbitTheta += deltaX;
            this.orbitPhi = Math.max(0.1, Math.min(Math.PI / 2 - 0.1, this.orbitPhi + deltaY));

            this._updateCameraOrbit();
        }
    }

    _onMouseUp(event) {
        if (event.button === 0 && this.isDragging) {
            this.isDragging = false;
        } else if (event.button === 2) {
            this.isOrbiting = false;
        }
    }

    _onWheel(event) {
        event.preventDefault();
        const delta = event.deltaY * 0.01;
        this.orbitRadius = Math.max(5, Math.min(30, this.orbitRadius + delta));
        this._updateCameraOrbit();
    }

    _onKeyDown(event) {
        if (!this.selectedPiece) return;

        if (this.physics.snapAnimation) return;

        if (event.key === 'q' || event.key === 'Q') {
            this.selectedPiece.rotation.y += this.rotationSpeed;
        } else if (event.key === 'e' || event.key === 'E') {
            this.selectedPiece.rotation.y -= this.rotationSpeed;
        } else if (event.key === ' ') {
            event.preventDefault();
            if (this.selectedPiece.userData.snapped) {
                this.physics.releaseSnap(this.selectedPiece);
            }
            this.selectedPiece = null;
            this.isDragging = false;
            if (this.onSelectionChange) {
                this.onSelectionChange(null);
            }
        }

        if (this.selectedPiece && !this.selectedPiece.userData.snapped) {
            const status = this.physics.getAlignmentStatus(this.selectedPiece);
            if (this.onStatusUpdate) {
                this.onStatusUpdate(status);
            }

            const snapReady = this.physics.checkSnapReady(this.selectedPiece);
            if (snapReady) {
                this.physics.performSnap(this.selectedPiece, snapReady.target, true);
                this.selectedPiece = null;
                this.isDragging = false;
                if (this.onSelectionChange) {
                    this.onSelectionChange(null);
                }
            }
        }
    }

    _updateCameraOrbit() {
        this.renderer.updateCameraOrbit(
            this.orbitTarget,
            this.orbitRadius,
            this.orbitTheta,
            this.orbitPhi
        );
    }

    resetCamera() {
        this.orbitTarget.set(0, 0, 0);
        this.orbitRadius = 15;
        this.orbitTheta = Math.PI / 4;
        this.orbitPhi = Math.PI / 3;
        this._updateCameraOrbit();
    }

    deselect() {
        this.selectedPiece = null;
        this.isDragging = false;
    }
}
