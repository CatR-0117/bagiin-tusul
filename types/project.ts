export const PROJECT_STATUSES = [
  "uploading",
  "uploaded",
  "generating",
  "optimizing",
  "converting",
  "ready",
  "failed",
] as const;

export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export type OptimizationStatus = "excellent" | "good" | "large";

export type ModelAnalysis = {
  fileSize: number;
  triangleCount: number;
  meshCount: number;
  materialCount: number;
  textureCount: number;
  largestTextureWidth: number | null;
  largestTextureHeight: number | null;
};

export type Project = {
  id: string;
  user_id: string;
  title: string | null;
  source_image_key: string | null;
  original_glb_key: string | null;
  original_glb_size: number | null;
  web_glb_key: string | null;
  web_glb_size: number | null;
  android_glb_key: string | null;
  android_glb_size: number | null;
  ios_usdz_key: string | null;
  ios_usdz_size: number | null;
  glb_key: string | null;
  usdz_key: string | null;
  thumbnail_key: string | null;
  triangle_count: number | null;
  analysis_before: ModelAnalysis | null;
  analysis_after: ModelAnalysis | null;
  web_optimization_status: OptimizationStatus | null;
  android_optimization_status: OptimizationStatus | null;
  ios_optimization_status: OptimizationStatus | null;
  optimization_warnings: string[];
  status: ProjectStatus;
  ai_job_id: string | null;
  error_message: string | null;
  processing_error: string | null;
  processing_worker_id: string | null;
  processing_claimed_at: string | null;
  processing_started_at: string | null;
  processing_completed_at: string | null;
  processing_attempts: number;
  is_public: boolean;
  created_at: string;
  updated_at: string;
};

export type ProjectInsert = Partial<Omit<Project, "user_id">> & {
  user_id: string;
};

export type ProjectUpdate = Partial<Omit<Project, "id" | "user_id">>;

export type ProjectAssetUrls = {
  sourceImageUrl: string | null;
  originalGlbUrl: string | null;
  webGlbUrl: string | null;
  androidGlbUrl: string | null;
  iosUsdzUrl: string | null;
  /** Backward-compatible aliases for existing components. */
  glbUrl: string | null;
  usdzUrl: string | null;
  thumbnailUrl: string | null;
};
