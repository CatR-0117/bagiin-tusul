import { mkdir, writeFile } from "node:fs/promises";

const faces = [
  { normal: [0, 0, 1], points: [[-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]] },
  { normal: [0, 0, -1], points: [[1, -1, -1], [-1, -1, -1], [-1, 1, -1], [1, 1, -1]] },
  { normal: [1, 0, 0], points: [[1, -1, 1], [1, -1, -1], [1, 1, -1], [1, 1, 1]] },
  { normal: [-1, 0, 0], points: [[-1, -1, -1], [-1, -1, 1], [-1, 1, 1], [-1, 1, -1]] },
  { normal: [0, 1, 0], points: [[-1, 1, 1], [1, 1, 1], [1, 1, -1], [-1, 1, -1]] },
  { normal: [0, -1, 0], points: [[-1, -1, -1], [1, -1, -1], [1, -1, 1], [-1, -1, 1]] },
];

const positions = new Float32Array(faces.flatMap((face) => face.points.flat()));
const normals = new Float32Array(
  faces.flatMap((face) => Array.from({ length: 4 }, () => face.normal).flat()),
);
const indices = new Uint16Array(
  faces.flatMap((_, faceIndex) => {
    const offset = faceIndex * 4;
    return [offset, offset + 1, offset + 2, offset, offset + 2, offset + 3];
  }),
);

const binary = Buffer.concat([
  Buffer.from(positions.buffer),
  Buffer.from(normals.buffer),
  Buffer.from(indices.buffer),
]);

const gltf = {
  asset: { version: "2.0", generator: "SnapAR mock asset generator" },
  scene: 0,
  scenes: [{ nodes: [0] }],
  nodes: [{ mesh: 0, name: "SnapAR demo cube", rotation: [0.12, 0.22, 0, 0.96] }],
  meshes: [{ primitives: [{ attributes: { POSITION: 0, NORMAL: 1 }, indices: 2, material: 0 }] }],
  materials: [{
    name: "Violet glass",
    pbrMetallicRoughness: {
      baseColorFactor: [0.42, 0.29, 0.98, 1],
      metallicFactor: 0.18,
      roughnessFactor: 0.28,
    },
  }],
  accessors: [
    { bufferView: 0, componentType: 5126, count: 24, type: "VEC3", min: [-1, -1, -1], max: [1, 1, 1] },
    { bufferView: 1, componentType: 5126, count: 24, type: "VEC3" },
    { bufferView: 2, componentType: 5123, count: 36, type: "SCALAR", min: [0], max: [23] },
  ],
  bufferViews: [
    { buffer: 0, byteOffset: 0, byteLength: positions.byteLength, target: 34962 },
    { buffer: 0, byteOffset: positions.byteLength, byteLength: normals.byteLength, target: 34962 },
    { buffer: 0, byteOffset: positions.byteLength + normals.byteLength, byteLength: indices.byteLength, target: 34963 },
  ],
  buffers: [{ byteLength: binary.byteLength }],
};

const jsonBody = Buffer.from(JSON.stringify(gltf));
const jsonPadding = (4 - (jsonBody.length % 4)) % 4;
const jsonChunk = Buffer.concat([jsonBody, Buffer.alloc(jsonPadding, 0x20)]);
const binaryPadding = (4 - (binary.length % 4)) % 4;
const binaryChunk = Buffer.concat([binary, Buffer.alloc(binaryPadding)]);
const totalLength = 12 + 8 + jsonChunk.length + 8 + binaryChunk.length;
const header = Buffer.alloc(12);
header.writeUInt32LE(0x46546c67, 0);
header.writeUInt32LE(2, 4);
header.writeUInt32LE(totalLength, 8);
const jsonHeader = Buffer.alloc(8);
jsonHeader.writeUInt32LE(jsonChunk.length, 0);
jsonHeader.writeUInt32LE(0x4e4f534a, 4);
const binaryHeader = Buffer.alloc(8);
binaryHeader.writeUInt32LE(binaryChunk.length, 0);
binaryHeader.writeUInt32LE(0x004e4942, 4);

await mkdir(new URL("../public/demo/", import.meta.url), { recursive: true });
await writeFile(
  new URL("../public/demo/model.glb", import.meta.url),
  Buffer.concat([header, jsonHeader, jsonChunk, binaryHeader, binaryChunk]),
);

