type MockObject = {
  body: Uint8Array;
  contentType: string;
  updatedAt: number;
};

const globalForObjects = globalThis as typeof globalThis & {
  __snaparObjects?: Map<string, MockObject>;
};

function objects() {
  globalForObjects.__snaparObjects ??= new Map<string, MockObject>();
  return globalForObjects.__snaparObjects;
}

export function putMockObject(
  key: string,
  body: ArrayBuffer,
  contentType: string,
) {
  objects().set(key, {
    body: new Uint8Array(body),
    contentType,
    updatedAt: Date.now(),
  });
}

export function getMockObject(key: string) {
  return objects().get(key) ?? null;
}

export function deleteMockObject(key: string) {
  return objects().delete(key);
}

