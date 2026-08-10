"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

type VaseSceneProps = {
  color?: string;
  material?: "ceramic" | "metal" | "wood" | "plastic";
  roughness?: number;
  autoRotate?: boolean;
  progress?: number;
  className?: string;
  compact?: boolean;
  showGrid?: boolean;
  distance?: number;
  cameraY?: number;
  scale?: number;
  /** AR жишээнд камер, сүүдэр, хэмжээг өрөөний шалтай нийцүүлнэ. */
  presentation?: "studio" | "ar";
  /**
   * Зөвхөн нэг кадр зураад зогсоно (thumbnail-д).
   * Хөдөлгөөнгүй жижиг зургийн төлөө rAF-ыг тасралтгүй эргүүлэх нь
   * утасны батерейг дэмий зарцуулна.
   */
  still?: boolean;
  /** Хулгана/хуруугаар эргүүлэх, ойртуулах боломж */
  interactive?: boolean;
  label?: string;
};

const materialPresets = {
  ceramic: { roughness: 0.3, metalness: 0.01, clearcoat: 0.46 },
  metal: { roughness: 0.2, metalness: 0.95, clearcoat: 0.08 },
  wood: { roughness: 0.72, metalness: 0, clearcoat: 0.04 },
  plastic: { roughness: 0.42, metalness: 0.02, clearcoat: 0.3 },
};

/** Давтагддаг, маш зөөлөн керамик ширхэглэл. Сүлжээний texture шаарддаггүй. */
function buildCeramicTexture(renderer: THREE.WebGLRenderer) {
  const surface = document.createElement("canvas");
  surface.width = 384;
  surface.height = 384;
  const context = surface.getContext("2d");
  if (!context) return null;

  context.fillStyle = "#f5f2ed";
  context.fillRect(0, 0, surface.width, surface.height);

  let seed = 1847;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  for (let index = 0; index < 1050; index += 1) {
    const x = random() * surface.width;
    const y = random() * surface.height;
    const radius = 0.28 + random() * 0.86;
    const shade = 112 + Math.round(random() * 46);
    context.beginPath();
    context.fillStyle = `rgba(${shade}, ${shade - 5}, ${shade + 4}, ${0.045 + random() * 0.1})`;
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
  }

  const texture = new THREE.CanvasTexture(surface);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2.4, 4.2);
  texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  texture.needsUpdate = true;
  return texture;
}

