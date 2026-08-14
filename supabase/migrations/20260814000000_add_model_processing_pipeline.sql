alter table public.projects
  add column if not exists original_glb_key text,
  add column if not exists original_glb_size bigint,
  add column if not exists web_glb_key text,
  add column if not exists web_glb_size bigint,
  add column if not exists android_glb_key text,
  add column if not exists android_glb_size bigint,
  add column if not exists ios_usdz_key text,
  add column if not exists ios_usdz_size bigint,
  add column if not exists triangle_count bigint,
  add column if not exists analysis_before jsonb,
  add column if not exists analysis_after jsonb,
  add column if not exists web_optimization_status text,
  add column if not exists android_optimization_status text,
  add column if not exists ios_optimization_status text,
  add column if not exists optimization_warnings text[] not null default '{}',
  add column if not exists processing_error text,
  add column if not exists processing_worker_id text,
  add column if not exists processing_claimed_at timestamptz,
  add column if not exists processing_started_at timestamptz,
  add column if not exists processing_completed_at timestamptz,
  add column if not exists processing_attempts integer not null default 0;

update public.projects
set
  original_glb_key = coalesce(original_glb_key, glb_key),
  web_glb_key = coalesce(web_glb_key, glb_key),
  android_glb_key = coalesce(android_glb_key, glb_key),
  ios_usdz_key = coalesce(ios_usdz_key, usdz_key)
where glb_key is not null or usdz_key is not null;

alter table public.projects drop constraint if exists projects_status_check;
alter table public.projects
  add constraint projects_status_check
  check (status in (
    'uploading', 'uploaded', 'generating', 'optimizing', 'converting',
    'ready', 'failed'
  ));

alter table public.projects
  drop constraint if exists projects_web_optimization_status_check,
  drop constraint if exists projects_android_optimization_status_check,
  drop constraint if exists projects_ios_optimization_status_check;

alter table public.projects
  add constraint projects_web_optimization_status_check
    check (web_optimization_status is null or web_optimization_status in ('excellent', 'good', 'large')),
  add constraint projects_android_optimization_status_check
    check (android_optimization_status is null or android_optimization_status in ('excellent', 'good', 'large')),
  add constraint projects_ios_optimization_status_check
    check (ios_optimization_status is null or ios_optimization_status in ('excellent', 'good', 'large'));

create index if not exists projects_processing_queue_idx
  on public.projects (created_at)
  where status in ('optimizing', 'converting');

create or replace function public.claim_model_processing_job(p_worker_id text)
returns setof public.projects
language plpgsql
security definer
set search_path = ''
as $$
declare
  claimed_id uuid;
begin
  select p.id into claimed_id
  from public.projects p
  where p.status in ('optimizing', 'converting')
    and p.original_glb_key is not null
    and (
      p.processing_claimed_at is null
      or p.processing_claimed_at < now() - interval '20 minutes'
    )
  order by p.created_at
  for update skip locked
  limit 1;

  if claimed_id is null then
    return;
  end if;

  return query
  update public.projects p
  set
    processing_worker_id = p_worker_id,
    processing_claimed_at = now(),
    processing_started_at = coalesce(p.processing_started_at, now()),
    processing_attempts = p.processing_attempts + 1,
    processing_error = null,
    updated_at = now()
  where p.id = claimed_id
  returning p.*;
end;
$$;

revoke all on function public.claim_model_processing_job(text) from public;
revoke all on function public.claim_model_processing_job(text) from anon;
revoke all on function public.claim_model_processing_job(text) from authenticated;
grant execute on function public.claim_model_processing_job(text) to service_role;
