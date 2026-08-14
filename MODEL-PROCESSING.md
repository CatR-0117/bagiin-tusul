# Model processing worker

The web application does not optimize GLBs or build USDZ files inside a request. Once the AI provider finishes, the app stores the immutable source at:

```text
models/{projectId}/original.glb
```

It then changes the project status to `optimizing`. A separate Node.js worker atomically claims queued rows through `claim_model_processing_job()` and writes:

```text
models/{projectId}/web.glb
models/{projectId}/android-ar.glb
models/{projectId}/ios-ar.usdz
models/{projectId}/thumbnail.webp
```

The original object is never overwritten. A project reaches `ready` only after all three derived assets have been uploaded.

## Deploy

1. Apply both Supabase migrations, including `20260814000000_add_model_processing_pipeline.sql`.
2. Configure the worker with the same server-only Supabase service-role and R2 variables as the web app.
3. Run one continuously available worker process:

```bash
npm run worker:models
```

For a scheduler-driven environment, process at most one queued model per invocation:

```bash
npm run worker:models:once
```

`Dockerfile.model-processor` is intended for a small container service such as Cloud Run, Fly.io, Railway, or ECS. Do not deploy this process as a Vercel function. It uses GLTF Transform, meshoptimizer, Sharp, and a native headless canvas; large source models need memory and execution time beyond a normal request lifecycle.

The queue claim is safe across multiple replicas (`FOR UPDATE SKIP LOCKED`). A claim older than 20 minutes can be reclaimed after a worker crash. Processing exceptions set the project to `failed` with a useful error, and owners can restart derived-asset processing from the model page without replacing `original.glb`.

## Optimization policy

- `<10 MB`: compatibility cleanup, 2K texture cap, no forced geometry reduction below 100K triangles.
- `10–25 MB`: light optimization.
- `25–50 MB`: normal optimization toward 50K triangles.
- `>50 MB`: aggressive optimization toward 40K triangles and a 1K texture cap.

The simplifier uses a bounded geometric error and may stop above the target to preserve shape. The worker escalates only while the Android GLB remains above 10 MB. Oversized outputs are warnings, not automatic failures. Before/after analysis and platform-specific size grades are stored in PostgreSQL.

## Private delivery

`GET /api/models/{id}/assets` authorizes either the owner or an explicitly public project, then returns one-hour inline signed URLs. It never exposes R2 or Supabase service-role credentials. The AR page refreshes those URLs before launching Quick Look, Scene Viewer, or WebXR.
