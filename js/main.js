import * as THREE from 'three';
import { createTenonPiece, createMortisePiece } from './geometry.js';
import { Renderer } from './renderer.js';
import { PhysicsEngine } from './physics.js';
import { InteractionManager } from './interaction.js';

class App {
    constructor() {
        this.container = document.getElementById('canvas-container');
        this.statusText = document.getElementById('status-text');
        this.snapHint = document.getElementById('snap-hint');
        this.resetBtn = document.getElementById('reset-btn');

        this.renderer = new Renderer(this.container);
        this.physics = new PhysicsEngine();
        this.interaction = new InteractionManager(this.renderer, this.physics);

        this.tenonPiece = null;
        this.mortisePiece = null;
        this.highlightHelper = null;

        this._init();
    }

    _init() {
        this._createPieces();
        this._setupCallbacks();
        this._createHighlightHelper();
        this._setupUI();
        this._animate();
    }

    _createPieces() {
        this.tenonPiece = createTenonPiece();
        this.mortisePiece = createMortisePiece();

        this.renderer.addObject(this.tenonPiece);
        this.renderer.addObject(this.mortisePiece);

        this.physics.addPiece(this.tenonPiece);
        this.physics.addPiece(this.mortisePiece);
    }

    _setupCallbacks() {
        this.interaction.onSelectionChange = (piece) => {
            this._updateHighlight(piece);
        };

        this.interaction.onStatusUpdate = (status) => {
            this._updateStatus(status);
        };

        this.physics.setSnapCallback((piece, target) => {
            this._onSnap(piece, target);
        });

        this.physics.setUnSnapCallback((piece, target) => {
            this._onUnSnap(piece, target);
        });
    }

    _createHighlightHelper() {
        const boxGeo = new THREE.BoxGeometry(2.5, 2.5, 2.5);
        const edges = new THREE.EdgesGeometry(boxGeo);
        const lineMaterial = new THREE.LineBasicMaterial({
            color: 0xe8c57a,
            transparent: true,
            opacity: 0.8
        });
        this.highlightHelper = new THREE.LineSegments(edges, lineMaterial);
        this.highlightHelper.visible = false;
        this.renderer.addObject(this.highlightHelper);
    }

    _updateHighlight(piece) {
        if (piece) {
            this.highlightHelper.visible = true;
            this.highlightHelper.position.copy(piece.position);
            this.highlightHelper.rotation.copy(piece.rotation);
        } else {
            this.highlightHelper.visible = false;
        }
    }

    _updateStatus(status) {
        const statusText = document.getElementById('status-text');

        switch (status.status) {
            case 'snapped':
                statusText.textContent = '榫卯相扣 · 拼合完成';
                statusText.className = 'status-text snapped';
                break;
            case 'ready':
                statusText.textContent = `吸附就绪 · 距离: ${status.distance.toFixed(2)}`;
                statusText.className = 'status-text ready';
                break;
            case 'aligned':
                statusText.textContent = `方向已对准 · 继续移动`;
                statusText.className = 'status-text aligned';
                break;
            default:
                statusText.textContent = '请拖拽木块进行拼装';
                statusText.className = 'status-text';
        }
    }

    _onSnap(piece, target) {
        this.snapHint.classList.add('visible');
        setTimeout(() => {
            this.snapHint.classList.remove('visible');
        }, 1500);

        const statusText = document.getElementById('status-text');
        statusText.textContent = '榫卯相扣 · 拼合完成';
        statusText.className = 'status-text snapped';

        this.highlightHelper.visible = false;
    }

    _onUnSnap(piece, target) {
        const statusText = document.getElementById('status-text');
        statusText.textContent = '请拖拽木块进行拼装';
        statusText.className = 'status-text';
    }

    _setupUI() {
        this.resetBtn.addEventListener('click', () => {
            this._resetPieces();
        });
    }

    _resetPieces() {
        this.physics.releaseSnap(this.tenonPiece);
        this.physics.releaseSnap(this.mortisePiece);

        this.tenonPiece.position.copy(this.tenonPiece.userData.originalPosition);
        this.tenonPiece.rotation.copy(this.tenonPiece.userData.originalRotation);
        this.mortisePiece.position.copy(this.mortisePiece.userData.originalPosition);
        this.mortisePiece.rotation.copy(this.mortisePiece.userData.originalRotation);

        this.interaction.deselect();
        this.highlightHelper.visible = false;

        const statusText = document.getElementById('status-text');
        statusText.textContent = '请拖拽木块进行拼装';
        statusText.className = 'status-text';

        this.interaction.resetCamera();
    }

    _animate() {
        const delta = this.renderer.getDelta();

        this.physics.update(delta);

        if (this.interaction.selectedPiece && !this.interaction.selectedPiece.userData.snapped) {
            const status = this.physics.getAlignmentStatus(this.interaction.selectedPiece);
            this._updateStatus(status);
        }

        if (this.highlightHelper.visible) {
            this.highlightHelper.position.copy(this.interaction.selectedPiece.position);
            this.highlightHelper.rotation.copy(this.interaction.selectedPiece.rotation);
        }

        this.renderer.render();

        requestAnimationFrame(() => this._animate());
    }
}

window.addEventListener('DOMContentLoaded', () => {
    new App();
});
