export const isSupabaseConfigured = () =>
  Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );

export const isSupabaseAdminConfigured = () =>
  isSupabaseConfigured() && Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

export const isR2Configured = () =>
  Boolean(
    process.env.R2_ACCOUNT_ID &&
      process.env.R2_ACCESS_KEY_ID &&
      process.env.R2_SECRET_ACCESS_KEY &&
      process.env.R2_BUCKET_NAME,
  );

export const isMockAIEnabled = () =>
  process.env.USE_MOCK_AI !== "false" ||
  !process.env.AI_API_KEY ||
  !process.env.AI_API_BASE_URL;

export const MAX_SOURCE_IMAGE_BYTES = 10 * 1024 * 1024;

