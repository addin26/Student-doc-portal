# STUDYDOCK Public App - Vercel Setup

This guide deploys the public STUDYDOCK application from
`addin26/Student-doc-portal` to Vercel. It intentionally contains no real
credentials. Configure every secret in Vercel Project Settings, never in Git.

## 1. Deployment architecture

| Component | Production responsibility |
| --- | --- |
| Vercel | Builds and runs the Next.js public application and route handlers |
| Supabase Auth | Registration, login, cookie-backed sessions, and user identity |
| Supabase PostgreSQL | Application data, RLS policies, functions, and migrations |
| Cloudflare R2 | Private resource objects uploaded/downloaded with presigned URLs |
| Gemini | Optional asynchronous document analysis after it is enabled |

The browser receives only the Supabase project URL, Supabase anonymous key,
and public site URL. R2 and Gemini credentials are server-only.

## 2. Prerequisites

- Access to the GitHub repository.
- A Vercel account allowed to import that repository.
- A Supabase project with the migrations in `supabase/migrations/` applied.
- A private Cloudflare R2 bucket and an Object Read & Write S3 credential pair.
- A production domain or the Vercel project domain.
- For AI processing: a rotated Gemini key/model, a Supabase service-role key,
  and a generated cron secret. Account erasure also requires the service-role
  key and cron secret even when AI is disabled.

Database migration access is separate from application access. Do not add a
database password or migration token to Vercel. The service-role key is used
only by the internal AI and account-erasure workers and must remain server-only.

## 3. Import the project into Vercel

1. In Vercel, select **Add New > Project**.
2. Import `addin26/Student-doc-portal`.
3. Use these settings:

| Setting | Value |
| --- | --- |
| Framework preset | Next.js |
| Root directory | `.` |
| Production branch | `main` |
| Install command | `npm ci` |
| Build command | `npm run build` |
| Output directory | Leave blank; use the Next.js default |
| Node.js version | 20.x |

4. Do not deploy until the required environment variables below are present.

## 4. Environment variables

Configure values separately for Production, Preview, and Development. Preview
should use staging Supabase/R2 services whenever possible instead of production
data.

### Required public values

| Variable | Scope | Description |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Browser + server | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser + server | Supabase anonymous/publishable key; RLS remains mandatory |
| `NEXT_PUBLIC_SITE_URL` | Browser + server | Canonical origin without a trailing slash, for example `https://studydock.example.com` |

### Required server-only R2 values

| Variable | Scope | Description |
| --- | --- | --- |
| `CLOUDFLARE_R2_ACCOUNT_ID` | Server only | Cloudflare account ID |
| `CLOUDFLARE_R2_ACCESS_KEY_ID` | Server only | R2 S3 Access Key ID |
| `CLOUDFLARE_R2_SECRET_ACCESS_KEY` | Server only, sensitive | R2 S3 Secret Access Key |
| `CLOUDFLARE_R2_ENDPOINT` | Server only | `https://<account-id>.r2.cloudflarestorage.com` |
| `CLOUDFLARE_R2_BUCKET_NAME` | Server only | Private bucket name |
| `UPLOAD_MAX_BYTES` | Server only | Maximum accepted upload size in bytes; initial production value is `104857600` |
| `REQUIRE_VERIFIED_EMAIL_FOR_UPLOAD` | Server only | Keep `true` to require a Supabase-confirmed email before presign/finalize |
| `RATE_LIMIT_HASH_SECRET` | Server only, sensitive | Random value of at least 32 characters used to HMAC client IPs before combined account/IP rate limiting |

Do not configure a Cloudflare management API token in the application. It is
not the same as the R2 S3 Secret Access Key and cannot sign S3 requests.

### Optional server-only values

| Variable | Description |
| --- | --- |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only key used only by `/api/internal/process-ai` and `/api/internal/process-erasure`; never import into client code |
| `GEMINI_API_KEY` | Gemini API key used only by server-side AI processing |
| `GEMINI_MODEL` | Approved model name after AI processing is enabled |
| `CRON_SECRET` | Random server-only value of at least 32 characters; Vercel sends it as the cron Bearer credential |
| `AI_MAX_SOURCE_BYTES` | Maximum PDF bytes the worker reads; initial value `15728640` (15 MiB), hard-capped by code at 25 MiB |
| `SUPABASE_LEGACY_RESOURCE_BUCKET` | Optional legacy Supabase Storage bucket name used only while erasing pre-R2 private resources; leave empty when no legacy objects remain |
| `ACCOUNT_ERASURE_ENABLED` | Keep `false` until content-license, legal-hold, recovery, and retention policies are approved; set `true` only through a recorded production change |

AI is enabled only when both Gemini values are present. The AI worker additionally
requires the service-role key and cron secret. If Gemini is intentionally absent,
uploads and moderation remain usable and PDFs finalize with AI not requested.
The account-erasure worker still needs the service-role key and cron secret and
returns a safe disabled response unless `ACCOUNT_ERASURE_ENABLED=true`.
Do not enter placeholder text as a secret value.

### Vercel cron plan choice

The checked-in `vercel.json` runs AI at `02:00 UTC` and account erasure at
`03:00 UTC`, once daily each. Vercel Hobby currently rejects any individual
schedule that runs more than once per day. On Pro/Enterprise, the AI schedule
may be shortened after approving cost and queue monitoring; keep account
erasure bounded and monitored. Cron invokes production deployments only;
Preview testing must call the intended endpoint manually with
`Authorization: Bearer <CRON_SECRET>`.

