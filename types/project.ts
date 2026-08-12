export const PROJECT_STATUSES = [
  "uploading",
  "uploaded",
  "generating",
  "ready",
  "failed",
] as const;

export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export type Project = {
  id: string;
  user_id: string;
  title: string | null;
  source_image_key: string | null;
  glb_key: string | null;
  usdz_key: string | null;
  thumbnail_key: string | null;
  status: ProjectStatus;
  ai_job_id: string | null;
  error_message: string | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
};

export type ProjectInsert = {
  id?: string;
  user_id: string;
  title?: string | null;
  source_image_key?: string | null;
  glb_key?: string | null;
  usdz_key?: string | null;
  thumbnail_key?: string | null;
  status?: ProjectStatus;
  ai_job_id?: string | null;
  error_message?: string | null;
  is_public?: boolean;
  created_at?: string;
  updated_at?: string;
};

export type ProjectUpdate = Partial<Omit<Project, "id" | "user_id">>;

export type ProjectAssetUrls = {
  sourceImageUrl: string | null;
  glbUrl: string | null;
  usdzUrl: string | null;
  thumbnailUrl: string | null;
};

