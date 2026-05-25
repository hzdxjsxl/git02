import * as THREE from 'three';
import { getWorldConnectPoint, getWorldConnectDirection, TOLERANCE, SNAP_DISTANCE, TENON_SIZE, BLOCK_SIZE } from './geometry.js';

const ANGLE_THRESHOLD = 0.087;
const DOT_THRESHOLD = 0.996;

export class PhysicsEngine {
    constructor() {
        this.pieces = [];
        this.snapAnimation = null;
        this.onSnapCallback = null;
        this.onAlignCallback = null;
        this.onUnSnapCallback = null;
        this.debugLines = null;
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

            const axisLine = new THREE.Vector3().subVectors(otherPoint, piecePoint).normalize();

            const pieceAxisDot = Math.abs(pieceDir.dot(axisLine));
            const otherAxisDot = Math.abs(otherDir.dot(axisLine));

            const facingDot = pieceDir.dot(otherDir);

            const axisAligned = pieceAxisDot > DOT_THRESHOLD && otherAxisDot > DOT_THRESHOLD;

            const facingEachOther = facingDot < -0.95;

            const eulerPiece = new THREE.Euler().setFromQuaternion(piece.quaternion, 'YXZ');
            const eulerOther = new THREE.Euler().setFromQuaternion(other.quaternion, 'YXZ');

            const yawDiff = Math.abs(
                this._normalizeAngle(eulerPiece.y) - this._normalizeAngle(eulerOther.y)
            );
            const pitchDiff = Math.abs(
                this._normalizeAngle(eulerPiece.x) - this._normalizeAngle(eulerOther.x)
            );
            const rollDiff = Math.abs(
                this._normalizeAngle(eulerPiece.z) - this._normalizeAngle(eulerOther.z)
            );

            const rotationAligned =
                yawDiff < ANGLE_THRESHOLD &&
                pitchDiff < ANGLE_THRESHOLD &&
                rollDiff < ANGLE_THRESHOLD;

            const tenonLength = TENON_SIZE.depth;
            const maxSnapDistance = tenonLength * 1.5;

            const closeEnough = distance < maxSnapDistance;

            const canSnap = axisAligned && facingEachOther && rotationAligned && closeEnough;

            if (canSnap) {
                return {
                    target: other,
                    distance: distance,
                    facingDot: facingDot,
                    axisAligned: axisAligned,
                    facingEachOther: facingEachOther,
                    rotationAligned: rotationAligned
                };
            }
        }

        return null;
    }

    _normalizeAngle(angle) {
        let normalized = angle % (Math.PI * 2);
        if (normalized > Math.PI) normalized -= Math.PI * 2;
        if (normalized < -Math.PI) normalized += Math.PI * 2;
        return normalized;
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

        const targetEuler = new THREE.Euler().setFromQuaternion(target.quaternion, 'YXZ');
        targetEuler.y += Math.PI;
        const finalQuat = new THREE.Quaternion().setFromEuler(targetEuler);

        const startPos = piece.position.clone();

        if (animate) {
            this.snapAnimation = {
                piece: piece,
                target: target,
                startPos: startPos,
                endPos: targetPosition,
                startQuat: currentQuat,
                endQuat: finalQuat,
                progress: 0,
                duration: 0.6,
                phase: 'locking'
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

        if (!piece.userData.snapGroup) {
            const snapGroup = new THREE.Group();
            snapGroup.name = 'snap-group';

            piece.userData.snapGroup = snapGroup;
            target.userData.snapGroup = snapGroup;

            piece.userData.groupOffset = piece.position.clone();
            target.userData.groupOffset = target.position.clone();
        }
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

        if (piece.userData.snapGroup) {
            piece.userData.snapGroup = null;
            target.userData.snapGroup = null;
        }

        if (this.onUnSnapCallback) {
            this.onUnSnapCallback(piece, target);
        }
    }

    update(deltaTime) {
        if (this.snapAnimation) {
            const anim = this.snapAnimation;
            anim.progress += deltaTime / anim.duration;

            if (anim.phase === 'locking') {
                const t = Math.min(anim.progress * 2.5, 1);
                const easedT = this._easeOutCubic(t);

                anim.piece.quaternion.slerpQuaternions(anim.startQuat, anim.endQuat, easedT);

                if (anim.progress >= 0.35) {
                    anim.phase = 'sliding';
                    anim.slideStartPos = anim.piece.position.clone();
                }
            } else if (anim.phase === 'sliding') {
                const slideProgress = Math.min((anim.progress - 0.35) / 0.65, 1);
                const easedSlide = this._easeInOutCubic(slideProgress);

                anim.piece.position.lerpVectors(anim.slideStartPos, anim.endPos, easedSlide);

                if (anim.progress >= 1) {
                    anim.piece.position.copy(anim.endPos);
                    anim.piece.quaternion.copy(anim.endQuat);
                    this._completeSnap(anim.piece, anim.target);
                    this.snapAnimation = null;
                }
            }
        }
    }

    _easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
    }

    _easeInOutCubic(t) {
        return t < 0.5
            ? 4 * t * t * t
            : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    getAlignmentStatus(piece) {
        if (piece.userData.snapped) {
            return { status: 'snapped', distance: 0, angle: 0, target: piece.userData.snapTarget };
        }

        const alignment = this.checkAlignment(piece);
        if (!alignment) return { status: 'none', distance: Infinity, angle: 0 };

        const pieceDir = getWorldConnectDirection(piece);
        const targetDir = getWorldConnectDirection(alignment.target);
        const angle = Math.acos(Math.abs(pieceDir.dot(targetDir))) * (180 / Math.PI);

        let status = 'far';
        if (alignment.axisAligned && alignment.facingEachOther) {
            status = 'aligned';
        }
        if (alignment.rotationAligned && alignment.distance < SNAP_DISTANCE * 2) {
            status = 'ready';
        }

        return {
            status: status,
            distance: alignment.distance,
            angle: angle,
            target: alignment.target
        };
    }
}
