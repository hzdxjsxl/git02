import { useEffect, useRef, useMemo, useCallback } from 'react';
import * as THREE from 'three';
import { useMuscleStore, MuscleTension } from '../store/muscleStore';
import muscleVertexShader from '../shaders/muscle.vert.glsl';
import muscleFragmentShader from '../shaders/muscle.frag.glsl';
import skeletonVertexShader from '../shaders/skeleton.vert.glsl';
import skeletonFragmentShader from '../shaders/skeleton.frag.glsl';

interface MuscleInfo {
  name: keyof MuscleTension;
  geometry: THREE.BufferGeometry;
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
  maxInflate: number;
}

const LIGHT_DIR_1 = new THREE.Vector3(0.5, 1.0, 0.8).normalize();
const LIGHT_DIR_2 = new THREE.Vector3(-0.5, 0.8, -0.5).normalize();
const LIGHT_COLOR_1 = new THREE.Color(0xffffff);
const LIGHT_COLOR_2 = new THREE.Color(0x6688ff);

export default function HumanModel() {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const animationIdRef = useRef<number>(0);
  const muscleMaterialsRef = useRef<Map<keyof MuscleTension, THREE.ShaderMaterial>>(new Map());
  const skeletonMaterialsRef = useRef<THREE.ShaderMaterial[]>([]);
  const skeletonGroupRef = useRef<THREE.Group | null>(null);
  const muscleGroupRef = useRef<THREE.Group | null>(null);
  const timeRef = useRef<number>(0);
  const tensionsRef = useRef<MuscleTension>({
    chest: 0.3,
    back: 0.3,
    leftArm: 0.2,
    rightArm: 0.2,
    leftLeg: 0.2,
    rightLeg: 0.2,
    abdomen: 0.1,
    shoulder: 0.2,
  });
  const autoAnimateRef = useRef(false);

  const storeTensions = useMuscleStore((state) => state.tensions);
  const autoAnimate = useMuscleStore((state) => state.autoAnimate);
  const showSkeleton = useMuscleStore((state) => state.showSkeleton);
  const showMuscles = useMuscleStore((state) => state.showMuscles);

  useEffect(() => {
    tensionsRef.current = storeTensions;
  }, [storeTensions]);

  useEffect(() => {
    autoAnimateRef.current = autoAnimate;
  }, [autoAnimate]);

  const muscleInfos = useMemo<MuscleInfo[]>(() => [
    {
      name: 'chest',
      geometry: new THREE.SphereGeometry(0.3, 32, 32),
      position: [0, 1.35, 0.15],
      scale: [1, 0.75, 0.5],
      maxInflate: 0.04,
    },
    {
      name: 'back',
      geometry: new THREE.SphereGeometry(0.3, 32, 32),
      position: [0, 1.35, -0.15],
      scale: [0.95, 0.85, 0.45],
      maxInflate: 0.04,
    },
    {
      name: 'leftArm',
      geometry: new THREE.CapsuleGeometry(0.07, 0.45, 8, 16),
      position: [-0.52, 1.0, 0],
      rotation: [0, 0, 0.25],
      maxInflate: 0.025,
    },
    {
      name: 'rightArm',
      geometry: new THREE.CapsuleGeometry(0.07, 0.45, 8, 16),
      position: [0.52, 1.0, 0],
      rotation: [0, 0, -0.25],
      maxInflate: 0.025,
    },
    {
      name: 'leftLeg',
      geometry: new THREE.CapsuleGeometry(0.1, 0.65, 8, 16),
      position: [-0.18, 0.15, 0],
      maxInflate: 0.03,
    },
    {
      name: 'rightLeg',
      geometry: new THREE.CapsuleGeometry(0.1, 0.65, 8, 16),
      position: [0.18, 0.15, 0],
      maxInflate: 0.03,
    },
    {
      name: 'abdomen',
      geometry: new THREE.SphereGeometry(0.22, 32, 32),
      position: [0, 0.95, 0.1],
      scale: [0.75, 0.55, 0.45],
      maxInflate: 0.02,
    },
    {
      name: 'shoulder',
      geometry: new THREE.TorusGeometry(0.28, 0.06, 16, 32),
      position: [0, 1.55, 0],
      rotation: [Math.PI / 2, 0, 0],
      maxInflate: 0.02,
    },
  ], []);

  const initScene = useCallback(() => {
    if (!containerRef.current) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0d1117);
    scene.fog = new THREE.Fog(0x0d1117, 5, 15);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      50,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      100
    );
    camera.position.set(0, 1.2, 3.5);
    camera.lookAt(0, 1, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 1);
    mainLight.position.set(5, 10, 5);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 2048;
    mainLight.shadow.mapSize.height = 2048;
    scene.add(mainLight);

    const rimLight = new THREE.DirectionalLight(0x4488ff, 0.3);
    rimLight.position.set(-5, 5, -5);
    scene.add(rimLight);

    const gridHelper = new THREE.GridHelper(4, 20, 0x1a2332, 0x1a2332);
    gridHelper.position.y = -0.5;
    scene.add(gridHelper);

    const skeletonGroup = new THREE.Group();
    skeletonGroupRef.current = skeletonGroup;
    const createBoneMaterial = () => {
      const mat = new THREE.ShaderMaterial({
        vertexShader: skeletonVertexShader,
        fragmentShader: skeletonFragmentShader,
        uniforms: {
          uTime: { value: 0 },
          uBoneColor: { value: new THREE.Color(0x8899aa) },
          uOpacity: { value: 0.6 },
        },
        transparent: true,
      });
      skeletonMaterialsRef.current.push(mat);
      return mat;
    };

    const spineGeometry = new THREE.CylinderGeometry(0.04, 0.05, 1.2, 8);
    const spine = new THREE.Mesh(spineGeometry, createBoneMaterial());
    spine.position.set(0, 1.0, 0);
    spine.castShadow = true;
    skeletonGroup.add(spine);

    const headGeometry = new THREE.SphereGeometry(0.15, 16, 16);
    const head = new THREE.Mesh(headGeometry, createBoneMaterial());
    head.position.set(0, 1.8, 0);
    head.castShadow = true;
    skeletonGroup.add(head);

    const pelvisGeometry = new THREE.BoxGeometry(0.5, 0.1, 0.3);
    const pelvis = new THREE.Mesh(pelvisGeometry, createBoneMaterial());
    pelvis.position.set(0, 0.4, 0);
    pelvis.castShadow = true;
    skeletonGroup.add(pelvis);

    const upperArmGeometry = new THREE.CylinderGeometry(0.03, 0.03, 0.5, 6);
    const leftUpperArm = new THREE.Mesh(upperArmGeometry, createBoneMaterial());
    leftUpperArm.position.set(-0.45, 1.1, 0);
    leftUpperArm.rotation.z = 0.3;
    leftUpperArm.castShadow = true;
    skeletonGroup.add(leftUpperArm);

    const rightUpperArm = new THREE.Mesh(upperArmGeometry, createBoneMaterial());
    rightUpperArm.position.set(0.45, 1.1, 0);
    rightUpperArm.rotation.z = -0.3;
    rightUpperArm.castShadow = true;
    skeletonGroup.add(rightUpperArm);

    const lowerArmGeometry = new THREE.CylinderGeometry(0.025, 0.025, 0.4, 6);
    const leftLowerArm = new THREE.Mesh(lowerArmGeometry, createBoneMaterial());
    leftLowerArm.position.set(-0.65, 0.75, 0);
    leftLowerArm.castShadow = true;
    skeletonGroup.add(leftLowerArm);

    const rightLowerArm = new THREE.Mesh(lowerArmGeometry, createBoneMaterial());
    rightLowerArm.position.set(0.65, 0.75, 0);
    rightLowerArm.castShadow = true;
    skeletonGroup.add(rightLowerArm);

    const upperLegGeometry = new THREE.CylinderGeometry(0.05, 0.05, 0.6, 8);
    const leftUpperLeg = new THREE.Mesh(upperLegGeometry, createBoneMaterial());
    leftUpperLeg.position.set(-0.2, 0.0, 0);
    leftUpperLeg.castShadow = true;
    skeletonGroup.add(leftUpperLeg);

    const rightUpperLeg = new THREE.Mesh(upperLegGeometry, createBoneMaterial());
    rightUpperLeg.position.set(0.2, 0.0, 0);
    rightUpperLeg.castShadow = true;
    skeletonGroup.add(rightUpperLeg);

    const lowerLegGeometry = new THREE.CylinderGeometry(0.04, 0.04, 0.5, 8);
    const leftLowerLeg = new THREE.Mesh(lowerLegGeometry, createBoneMaterial());
    leftLowerLeg.position.set(-0.2, -0.55, 0);
    leftLowerLeg.castShadow = true;
    skeletonGroup.add(leftLowerLeg);

    const rightLowerLeg = new THREE.Mesh(lowerLegGeometry, createBoneMaterial());
    rightLowerLeg.position.set(0.2, -0.55, 0);
    rightLowerLeg.castShadow = true;
    skeletonGroup.add(rightLowerLeg);

    const ribsGeometry = new THREE.CylinderGeometry(0.2, 0.25, 0.6, 12, 1, true);
    const ribs = new THREE.Mesh(ribsGeometry, createBoneMaterial());
    ribs.position.set(0, 1.2, 0);
    ribs.castShadow = true;
    skeletonGroup.add(ribs);

    scene.add(skeletonGroup);

    const muscleGroup = new THREE.Group();
    muscleGroupRef.current = muscleGroup;
    muscleInfos.forEach((info) => {
      const material = new THREE.ShaderMaterial({
        vertexShader: muscleVertexShader,
        fragmentShader: muscleFragmentShader,
        uniforms: {
          uTime: { value: 0 },
          uTension: { value: 0.3 },
          uMaxInflate: { value: info.maxInflate },
          uBaseColor: { value: new THREE.Color(0xcc8866) },
          uTensionColor: { value: new THREE.Color(0xff4444) },
          uLightDir1: { value: LIGHT_DIR_1.clone() },
          uLightDir2: { value: LIGHT_DIR_2.clone() },
          uLightColor1: { value: LIGHT_COLOR_1.clone() },
          uLightColor2: { value: LIGHT_COLOR_2.clone() },
          uAmbientIntensity: { value: 0.25 },
          uShininess: { value: 32.0 },
        },
      });

      const mesh = new THREE.Mesh(info.geometry, material);
      mesh.position.set(...info.position);
      if (info.rotation) {
        mesh.rotation.set(...info.rotation);
      }
      if (info.scale) {
        mesh.scale.set(...info.scale);
      }
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      muscleGroup.add(mesh);
      muscleMaterialsRef.current.set(info.name, material);
    });

    scene.add(muscleGroup);

    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };
    let cameraAngleY = 0;
    let cameraAngleX = 0;
    let cameraDistance = 3.5;
    let autoRotateAngle = 0;

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;

      const deltaX = e.clientX - previousMousePosition.x;
      const deltaY = e.clientY - previousMousePosition.y;

      cameraAngleY += deltaX * 0.01;
      cameraAngleX += deltaY * 0.01;
      cameraAngleX = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, cameraAngleX));

      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    const onWheel = (e: WheelEvent) => {
      cameraDistance += e.deltaY * 0.003;
      cameraDistance = Math.max(2, Math.min(6, cameraDistance));
    };

    renderer.domElement.addEventListener('mousedown', onMouseDown);
    renderer.domElement.addEventListener('mousemove', onMouseMove);
    renderer.domElement.addEventListener('mouseup', onMouseUp);
    renderer.domElement.addEventListener('mouseleave', onMouseUp);
    renderer.domElement.addEventListener('wheel', onWheel);

    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);

      timeRef.current += 0.016;

      if (autoAnimateRef.current && !isDragging) {
        autoRotateAngle += 0.005;
      }

      const finalAngleY = cameraAngleY + autoRotateAngle;
      camera.position.x = cameraDistance * Math.sin(finalAngleY) * Math.cos(cameraAngleX);
      camera.position.y = 1.2 + cameraDistance * Math.sin(cameraAngleX);
      camera.position.z = cameraDistance * Math.cos(finalAngleY) * Math.cos(cameraAngleX);
      camera.lookAt(0, 1, 0);

      const currentTensions = tensionsRef.current;
      muscleMaterialsRef.current.forEach((material, name) => {
        material.uniforms.uTime.value = timeRef.current;
        material.uniforms.uTension.value = currentTensions[name] || 0;
      });

      skeletonMaterialsRef.current.forEach((mat) => {
        mat.uniforms.uTime.value = timeRef.current;
      });

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!containerRef.current) return;
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationIdRef.current);
      renderer.domElement.removeEventListener('mousedown', onMouseDown);
      renderer.domElement.removeEventListener('mousemove', onMouseMove);
      renderer.domElement.removeEventListener('mouseup', onMouseUp);
      renderer.domElement.removeEventListener('mouseleave', onMouseUp);
      renderer.domElement.removeEventListener('wheel', onWheel);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
    };
  }, [muscleInfos]);

  useEffect(() => {
    const cleanup = initScene();
    return () => {
      if (cleanup) cleanup();
    };
  }, [initScene]);

  useEffect(() => {
    if (skeletonGroupRef.current) {
      skeletonGroupRef.current.visible = showSkeleton;
    }
  }, [showSkeleton]);

  useEffect(() => {
    if (muscleGroupRef.current) {
      muscleGroupRef.current.visible = showMuscles;
    }
  }, [showMuscles]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full cursor-grab active:cursor-grabbing"
    />
  );
}