function buildVaseGeometry(detail: number) {
  const profile: Array<[number, number]> = [
    [0.02, 0],
    [0.29, 0.012],
    [0.325, 0.055],
    [0.285, 0.125],
    [0.45, 0.3],
    [0.6, 0.6],
    [0.545, 0.95],
    [0.37, 1.27],
    [0.252, 1.5],
    [0.268, 1.655],
    [0.35, 1.76],
  ];

  const points = profile.map(([x, y]) => new THREE.Vector2(x, y));
  const curve = new THREE.SplineCurve(points);
  return new THREE.LatheGeometry(
    curve.getPoints(Math.round(10 + (detail / 100) * 44)),
    Math.round(12 + (detail / 100) * 84),
    0,
    Math.PI * 2,
  );
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
  distance = 4.3,
  cameraY = 0.92,
  scale = 1,
  presentation = "studio",
  still = false,
  interactive = true,
  label = "Эргүүлж харах боломжтой 3D ваар",
}: VaseSceneProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const settingsRef = useRef({
    color,
    material,
    roughness,
    autoRotate,
    progress,
    showGrid,
    scale,
  });

  useEffect(() => {
    settingsRef.current = {
      color,
      material,
      roughness,
      autoRotate,
      progress,
      showGrid,
      scale,
    };
  }, [autoRotate, color, material, progress, roughness, scale, showGrid]);

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
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = presentation === "ar" ? 1.02 : 1.08;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      compact ? 36 : presentation === "ar" ? 37 : 33,
      1,
      0.1,
      100,
    );
    camera.position.set(0, cameraY, distance);

    const pmrem = new THREE.PMREMGenerator(renderer);
    const roomEnvironment = new RoomEnvironment();
    const environmentTarget = pmrem.fromScene(roomEnvironment, 0.045);
    scene.environment = environmentTarget.texture;

    const group = new THREE.Group();
    group.position.y = -0.86;
    group.rotation.y = -0.45;
    group.scale.setScalar(settingsRef.current.scale);
    scene.add(group);

    const geometry = buildVaseGeometry(compact ? 50 : 60);
    geometry.computeVertexNormals();

    const initialSettings = settingsRef.current;
    const glazeWhite = new THREE.Color(0xffffff);
    const ceramicTexture = buildCeramicTexture(renderer);
    const solidMaterial = new THREE.MeshPhysicalMaterial({
      color: initialSettings.color,
      roughness: materialPresets[initialSettings.material].roughness,
      metalness: materialPresets[initialSettings.material].metalness,
      clearcoat: materialPresets[initialSettings.material].clearcoat,
      clearcoatRoughness: 0.24,
      sheen: 0.16,
      sheenRoughness: 0.62,
      sheenColor: new THREE.Color(initialSettings.color).lerp(
        glazeWhite,
        0.45,
      ),
      map: initialSettings.material === "ceramic" ? ceramicTexture : null,
      bumpMap: initialSettings.material === "ceramic" ? ceramicTexture : null,
      bumpScale: 0.012,
      side: THREE.DoubleSide,
      transparent: true,
    });
    const solid = new THREE.Mesh(geometry, solidMaterial);
    solid.castShadow = true;
    solid.receiveShadow = true;
    group.add(solid);

    // Амсар, харанхуй дотор хэсэг, суурийн цагираг нь силуэтийг бодит болгоно.
    const rimGeometry = new THREE.TorusGeometry(0.35, 0.028, 14, 72);
    rimGeometry.rotateX(Math.PI / 2);
    const rimMesh = new THREE.Mesh(rimGeometry, solidMaterial);
    rimMesh.position.y = 1.755;
    rimMesh.castShadow = true;
    group.add(rimMesh);

    const innerGeometry = new THREE.CircleGeometry(0.318, 64);
    innerGeometry.rotateX(-Math.PI / 2);
    const innerMaterial = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(initialSettings.color).multiplyScalar(0.22),
      roughness: 0.82,
      metalness: 0,
      side: THREE.DoubleSide,
      transparent: true,
    });
    const inner = new THREE.Mesh(innerGeometry, innerMaterial);
    inner.position.y = 1.746;
    group.add(inner);

    const footGeometry = new THREE.TorusGeometry(0.292, 0.014, 10, 64);
    footGeometry.rotateX(Math.PI / 2);
    const foot = new THREE.Mesh(footGeometry, solidMaterial);
    foot.position.y = 0.025;
    foot.castShadow = true;
    group.add(foot);

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

    const ambient = new THREE.AmbientLight(0xdde4ee, 0.62);
    scene.add(ambient);

    const hemisphere = new THREE.HemisphereLight(0xfffbf5, 0x6f6259, 1.15);
    scene.add(hemisphere);

    const keyLight = new THREE.DirectionalLight(0xfff1dc, 3.15);
    const keyAngle = 0.4 * Math.PI * 1.6 - 0.25;
    keyLight.position.set(Math.cos(keyAngle) * 4.2, 4.4, Math.sin(keyAngle) * 4.2);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 14;
    keyLight.shadow.camera.left = -3;
    keyLight.shadow.camera.right = 3;
    keyLight.shadow.camera.top = 3;
    keyLight.shadow.camera.bottom = -3;
    keyLight.shadow.bias = -0.0012;
    scene.add(keyLight);

    const rim = new THREE.DirectionalLight(0xb5a2ff, 0.9);
    rim.position.set(-3.4, 1.4, -2.6);
    scene.add(rim);

    const fill = new THREE.DirectionalLight(0xc9ddff, 1.05);
    fill.position.set(2.2, -1.2, 2.4);
    scene.add(fill);

    const floorMaterial = new THREE.ShadowMaterial({
      color: 0x000000,
      opacity: presentation === "ar" ? 0.3 : 0.38,
    });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(16, 16), floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.87;
    floor.receiveShadow = true;
    scene.add(floor);

    const grid = new THREE.GridHelper(12, 24, 0x333645, 0x252733);
    grid.position.y = -0.868;
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0.28;
    scene.add(grid);

    const pointer = {
      dragging: false,
      x: 0,
      y: 0,
      targetYaw: -0.45,
      yaw: -0.45,
      targetPitch: 0.06,
      pitch: 0.06,
      distance,
      targetDistance: distance,
    };

    const onPointerDown = (event: PointerEvent) => {
      pointer.dragging = true;
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      canvas.setPointerCapture?.(event.pointerId);
    };
    const onPointerMove = (event: PointerEvent) => {
      if (!pointer.dragging) return;
      pointer.targetYaw += (event.clientX - pointer.x) * 0.006;
      pointer.targetPitch = THREE.MathUtils.clamp(
        pointer.targetPitch + (event.clientY - pointer.y) * 0.004,
        -0.5,
        0.72,
      );
      pointer.x = event.clientX;
      pointer.y = event.clientY;
    };
    const onPointerUp = () => {
      pointer.dragging = false;
    };
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      pointer.targetDistance = THREE.MathUtils.clamp(
        pointer.targetDistance + event.deltaY * 0.0022,
        2.3,
        8,
      );
    };

    if (interactive) {
      canvas.addEventListener("pointerdown", onPointerDown);
      canvas.addEventListener("pointermove", onPointerMove);
      canvas.addEventListener("pointerup", onPointerUp);
      canvas.addEventListener("pointercancel", onPointerUp);
      canvas.addEventListener("wheel", onWheel, { passive: false });
      canvas.style.touchAction = "none";
    } else {
      // Хөдөлгөөнгүй зураг — хуудсыг гүйлгэхэд саад болохгүй
      canvas.style.touchAction = "auto";
      canvas.style.cursor = "default";
    }

    const resize = () => {
      const width = Math.max(1, canvas.clientWidth);
      const height = Math.max(1, canvas.clientHeight);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      // Зогссон горимд хэмжээ өөрчлөгдөхөд дахин нэг кадр зурна
      if (still) render();
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);

    let frame = 0;
    const clock = new THREE.Clock();
    const render = () => {
      const delta = Math.min(clock.getDelta(), 0.04);
      const settings = settingsRef.current;
      const preset = materialPresets[settings.material];

      solidMaterial.color.set(settings.color);
      solidMaterial.metalness = preset.metalness;
      solidMaterial.clearcoat = preset.clearcoat;
      solidMaterial.roughness =
        settings.roughness === undefined
          ? preset.roughness
          : THREE.MathUtils.clamp(settings.roughness / 100, 0.06, 1);
      const ceramic = settings.material === "ceramic";
      solidMaterial.bumpScale = ceramic ? 0.012 : 0;
      solidMaterial.sheen = ceramic ? 0.16 : 0;
      solidMaterial.sheenColor
        .set(settings.color)
        .lerp(glazeWhite, 0.45);
      innerMaterial.color.set(settings.color).multiplyScalar(0.22);
      const surfaceMap = ceramic ? ceramicTexture : null;
      if (solidMaterial.map !== surfaceMap) {
        solidMaterial.map = surfaceMap;
        solidMaterial.bumpMap = surfaceMap;
        solidMaterial.needsUpdate = true;
      }

      const p = THREE.MathUtils.clamp(settings.progress, 0, 1);
      group.scale.setScalar(THREE.MathUtils.clamp(settings.scale, 0.05, 2.5));
      pointMaterial.opacity = THREE.MathUtils.clamp(1 - p / 0.34, 0, 1) * 0.95;
      wireMaterial.opacity =
        p < 0.32
          ? THREE.MathUtils.clamp(p / 0.32, 0, 1) * 0.92
          : THREE.MathUtils.clamp(
              0.92 - THREE.MathUtils.clamp((p - 0.58) / 0.42, 0, 1) * 0.8,
              0,
              1,
            );
      solidMaterial.opacity = THREE.MathUtils.clamp((p - 0.34) / 0.46, 0, 1);
      solid.visible = solidMaterial.opacity > 0.01;
      rimMesh.visible = solid.visible;
      foot.visible = solid.visible;
      inner.visible = solid.visible;
      innerMaterial.opacity = solidMaterial.opacity;
      solid.castShadow = solidMaterial.opacity > 0.6;
      grid.visible = settings.showGrid;

      if (still) {
        // Зөөлрүүлэлтгүй — эцсийн байрлалыг шууд авна
        pointer.yaw = pointer.targetYaw;
        pointer.pitch = pointer.targetPitch;
        pointer.distance = pointer.targetDistance;
      } else {
        if (settings.autoRotate && !pointer.dragging) {
          pointer.targetYaw += delta * 0.156;
        }
        pointer.yaw += (pointer.targetYaw - pointer.yaw) * 0.09;
        pointer.pitch += (pointer.targetPitch - pointer.pitch) * 0.09;
        pointer.distance += (pointer.targetDistance - pointer.distance) * 0.08;
      }

      group.rotation.y = pointer.yaw;
      camera.position.set(0, cameraY + pointer.pitch * 2.2, pointer.distance);
      camera.lookAt(0, presentation === "ar" ? -0.04 : cameraY * 0.14, 0);

      renderer.render(scene, camera);
      if (!still) frame = requestAnimationFrame(render);
    };

    resize();
    render();

    return () => {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerUp);
      canvas.removeEventListener("wheel", onWheel);
      geometry.dispose();
      rimGeometry.dispose();
      innerGeometry.dispose();
      footGeometry.dispose();
      solidMaterial.dispose();
      innerMaterial.dispose();
      ceramicTexture?.dispose();
      wireMaterial.dispose();
      pointMaterial.dispose();
      floor.geometry.dispose();
      floorMaterial.dispose();
      grid.geometry.dispose();
      (grid.material as THREE.Material).dispose();
      environmentTarget.dispose();
      roomEnvironment.dispose();
      pmrem.dispose();
      renderer.dispose();
    };
  }, [cameraY, compact, distance, interactive, presentation, still]);

  return <canvas ref={canvasRef} className={className} aria-label={label} />;
}
