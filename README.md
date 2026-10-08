# Sorry Letter Studio

Static interactive gift renderer plus a Cloudflare Worker-backed Studio and Admin generator.

## Routes

- `/` — local fixture demo.
- `/gift/:projectId` — published public gift.
- `/studio/:projectId#token=...` — customer editor. The token is stored per project in `localStorage` and removed from the address bar.
- `/admin` — password-protected project generator and manager.

## Local development

Install dependencies and start the Vite app:

```powershell
npm ci
npm run dev
```

The browser app defaults to `http://127.0.0.1:8787` for the API. To run the Worker locally, copy `worker/.dev.vars.example` to `worker/.dev.vars`, set local secrets, replace the placeholder bindings in `worker/wrangler.toml`, then run:

```powershell
npm run worker:dev
```

For a different Worker URL, set `VITE_API_BASE_URL` before building the Vite app.

## Cloudflare bindings

- `GIFT_KV`: a new KV namespace used only by Sorry Letter.
- `MEDIA_BUCKET`: bucket R2 For You Always yang sama dengan Snoopy (`valentine-upload`). Objects are isolated below `sorry-letter/{projectId}/`, sehingga media antarproduk tidak bercampur.
- `MEDIA_BASE_URL`: normally `https://cdn.for-you-always.my.id`.
- `PUBLIC_GIFT_BASE_URL` and `PUBLIC_STUDIO_BASE_URL`: public Vite app origins.
- `ALLOWED_ORIGINS`: comma-separated exact origins.
- `ADMIN_SECRET` and `PROJECT_SIGNING_SECRET`: Wrangler secrets with no source-code defaults.

Pada mode lokal, URL hasil upload diarahkan ke endpoint `/api/media/...` milik Worker lokal. Karena itu thumbnail dan MP3 dapat dipreview tanpa mengunggah file percobaan ke R2 production. Pada Worker production, URL tetap memakai `MEDIA_BASE_URL` dan dilayani melalui CDN.

Published records and autosave drafts are stored separately. Autosave never changes the public gift until Publish or Publish Changes is pressed.

## Quality checks

```powershell
npm run check
```

The check covers lint, app and Worker type checks, schema/state-machine/Worker tests, production build, and browser QA across mobile, tablet, 1024×576, and wide desktop viewports.

## Deployment boundary

The local `.vercel/` link is intentionally absent. `vercel.json` only provides SPA rewrites. Relink and deployment must be done only after manual approval.