## 5. Supabase configuration

### Apply database migrations

Apply migrations outside Vercel through an approved Supabase GitHub integration
or CI/operator workflow. The deployment order is:

1. back up the target database;
2. apply migrations to staging;
3. run RLS/RPC tests;
4. apply the reviewed migrations to production; and
5. deploy the compatible application build.

Never run unreviewed production DDL from a browser or Vercel client bundle.

### Configure authentication URLs

In **Supabase Dashboard > Authentication > URL Configuration**:

1. Set **Site URL** to the production `NEXT_PUBLIC_SITE_URL`.
2. Add the production callback:
   `https://<production-domain>/auth/callback`.
3. Add the local callback:
   `http://localhost:3000/auth/callback`.
4. Add only the preview callback pattern approved for the Vercel project.
   Avoid a broad wildcard that can match unrelated projects.
5. Configure email templates to return users to `/auth/callback`.

If Google or GitHub OAuth is enabled, configure the provider in Supabase and
add the provider callback URL displayed by Supabase to that provider's console.
Email/password authentication remains the required baseline.

## 6. Cloudflare R2 configuration

The bucket must be private. The database stores `storage_provider = 'r2'` and
the durable `storage_key`; it must not store expiring presigned URLs.

Configure R2 CORS using the exact public origins. Adapt this example rather than
copying placeholder domains into production:

```json
[
  {
    "AllowedOrigins": [
      "https://<production-domain>",
      "http://localhost:3000"
    ],
    "AllowedMethods": ["GET", "PUT", "HEAD"],
    "AllowedHeaders": ["Content-Type", "Content-Length", "x-amz-checksum-sha256"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

Before enabling uploads, run a staging smoke test:

1. request a presigned PUT as an authenticated user;
2. upload one uniquely named diagnostic object;
3. verify it with `HEAD`;
4. finalize the resource record;
5. request an authenticated presigned GET;
6. verify the download; and
7. delete the diagnostic database row and exact object.

## 7. Deploy

1. Run locally:

   ```powershell
   npm ci
   npm run typecheck
   npm run lint
   npm test
   npm run test:e2e
   npm run build
   ```

   GitHub CI repeats these checks and scans full Git history with Gitleaks. A
   passing local build does not replace the hosted secret scan or staging
   provider tests.

2. Commit and push to a non-production branch first.
3. Inspect the Vercel Preview deployment.
4. Complete the verification checklist below.
5. Merge to `main` to create the Production deployment.

Vercel automatically supplies `VERCEL_URL`, but application redirects should
use `NEXT_PUBLIC_SITE_URL` for the canonical production origin.

## 8. Post-deployment verification

- [ ] Home, Explore, Universities, Leaderboard, and resource pages render.
- [ ] Registration creates an Auth user and one profile.
- [ ] Email callback, login, logout, recovery, and reset redirects are allowed.
- [ ] Signed-out users are redirected from Dashboard, Upload, and Study Notes.
- [ ] Suspended users can read existing private notes but cannot mutate notes,
      upload, download, or request AI; deleted users cannot read protected data.
- [ ] Search returns only records allowed by RLS/moderation state.
- [ ] Presigned URL responses use HTTPS and do not expose R2 credentials.
- [ ] Upload and download work from the production origin.
- [ ] An unsupported or oversized file is rejected server-side.
- [ ] Private notes are inaccessible to a second test user.
- [ ] Server logs contain no JWTs, signed URLs, reset tokens, or secrets.
- [ ] AI absence/failure does not break upload or resource viewing.
- [ ] An authorized worker call processes one queued PDF; a wrong cron secret returns 401.
- [ ] Image-only/oversized PDFs fail AI safely and remain valid uploads.
- [ ] Upload presign/finalize rejects unverified email when the policy is enabled.
- [ ] Origin checks reject cross-site mutation attempts and account/IP rate limits return 429 safely.
- [ ] Logical account deletion schedules a 30-day erasure job; reactivation cancels it during the hold.
- [ ] An authorized erasure worker removes private data and unapproved objects in bounded batches while approved resources become anonymous.
- [ ] Final privacy, terms, uploader licence, copyright/takedown, support-contact,
      retention, and moderation policies replace the clearly marked pre-launch
      notices on `/platform-info` before public uploads are enabled.

## 9. Rollback and secret rotation

- Roll back the Vercel deployment to the previous known-good deployment before
  attempting emergency code edits.
- Disable unsafe features through their approved flag/configuration.
- Use migration-specific compensating SQL only after it passes staging review.
- Reconcile R2 objects and database rows before deleting unmatched data.
- Rotate any key pasted into chat, screenshots, tickets, logs, or Git history.
- After rotating R2/Gemini credentials, update Vercel secrets and redeploy.

## 10. References

- Supabase SSR Auth: <https://supabase.com/docs/guides/auth/server-side/creating-a-client?framework=nextjs>
- Supabase redirect URLs: <https://supabase.com/docs/guides/auth/redirect-urls>
- Supabase deployment: <https://supabase.com/docs/guides/deployment>
- Vercel environment variables: <https://vercel.com/docs/environment-variables>
- Vercel cron management: <https://vercel.com/docs/cron-jobs/manage-cron-jobs>
- Vercel cron plan limits: <https://vercel.com/docs/cron-jobs/usage-and-pricing>
- Cloudflare R2 S3 API: <https://developers.cloudflare.com/r2/api/s3/api/>
- Cloudflare R2 CORS: <https://developers.cloudflare.com/r2/buckets/cors/>
