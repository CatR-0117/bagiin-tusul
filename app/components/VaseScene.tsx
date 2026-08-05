"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

type VaseSceneProps = {
  color?: string;
  material?: "ceramic" | "metal" | "wood" | "plastic";
  roughness?: number;
  autoRotate?: boolean;
  progress?: number;
  className?: string;
  compact?: boolean;
  showGrid?: boolean;
};

const materialPresets = {
  ceramic: { roughness: 0.42, metalness: 0.02 },
  metal: { roughness: 0.2, metalness: 0.95 },
  wood: { roughness: 0.78, metalness: 0 },
  plastic: { roughness: 0.5, metalness: 0.04 },
};

function buildVaseGeometry(detail: number) {
  const profile: Array<[number, number]> = [
    [0.03, 0],
    [0.31, 0.01],
    [0.35, 0.07],
    [0.3, 0.15],
    [0.47, 0.34],
    [0.61, 0.68],
    [0.7, 1.08],
    [0.66, 1.45],
    [0.49, 1.76],
    [0.35, 1.92],
    [0.34, 2.05],
    [0.5, 2.1],
    [0.51, 2.18],
    [0.31, 2.21],
  ];

  const points = profile.map(([x, y]) => new THREE.Vector2(x, y));
  return new THREE.LatheGeometry(points, detail, 0, Math.PI * 2);
}

export default function VaseScene({
  color = "#e8e2d6",
  material = "ceramic",
  roughness,
  autoRotate = true,
  progress = 1,
  className,
  compact = false,
  showGrid = false,
}: VaseSceneProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const settingsRef = useRef({
    color,
    material,
    roughness,
    autoRotate,
    progress,
    showGrid,
  });

  useEffect(() => {
    settingsRef.current = {
      color,
      material,
      roughness,
      autoRotate,
      progress,
      showGrid,
    };
  }, [autoRotate, color, material, progress, roughness, showGrid]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(compact ? 38 : 32, 1, 0.1, 100);
    camera.position.set(0, compact ? 1.2 : 1.05, compact ? 4.6 : 4.15);

    const group = new THREE.Group();
    group.position.y = -1.08;
    group.rotation.y = -0.45;
    scene.add(group);

    const geometry = buildVaseGeometry(compact ? 64 : 96);
    geometry.computeVertexNormals();

    const initialSettings = settingsRef.current;
    const solidMaterial = new THREE.MeshStandardMaterial({
      color: initialSettings.color,
      roughness: materialPresets[initialSettings.material].roughness,
      metalness: materialPresets[initialSettings.material].metalness,
    });
    const solid = new THREE.Mesh(geometry, solidMaterial);
    solid.castShadow = true;
    solid.receiveShadow = true;
    group.add(solid);

    const wireMaterial = new THREE.MeshBasicMaterial({
      color: 0x8068ff,
      transparent: true,
      opacity: 0,
      wireframe: true,
    });
    const wire = new THREE.Mesh(geometry, wireMaterial);
    group.add(wire);

    const pointMaterial = new THREE.PointsMaterial({
      color: 0xc9ff63,
      size: compact ? 0.011 : 0.014,
      transparent: true,
      opacity: 0,
    });
    const points = new THREE.Points(geometry, pointMaterial);
    group.add(points);

    scene.add(new THREE.HemisphereLight(0xb8bdcf, 0x13141b, 1.25));

    const keyLight = new THREE.DirectionalLight(0xfff5e6, 3.1);
    keyLight.position.set(3.6, 4.2, 4.2);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    scene.add(keyLight);

    const rim = new THREE.DirectionalLight(0x8068ff, 2.8);
    rim.position.set(-4, 1.6, -2.4);
    scene.add(rim);

    const fill = new THREE.DirectionalLight(0xc9ff63, 0.5);
    fill.position.set(2.4, -1, 1.8);
    scene.add(fill);

    const floorMaterial = new THREE.ShadowMaterial({
      color: 0x000000,
      opacity: 0.34,
    });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(16, 16), floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -1.09;
    floor.receiveShadow = true;
    scene.add(floor);

    const grid = new THREE.GridHelper(12, 24, 0x333645, 0x252733);
    grid.position.y = -1.08;
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0.28;
    scene.add(grid);

    const pointer = {
      dragging: false,
      x: 0,
      y: 0,
      targetYaw: -0.45,
      targetPitch: 0,
    };

    const onPointerDown = (event: PointerEvent) => {
      pointer.dragging = true;
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      canvas.setPointerCapture?.(event.pointerId);
    };
    const onPointerMove = (event: PointerEvent) => {
      if (!pointer.dragging) return;
      pointer.targetYaw += (event.clientX - pointer.x) * 0.008;
      pointer.targetPitch = THREE.MathUtils.clamp(
        pointer.targetPitch + (event.clientY - pointer.y) * 0.004,
        -0.35,
        0.35,
      );
      pointer.x = event.clientX;
      pointer.y = event.clientY;
    };
    const onPointerUp = () => {
      pointer.dragging = false;
    };

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointercancel", onPointerUp);

    const resize = () => {
      const width = Math.max(1, canvas.clientWidth);
      const height = Math.max(1, canvas.clientHeight);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    resize();

    let frame = 0;
    const clock = new THREE.Clock();
    const render = () => {
      const delta = Math.min(clock.getDelta(), 0.04);
      const settings = settingsRef.current;
      const preset = materialPresets[settings.material];

      solidMaterial.color.set(settings.color);
      solidMaterial.metalness = preset.metalness;
      solidMaterial.roughness =
        settings.roughness === undefined
          ? preset.roughness
          : THREE.MathUtils.clamp(settings.roughness / 100, 0.06, 1);
      solidMaterial.needsUpdate = true;

      const p = THREE.MathUtils.clamp(settings.progress, 0, 1);
      pointMaterial.opacity = THREE.MathUtils.clamp(1 - p * 3, 0, 0.92);
      wireMaterial.opacity = THREE.MathUtils.clamp(1.25 - Math.abs(p - 0.42) * 3, 0, 0.68);
      solidMaterial.opacity = THREE.MathUtils.smoothstep(p, 0.35, 0.82);
      solidMaterial.transparent = solidMaterial.opacity < 0.999;
      grid.visible = settings.showGrid;

      if (settings.autoRotate && !pointer.dragging) {
        pointer.targetYaw += delta * 0.24;
      }
      group.rotation.y += (pointer.targetYaw - group.rotation.y) * 0.075;
      group.rotation.x += (pointer.targetPitch - group.rotation.x) * 0.075;

      renderer.render(scene, camera);
      frame = requestAnimationFrame(render);
    };
    render();

    return () => {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerUp);
      geometry.dispose();
      solidMaterial.dispose();
      wireMaterial.dispose();
      pointMaterial.dispose();
      floor.geometry.dispose();
      floorMaterial.dispose();
      grid.geometry.dispose();
      (grid.material as THREE.Material).dispose();
      renderer.dispose();
    };
  }, [compact]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      aria-label="Эргүүлж харах боломжтой 3D ваар"
    />
  );
}
