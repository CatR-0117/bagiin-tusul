import { isSupabaseAdminConfigured, isSupabaseConfigured } from "@/lib/config";
import { DEMO_USER_ID } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Project, ProjectUpdate } from "@/types/project";

const DEMO_PROJECT_ID = "11111111-1111-4111-8111-111111111111";

type MockProjectState = Map<string, Project>;

const globalForProjects = globalThis as typeof globalThis & {
  __snaparProjects?: MockProjectState;
};

function createDemoProject(): Project {
  const now = new Date();
  now.setDate(now.getDate() - 2);
  return {
    id: DEMO_PROJECT_ID,
    user_id: DEMO_USER_ID,
    title: "Aura lounge chair",
    source_image_key: "demo/source.avif",
    original_glb_key: "demo/sofa.glb",
    original_glb_size: 207332,
    web_glb_key: "demo/sofa.glb",
    web_glb_size: 207332,
    android_glb_key: "demo/sofa.glb",
    android_glb_size: 207332,
    ios_usdz_key: "demo/sofa.usdz",
    ios_usdz_size: 2300540,
    glb_key: "demo/sofa.glb",
    usdz_key: "demo/sofa.usdz",
    thumbnail_key: "demo/source.avif",
    triangle_count: null,
    analysis_before: null,
    analysis_after: null,
    web_optimization_status: "excellent",
    android_optimization_status: "excellent",
    ios_optimization_status: "excellent",
    optimization_warnings: [],
    status: "ready",
    ai_job_id: "mock_demo_complete",
    error_message: null,
    processing_error: null,
    processing_worker_id: null,
    processing_claimed_at: null,
    processing_started_at: now.toISOString(),
    processing_completed_at: now.toISOString(),
    processing_attempts: 1,
    is_public: true,
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  };
}

function mockProjects() {
  if (!globalForProjects.__snaparProjects) {
    const demo = createDemoProject();
    globalForProjects.__snaparProjects = new Map([[demo.id, demo]]);
  }
  return globalForProjects.__snaparProjects;
}

export async function listProjects(userId: string): Promise<Project[]> {
  if (!isSupabaseConfigured()) {
    return [...mockProjects().values()]
      .filter((project) => project.user_id === userId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

export async function getProjectForUser(userId: string, id: string) {
  if (!isSupabaseConfigured()) {
    const project = mockProjects().get(id);
    return project?.user_id === userId ? project : null;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function getProjectForAr(userId: string | null, id: string) {
  if (!isSupabaseConfigured()) {
    const project = mockProjects().get(id);
    if (!project) return null;
    return project.is_public || project.user_id === userId ? project : null;
  }

  if (userId) {
    const owned = await getProjectForUser(userId, id);
    if (owned) return owned;
  }

  if (!isSupabaseAdminConfigured()) return null;
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("projects")
    .select("*")
    .eq("id", id)
    .eq("is_public", true)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function createProject(userId: string, title: string) {
  if (!isSupabaseConfigured()) {
    const now = new Date().toISOString();
    const project: Project = {
      id: crypto.randomUUID(),
      user_id: userId,
      title,
      source_image_key: null,
      original_glb_key: null,
      original_glb_size: null,
      web_glb_key: null,
      web_glb_size: null,
      android_glb_key: null,
      android_glb_size: null,
      ios_usdz_key: null,
      ios_usdz_size: null,
      glb_key: null,
      usdz_key: null,
      thumbnail_key: null,
      triangle_count: null,
      analysis_before: null,
      analysis_after: null,
      web_optimization_status: null,
      android_optimization_status: null,
      ios_optimization_status: null,
      optimization_warnings: [],
      status: "uploading",
      ai_job_id: null,
      error_message: null,
      processing_error: null,
      processing_worker_id: null,
      processing_claimed_at: null,
      processing_started_at: null,
      processing_completed_at: null,
      processing_attempts: 0,
      is_public: false,
      created_at: now,
      updated_at: now,
    };
    mockProjects().set(project.id, project);
    return project;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .insert({ user_id: userId, title, status: "uploading" })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateProject(
  userId: string,
  id: string,
  patch: ProjectUpdate,
) {
  const update = { ...patch, updated_at: new Date().toISOString() };
  if (!isSupabaseConfigured()) {
    const current = await getProjectForUser(userId, id);
    if (!current) return null;
    const next = { ...current, ...update };
    mockProjects().set(id, next);
    return next;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .update(update)
    .eq("id", id)
    .eq("user_id", userId)
    .select("*")
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function deleteProjectRecord(userId: string, id: string) {
  if (!isSupabaseConfigured()) {
    const current = await getProjectForUser(userId, id);
    return current ? mockProjects().delete(id) : false;
  }

  const supabase = await createClient();
  const { error, count } = await supabase
    .from("projects")
    .delete({ count: "exact" })
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
  return Boolean(count);
}
