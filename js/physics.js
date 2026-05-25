import * as THREE from 'three';
import { getWorldConnectPoint, getWorldConnectDirection, TOLERANCE, SNAP_DISTANCE } from './geometry.js';

export class PhysicsEngine {
    constructor() {
        this.pieces = [];
        this.snapAnimation = null;
        this.onSnapCallback = null;
        this.onAlignCallback = null;
        this.onUnSnapCallback = null;
    }

    addPiece(piece) {
        this.pieces.push(piece);
    }

    removePiece(piece) {
        const index = this.pieces.indexOf(piece);
        if (index !== -1) {
            this.pieces.splice(index, 1);
        }
    }

    setSnapCallback(callback) {
        this.onSnapCallback = callback;
    }

    setAlignCallback(callback) {
        this.onAlignCallback = callback;
    }

    setUnSnapCallback(callback) {
        this.onUnSnapCallback = callback;
    }

    checkAlignment(piece) {
        if (piece.userData.snapped) return null;

        const piecePoint = getWorldConnectPoint(piece);
        const pieceDir = getWorldConnectDirection(piece);

        for (const other of this.pieces) {
            if (other === piece) continue;

            const otherPoint = getWorldConnectPoint(other);
            const otherDir = getWorldConnectDirection(other);

            const distance = piecePoint.distanceTo(otherPoint);
            const directionDot = pieceDir.dot(otherDir);

            if (distance < TOLERANCE.position && directionDot < -0.8) {
                return {
                    target: other,
                    distance: distance,
                    dot: directionDot
                };
            }
        }

        return null;
    }

    checkSnapReady(piece) {
        const alignment = this.checkAlignment(piece);
        if (!alignment) return null;

        if (alignment.distance < SNAP_DISTANCE) {
            return alignment;
        }

        return null;
    }

    performSnap(piece, target, animate = true) {
        const piecePoint = getWorldConnectPoint(piece);
        const targetPoint = getWorldConnectPoint(target);

        const pieceDir = getWorldConnectDirection(piece);
        const targetDir = getWorldConnectDirection(target);

        const offset = new THREE.Vector3().subVectors(piecePoint, piece.position);

        const targetPosition = targetPoint.clone().sub(offset);

        const currentQuat = piece.quaternion.clone();

        const rotationQuat = new THREE.Quaternion().setFromAxisAngle(
            new THREE.Vector3(0, 1, 0),
            Math.PI
        );
        const finalQuat = target.quaternion.clone().multiply(rotationQuat);

        const startPos = piece.position.clone();

        if (animate) {
            this.snapAnimation = {
                piece: piece,
                startPos: startPos,
                endPos: targetPosition,
                startQuat: currentQuat,
                endQuat: finalQuat,
                progress: 0,
                duration: 0.3,
                target: target
            };
        } else {
            piece.position.copy(targetPosition);
            piece.quaternion.copy(finalQuat);
            this._completeSnap(piece, target);
        }

        if (this.onSnapCallback) {
            this.onSnapCallback(piece, target);
        }
    }

    _completeSnap(piece, target) {
        piece.userData.snapped = true;
        target.userData.snapped = true;
        piece.userData.snapTarget = target;
        target.userData.snapTarget = piece;
    }

    releaseSnap(piece) {
        if (!piece.userData.snapped) return;

        const target = piece.userData.snapTarget;
        piece.userData.snapped = false;
        piece.userData.snapTarget = null;

        if (target) {
            target.userData.snapped = false;
            target.userData.snapTarget = null;
        }

        if (this.onUnSnapCallback) {
            this.onUnSnapCallback(piece, target);
        }
    }

    update(deltaTime) {
        if (this.snapAnimation) {
            const anim = this.snapAnimation;
            anim.progress += deltaTime / anim.duration;

            if (anim.progress >= 1) {
                anim.progress = 1;
                this._completeSnap(anim.piece, anim.target);
                this.snapAnimation = null;
            }

            const t = this._easeOutCubic(anim.progress);
            anim.piece.position.lerpVectors(anim.startPos, anim.endPos, t);
            anim.piece.quaternion.slerpQuaternions(anim.startQuat, anim.endQuat, t);
        }
    }

    _easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
    }

    getAlignmentStatus(piece) {
        const alignment = this.checkAlignment(piece);
        if (!alignment) return { status: 'none', distance: Infinity, angle: 0 };

        const pieceDir = getWorldConnectDirection(piece);
        const targetDir = getWorldConnectDirection(alignment.target);
        const angle = Math.acos(Math.abs(pieceDir.dot(targetDir))) * (180 / Math.PI);

        let status = 'far';
        if (alignment.distance < TOLERANCE.position) {
            status = 'aligned';
        }
        if (alignment.distance < SNAP_DISTANCE) {
            status = 'ready';
        }
        if (piece.userData.snapped) {
            status = 'snapped';
        }

        return {
            status: status,
            distance: alignment.distance,
            angle: angle,
            target: alignment.target
        };
    }
}
