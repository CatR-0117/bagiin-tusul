# SnapAR

SnapAR is a functional MVP for turning a product image into an interactive 3D model and a shareable mobile AR experience. Users can create an account, recover or change their password, manage their profile, upload directly to Cloudflare R2, start an image-to-3D job, monitor generation, inspect and download the resulting GLB, and share an `/ar/[projectId]` QR route.

The app also has a zero-configuration development mode. When Supabase, R2, or an AI provider is unavailable, the account screen opens a demo workspace, uploads use an in-memory local adapter, and the generation pipeline returns a bundled matching GLB/USDZ pair after simulated workflow stages.

## Architecture

```text
Browser
  ├─ Supabase Auth (PKCE + secure SSR cookies)
  ├─ POST /api/upload-url
  └─ direct presigned PUT ───────────────────────► Cloudflare R2
                                                    images / GLB / USDZ
Next.js App Router
  ├─ protected pages + API ownership checks
  ├─ provider-agnostic image-to-3D orchestration
  ├─ signed R2 GET URLs generated on demand
  └─ Supabase PostgreSQL ────────────────────────► project keys + durable queue state

Node model processor
  ├─ GLTF Transform + meshoptimizer + Sharp
  ├─ headless GLB → USDZ conversion
  └─ original.glb ──► web.glb / android-ar.glb / ios-ar.usdz

Desktop model page ── QR /ar/[projectId] ──► mobile model-viewer ──► AR
```

PostgreSQL stores only object keys and metadata. Image, GLB, USDZ, and thumbnail bytes are never stored in the database. The private bucket URL is never placed in the QR code.

## Tech stack

- Next.js 16 App Router, React 19, strict TypeScript
- Tailwind CSS 4 plus product-specific CSS
- Supabase Auth, PostgreSQL, and Row Level Security
- Cloudflare R2 through the AWS S3 SDK and presigned URLs
- `@google/model-viewer` for interactive 3D and native AR launch
- `qrcode.react` for AR route QR codes
- Zod for client and server validation
- Vinext/Cloudflare Sites build plus a Vercel-compatible Next.js build

## Local setup

Requirements: Node.js 20 or newer and npm.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open the local URL printed by the development server. With blank service credentials and `USE_MOCK_AI=true`, choose **Enter demo workspace** and test the complete workflow without external services.

Useful checks:

```bash
npx tsc --noEmit
npm run lint
npm run build
npm run build:next
```

## Supabase setup

