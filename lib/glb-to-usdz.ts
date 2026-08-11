import { USDZExporter } from "three/addons/exporters/USDZExporter.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { GLTFLoader, type GLTF } from "three/addons/loaders/GLTFLoader.js";
import { KTX2Loader } from "three/addons/loaders/KTX2Loader.js";
import * as WebGLTextureUtils from "three/addons/utils/WebGLTextureUtils.js";
import { WebGLRenderer } from "three";
import type { Material, Mesh, Object3D, Texture } from "three";

function parseGlb(loader: GLTFLoader, data: ArrayBuffer): Promise<GLTF> {
  return new Promise((resolve, reject) => {
    loader.parse(data, "", resolve, reject);
  });
}

function disposeScene(root: Object3D) {
  root.traverse((object) => {
    const mesh = object as Mesh;
    mesh.geometry?.dispose();

    const materials = Array.isArray(mesh.material)
      ? mesh.material
      : mesh.material
        ? [mesh.material]
        : [];
    for (const material of materials as Material[]) {
      for (const value of Object.values(material)) {
        const texture = value as Texture;
        if (!texture?.isTexture) continue;
        texture.dispose();
        const image = texture.image as { close?: () => void } | undefined;
        image?.close?.();
      }
      material.dispose();
    }
  });
}

/**
 * GLB-ийг browser дээр USDZ болгон хөрвүүлнэ. Ингэснээр серверт Blender эсвэл
 * macOS-ийн Reality Converter шаардахгүй бөгөөд үүссэн файлыг GLB-тэй нь хамт
 * нэг model ID дор upload хийж болно.
 */
export async function convertGlbToUsdz(glb: File): Promise<File> {
  if (typeof window === "undefined") {
    throw new Error("GLB → USDZ хөрвүүлэлт зөвхөн browser дээр ажиллана.");
  }

  const [data] = await Promise.all([glb.arrayBuffer(), MeshoptDecoder.ready]);
  const dracoLoader = new DRACOLoader();
  dracoLoader.setWorkerLimit(2);

  const renderer = new WebGLRenderer({ antialias: false, alpha: true });
  const ktx2Loader = new KTX2Loader();
  ktx2Loader.setWorkerLimit(2);
  ktx2Loader.detectSupport(renderer);

  const loader = new GLTFLoader();
  loader.setDRACOLoader(dracoLoader);
  loader.setKTX2Loader(ktx2Loader);
  loader.setMeshoptDecoder(MeshoptDecoder);

  let result: GLTF | null = null;
  try {
    result = await parseGlb(loader, data);
    result.scene.updateMatrixWorld(true);

    const exporter = new USDZExporter();
    exporter.setTextureUtils(WebGLTextureUtils);
    const bytes = await exporter.parseAsync(result.scene, {
      quickLookCompatible: true,
      includeAnchoringProperties: true,
      maxTextureSize: 2048,
      animations: result.animations,
    });
    if (bytes.byteLength === 0) {
      throw new Error("USDZ файл хоосон үүслээ.");
    }

    const name = glb.name.replace(/\.glb$/i, "") || "model";
    return new File([bytes], `${name}.usdz`, {
      type: "model/vnd.usdz+zip",
      lastModified: Date.now(),
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Тодорхойгүй алдаа";
    throw new Error(`USDZ болгон хөрвүүлж чадсангүй: ${detail}`);
  } finally {
    dracoLoader.dispose();
    ktx2Loader.dispose();
    renderer.forceContextLoss();
    renderer.dispose();
    if (result) disposeScene(result.scene);
  }
}
