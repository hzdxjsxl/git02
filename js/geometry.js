import * as THREE from 'three';

export const BLOCK_SIZE = {
    width: 2.0,
    height: 2.0,
    depth: 2.0
};

export const TENON_SIZE = {
    width: 0.8,
    height: 0.8,
    depth: 0.6
};

export const TOLERANCE = {
    position: 0.5,
    rotation: 0.35
};

export const SNAP_DISTANCE = 0.5;

export function createTenonPiece() {
    const group = new THREE.Group();
    group.name = 'tenon-piece';
    group.userData.type = 'tenon';
    group.userData.snapped = false;
    group.userData.originalPosition = new THREE.Vector3(-3, 0, 0);
    group.userData.originalRotation = new THREE.Euler(0, 0, 0);

    const mainGeo = new THREE.BoxGeometry(
        BLOCK_SIZE.width,
        BLOCK_SIZE.height,
        BLOCK_SIZE.depth
    );

    const tenonGeo = new THREE.BoxGeometry(
        TENON_SIZE.width,
        TENON_SIZE.height,
        TENON_SIZE.depth
    );

    const material = new THREE.MeshStandardMaterial({
        color: 0xa0522d,
        roughness: 0.85,
        metalness: 0.05
    });

    const mainBlock = new THREE.Mesh(mainGeo, material.clone());
    mainBlock.name = 'main-body';
    mainBlock.castShadow = true;
    mainBlock.receiveShadow = true;
    group.add(mainBlock);

    const tenon = new THREE.Mesh(tenonGeo, material.clone());
    tenon.name = 'tenon-protrusion';
    tenon.position.x = BLOCK_SIZE.width / 2 + TENON_SIZE.depth / 2;
    tenon.castShadow = true;
    tenon.receiveShadow = true;
    group.add(tenon);

    group.userData.connectPoint = new THREE.Vector3(
        BLOCK_SIZE.width / 2 + TENON_SIZE.depth,
        0,
        0
    );

    group.userData.connectDirection = new THREE.Vector3(1, 0, 0);

    group.userData.originalPosition = new THREE.Vector3(-3, 0, 0);
    group.position.copy(group.userData.originalPosition);

    return group;
}

export function createMortisePiece() {
    const group = new THREE.Group();
    group.name = 'mortise-piece';
    group.userData.type = 'mortise';
    group.userData.snapped = false;
    group.userData.originalPosition = new THREE.Vector3(3, 0, 0);
    group.userData.originalRotation = new THREE.Euler(0, 0, 0);

    const frontWallGeo = new THREE.BoxGeometry(
        0.3,
        BLOCK_SIZE.height,
        (BLOCK_SIZE.depth - TENON_SIZE.width) / 2
    );

    const backWallGeo = new THREE.BoxGeometry(
        0.3,
        BLOCK_SIZE.height,
        (BLOCK_SIZE.depth - TENON_SIZE.width) / 2
    );

    const topWallGeo = new THREE.BoxGeometry(
        0.3,
        (BLOCK_SIZE.height - TENON_SIZE.height) / 2,
        TENON_SIZE.width + 0.6
    );

    const bottomWallGeo = new THREE.BoxGeometry(
        0.3,
        (BLOCK_SIZE.height - TENON_SIZE.height) / 2,
        TENON_SIZE.width + 0.6
    );

    const leftPartGeo = new THREE.BoxGeometry(
        BLOCK_SIZE.width,
        BLOCK_SIZE.height,
        BLOCK_SIZE.depth
    );

    const holeFrontGeo = new THREE.BoxGeometry(
        TENON_SIZE.depth + 0.1,
        TENON_SIZE.height + 0.05,
        TENON_SIZE.width + 0.05
    );

    const wallMaterial = new THREE.MeshStandardMaterial({
        color: 0x8b4513,
        roughness: 0.85,
        metalness: 0.05
    });

    const holeMaterial = new THREE.MeshStandardMaterial({
        color: 0x3d2817,
        roughness: 0.9,
        metalness: 0.0,
        side: THREE.DoubleSide
    });

    const leftPart = new THREE.Mesh(leftPartGeo, wallMaterial.clone());
    leftPart.name = 'left-part';
    leftPart.position.x = 0;
    leftPart.castShadow = true;
    leftPart.receiveShadow = true;
    group.add(leftPart);

    const frontWall = new THREE.Mesh(frontWallGeo, wallMaterial.clone());
    frontWall.name = 'front-wall';
    frontWall.position.x = -BLOCK_SIZE.width / 2 - 0.15;
    frontWall.position.z = -(TENON_SIZE.width / 2 + (BLOCK_SIZE.depth - TENON_SIZE.width) / 4);
    frontWall.castShadow = true;
    frontWall.receiveShadow = true;
    group.add(frontWall);

    const backWall = new THREE.Mesh(backWallGeo, wallMaterial.clone());
    backWall.name = 'back-wall';
    backWall.position.x = -BLOCK_SIZE.width / 2 - 0.15;
    backWall.position.z = TENON_SIZE.width / 2 + (BLOCK_SIZE.depth - TENON_SIZE.width) / 4;
    backWall.castShadow = true;
    backWall.receiveShadow = true;
    group.add(backWall);

    const topWall = new THREE.Mesh(topWallGeo, wallMaterial.clone());
    topWall.name = 'top-wall';
    topWall.position.x = -BLOCK_SIZE.width / 2 - 0.15;
    topWall.position.y = TENON_SIZE.height / 2 + (BLOCK_SIZE.height - TENON_SIZE.height) / 4;
    topWall.castShadow = true;
    topWall.receiveShadow = true;
    group.add(topWall);

    const bottomWall = new THREE.Mesh(bottomWallGeo, wallMaterial.clone());
    bottomWall.name = 'bottom-wall';
    bottomWall.position.x = -BLOCK_SIZE.width / 2 - 0.15;
    bottomWall.position.y = -(TENON_SIZE.height / 2 + (BLOCK_SIZE.height - TENON_SIZE.height) / 4);
    bottomWall.castShadow = true;
    bottomWall.receiveShadow = true;
    group.add(bottomWall);

    const holeFront = new THREE.Mesh(holeFrontGeo, holeMaterial);
    holeFront.name = 'hole-front';
    holeFront.position.x = -BLOCK_SIZE.width / 2 - 0.15;
    holeFront.castShadow = true;
    holeFront.receiveShadow = true;
    group.add(holeFront);

    group.userData.connectPoint = new THREE.Vector3(
        -BLOCK_SIZE.width / 2 + 0.1,
        0,
        0
    );

    group.userData.connectDirection = new THREE.Vector3(-1, 0, 0);

    group.position.copy(group.userData.originalPosition);

    return group;
}

export function getWorldConnectPoint(piece) {
    const point = piece.userData.connectPoint.clone();
    return piece.localToWorld(point);
}

export function getWorldConnectDirection(piece) {
    const dir = piece.userData.connectDirection.clone();
    dir.applyQuaternion(piece.quaternion);
    return dir.normalize();
}
