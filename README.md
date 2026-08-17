# WrapAsylum

## CI/CD

- **CI (GitHub Actions)**: runs on every PR and push to `main` — installs deps with Bun, generates the Prisma client, and typechecks all four packages.
- **Deploy (Render, free tier)**: the `server` package is deployed from `render.yaml` (blueprint) on push to `main`. The `cli` is local-only and never deployed.

### Deploying

1. Push the repo to GitHub (if not already) and connect it in the Render dashboard: **New → Blueprint** → pick the repo → Render reads `render.yaml`.
2. Fill in the secret env vars it asks for (marked `sync: false`):
   - `DATABASE_URL` — your Neon connection string (same as local `.env`)
   - `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` — provider keys used by the API
   - `LOCAL_MODEL_BASE_URL` — optional; local models can't reach your machine from the cloud, leave unset
3. Render deploys automatically on every push to `main`.

Notes:
- Free tier sleeps after 15 min of inactivity; the first request after waking takes ~30–60s.
- The CLI's `API_URL` env var can point at the deployed URL, or stay `http://localhost:3000` for local development.
