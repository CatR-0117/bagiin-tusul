import { createCanvas, Image, ImageData, loadImage } from "@napi-rs/canvas";
import type { Material, Mesh, Object3D, Texture } from "three";

const MB = 1024 * 1024;

function installCanvasGlobals() {
  const runtime = globalThis as unknown as Record<string, unknown>;
  runtime.self = globalThis;
  runtime.ImageBitmap = Image;
  runtime.ImageData = ImageData;
  runtime.createImageBitmap = async (blob: Blob) =>
    loadImage(Buffer.from(await blob.arrayBuffer()));
  runtime.document = {
    createElementNS(_namespace: string, name: string) {
      if (name === "canvas") return createCanvas(1, 1);
      throw new Error(`Unsupported headless DOM element: ${name}`);
    },
    createElement(name: string) {
      if (name === "canvas") return createCanvas(1, 1);
      throw new Error(`Unsupported headless DOM element: ${name}`);
    },
  };
}

function parseGlb<T>(
  loader: { parse: (data: ArrayBuffer, path: string, resolve: (value: T) => void, reject: (reason: unknown) => void) => void },
  data: ArrayBuffer,
) {
  return new Promise<T>((resolve, reject) => loader.parse(data, "", resolve, reject));
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
        if (texture?.isTexture) texture.dispose();
      }
      material.dispose();
    }
  });
}

function assertUsdz(bytes: Uint8Array) {
  if (
    bytes.byteLength < 100 ||
    bytes[0] !== 0x50 ||
    bytes[1] !== 0x4b ||
    bytes[2] !== 0x03 ||
    bytes[3] !== 0x04
  ) {
    throw new Error("USDZ conversion produced an invalid archive.");
  }
}

async function exportUsdz(glb: Uint8Array, maxTextureSize: number) {
  installCanvasGlobals();
  const [{ GLTFLoader }, { USDZExporter }] = await Promise.all([
    import("three/addons/loaders/GLTFLoader.js"),
    import("three/addons/exporters/USDZExporter.js"),
  ]);
  const data = glb.buffer.slice(
    glb.byteOffset,
    glb.byteOffset + glb.byteLength,
  ) as ArrayBuffer;
  const result = await parseGlb<{
    scene: Object3D;
  }>(new GLTFLoader(), data);

  try {
    result.scene.updateMatrixWorld(true);
    result.scene.traverse((object) => {
      const mesh = object as Mesh;
      const materials = Array.isArray(mesh.material)
        ? mesh.material
        : mesh.material
          ? [mesh.material]
          : [];
      // Quick Look does not support double-sided materials. Explicitly use the
      // front face to avoid exporter ambiguity and extremely verbose warnings.
      for (const material of materials as Material[]) {
        if (material.side === 2) material.side = 0;
      }
    });
    const bytes = new Uint8Array(
      await new USDZExporter().parseAsync(result.scene, {
        quickLookCompatible: true,
        includeAnchoringProperties: true,
        maxTextureSize,
      }),
    );
    assertUsdz(bytes);
    return bytes;
  } finally {
    disposeScene(result.scene);
  }
}

/** Runs only in the standalone Node processor, never in a Next.js request. */
export async function convertGlbToUsdz(glb: Uint8Array) {
  try {
    let bytes = await exportUsdz(glb, 2048);
    if (bytes.byteLength > 25 * MB) {
      const smaller = await exportUsdz(glb, 1024);
      if (smaller.byteLength < bytes.byteLength) bytes = smaller;
    }
    return bytes;
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Unknown converter error";
    throw new Error(`USDZ conversion failed: ${detail}`);
  }
}
