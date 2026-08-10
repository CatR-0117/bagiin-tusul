declare interface R2Range {
  offset: number;
  length: number;
}

declare interface R2ObjectBody {
  body: ReadableStream;
  size: number;
  range?: R2Range;
  httpEtag: string;
  httpMetadata?: { contentType?: string };
  customMetadata?: Record<string, string>;
  writeHttpMetadata(headers: Headers): void;
}

declare interface R2Object {
  size: number;
  customMetadata?: Record<string, string>;
}

declare interface R2UploadedPart {
  partNumber: number;
  etag: string;
}

declare interface R2MultipartUpload {
  key: string;
  uploadId: string;
  uploadPart(
    partNumber: number,
    value: ReadableStream | ArrayBuffer | Blob,
  ): Promise<R2UploadedPart>;
  complete(uploadedParts: R2UploadedPart[]): Promise<R2Object>;
  abort(): Promise<void>;
}

declare interface R2Bucket {
  put(
    key: string,
    value: ReadableStream | ArrayBuffer | string,
    options?: {
      httpMetadata?: { contentType?: string };
      customMetadata?: Record<string, string>;
    },
  ): Promise<R2Object | null>;
  get(
    key: string,
    options?: { range?: Headers },
  ): Promise<R2ObjectBody | null>;
  head(key: string): Promise<R2Object | null>;
  delete(keys: string | string[]): Promise<void>;
  createMultipartUpload(
    key: string,
    options?: { httpMetadata?: { contentType?: string } },
  ): Promise<R2MultipartUpload>;
  resumeMultipartUpload(key: string, uploadId: string): R2MultipartUpload;
}

declare module "cloudflare:workers" {
  export const env: {
    MODELS?: R2Bucket;
  };
}
