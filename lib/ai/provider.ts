export type Generate3DInput = {
  imageUrl: string;
};

export type GenerationJob = {
  jobId: string;
  status: "queued" | "processing" | "completed" | "failed";
};

export type GenerationResult = {
  glbUrl: string;
  usdzUrl?: string;
  thumbnailUrl?: string;
};

export type GenerationStatus = GenerationJob & {
  result?: GenerationResult;
  error?: string;
  stage?:
    | "preparing"
    | "geometry"
    | "processing"
    | "finalizing"
    | "complete";
};

export interface ImageTo3DProvider {
  generate(input: Generate3DInput): Promise<GenerationJob>;
  getStatus(jobId: string): Promise<GenerationStatus>;
}