1. Create a Supabase project.
2. Copy the Project URL and publishable key from the project Connect dialog into `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
3. Copy the server-only service-role key into `SUPABASE_SERVICE_ROLE_KEY`. Never prefix it with `NEXT_PUBLIC_`.
4. In the SQL Editor, run [`supabase/migrations/20260812000000_create_projects.sql`](supabase/migrations/20260812000000_create_projects.sql), followed by [`supabase/migrations/20260814000000_add_model_processing_pipeline.sql`](supabase/migrations/20260814000000_add_model_processing_pipeline.sql).
5. Set the Auth Site URL to the app origin. Add both the local and production callback URLs to the Auth redirect allow list:

```text
http://localhost:3000/auth/callback
https://your-domain.example/auth/callback
```

If the Supabase CLI is available, the same migration can be applied with `supabase db push` after linking the project.

## Database and RLS

The migration creates `public.projects`, the requested status constraint, an ownership/date index, an automatic `updated_at` trigger, and four RLS policies:

- select only when `auth.uid() = user_id`
- insert only when `auth.uid() = user_id`
- update only when `auth.uid() = user_id`
- delete only when `auth.uid() = user_id`

API handlers also derive the user ID from a verified Supabase claim and repeat ownership checks server-side. The service-role client is limited to the server-only public AR lookup for a project explicitly marked `is_public`.

## Email confirmation

For SSR confirmation links, update the **Confirm signup** email template in Supabase Auth to:

```text
{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email
```

The `/auth/confirm` handler verifies the token and stores the session in SSR cookies.

## Google OAuth

1. Create a Web OAuth client in Google Cloud.
2. Add your app origins to **Authorized JavaScript origins**.
3. Add the Supabase callback URL shown on the Supabase Google provider screen to **Authorized redirect URIs**. It normally looks like `https://PROJECT_REF.supabase.co/auth/v1/callback`.
4. Enable Google under Supabase **Authentication → Providers** and enter the Google client ID and secret.
5. Keep the SnapAR `/auth/callback` URLs in the Supabase redirect allow list so the PKCE code can be exchanged for a cookie session.

## Cloudflare R2 setup

1. Create one private R2 bucket.
2. Create an R2 API token scoped to read/write objects in only that bucket.
3. Put the account ID, access key, secret key, and bucket name in `.env.local`.
4. Do not expose the secret key in a browser variable.

SnapAR generates keys on the server:

```text
uploads/{userId}/{projectId}/source.{jpg|png|webp}
models/{projectId}/original.glb
models/{projectId}/web.glb
models/{projectId}/android-ar.glb
models/{projectId}/ios-ar.usdz
models/{projectId}/thumbnail.webp
```

### R2 CORS

Direct browser PUT requests need bucket CORS. Replace the origins with the exact development and production origins:

```json
[
  {
    "AllowedOrigins": [
      "http://localhost:3000",
      "https://your-domain.example"
    ],
    "AllowedMethods": ["GET", "PUT", "HEAD"],
    "AllowedHeaders": ["Content-Type"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

Uploaded images are limited to matching JPG/JPEG, PNG, or WebP MIME/extension pairs and 10 MB. The browser receives only an expiring PUT URL and a server-generated key.

## Mock AI mode

Set:

```env
USE_MOCK_AI=true
```

The mock provider is implemented in `lib/ai/mock-provider.ts`. It simulates preparing, geometry, processing, and finalization stages, then uses the bundled matching sofa GLB and USDZ pair. Set `USE_MOCK_AI=false` only after the real provider variables are configured.

Regenerate the bundled sample GLB if needed:

```bash
node scripts/create-demo-glb.mjs
```

## Tripo3D image-to-3D

The production provider uses Tripo3D's official v3 TypeScript SDK. Add the
server-only API key and disable the bundled demo provider:

```env
TRIPO_API_KEY=tsk_your_key
TRIPO_API_BASE_URL=https://openapi.tripo3d.ai/v3
TRIPO_MODEL_VERSION=P1-20260311
TRIPO_FACE_LIMIT=10000
USE_MOCK_AI=false
```

Never prefix the API key with `NEXT_PUBLIC_`. The browser uploads only to this
application; the server downloads the protected source image, uploads it to
Tripo, and submits a textured PBR image-to-model task. The P1 preset and 10,000
face target are selected for mobile AR, and can be changed with the variables
above.

The UI and API routes still depend only on the normalized contract in
`lib/ai/provider.ts`:

```ts
type GenerationJob = {
  jobId: string
  status: "queued" | "processing" | "completed" | "failed"
}

type GenerationResult = {
  glbUrl: string
  usdzUrl?: string
  thumbnailUrl?: string
}
```

`lib/ai/tripo-provider.ts` maps Tripo's `queued`, `running`, `success`, and
terminal failure states into that contract and includes generation progress.
When Tripo finishes, the expiring GLB and preview URLs are copied immediately
to R2. The existing model processor then optimizes web/Android GLBs and creates
the iPhone USDZ before the project becomes AR-ready.

An optional generic HTTP adapter remains available when `TRIPO_API_KEY` is not
set. It expects:

- `POST {AI_API_BASE_URL}/generate` with `{ "image_url": "SIGNED_SOURCE_URL" }`
- `GET {AI_API_BASE_URL}/jobs/{jobId}`
- snake_case responses such as `job_id`, `glb_url`, `usdz_url`, and `thumbnail_url`
- `Authorization: Bearer {AI_API_KEY}`

See [TRIPO-SETUP.md](TRIPO-SETUP.md) for the complete credential, storage,
worker, HTTPS, iPhone, and Android checklist.

When a job completes, the status endpoint stores only the provider GLB as the immutable original and queues derived-asset processing. See [MODEL-PROCESSING.md](MODEL-PROCESSING.md) for the worker deployment, retry, analysis, and optimization policy.

## Deployment to Vercel

1. Import the repository into Vercel.
2. The included `vercel.json` selects Next.js and runs `npm run build:next`.
3. Add every variable from `.env.example` under Project Settings. Keep `SUPABASE_SERVICE_ROLE_KEY`, `R2_SECRET_ACCESS_KEY`, `TRIPO_API_KEY`, and `AI_API_KEY` server-only.
4. Add the production origin to Supabase redirects, Google OAuth origins, and R2 CORS.
5. Set `NEXT_PUBLIC_APP_URL` to the production origin so generated QR routes use the correct host.
6. Deploy the separate model-processor container described in [MODEL-PROCESSING.md](MODEL-PROCESSING.md).
7. Deploy, then verify signup, direct upload, generation/optimization polling, signed asset access, and AR from both an iPhone and an ARCore Android phone.

## Security notes

- Protected browser routes are refreshed and gated by Next.js 16 `proxy.ts` using verified Supabase claims.
- Every mutation endpoint repeats authentication and project ownership checks.
- User IDs and object keys are never trusted from browser input.
- Signed download URLs are generated on demand and are not stored in PostgreSQL.
- Project deletion attempts every object cleanup independently, then removes the metadata record.
- Provider and storage secrets remain server-side.
