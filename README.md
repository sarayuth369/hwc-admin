# HWC Admin Manager

Admin web dashboard for HWC (Health & Wellness Companion). Vite + React + TypeScript +
Tailwind, deployed as a static SPA to Cloudflare Pages.

- **Live**: https://hwc-admin.pages.dev
- **Backend**: privileged operations go through `bkknex-health-worker`'s `/api/admin/*`
  routes (separate repo: [bkknex369-create/bkknex-worker](https://github.com/bkknex369-create/bkknex-worker)).
  This app only ever holds a normal Supabase session (anon/publishable key) — it never
  receives the service-role key or any Cloudflare/Supabase secret.
- **Database**: `supabase/migrations/0001_admin_manager.sql` — adds `profiles.is_admin`/
  `status`, the `admin_audit_log` table, RLS, and a trigger that blocks any non-service-role
  write to `is_admin`/`status`. Run once against the HWC Supabase project
  (`yqnzaapmznfeqdsevpyh`) via the SQL Editor.

## Local development

```bash
npm install
cp .env.example .env.production   # fill in the real (non-secret) Supabase URL/anon key
npm run dev
```

## Build & deploy

```bash
npm run build
npx wrangler pages deploy dist --project-name=hwc-admin --branch=main
```

Deploys to the `hwc-admin` Cloudflare Pages project under the HWC Cloudflare account
(`bkknex369@gmail.com`).

## Architecture

See `D:\FlutterProjects\gpt-claude\HWC_REPORT.md` (HWC Admin Manager entry) for the full
security model, required Supabase/Worker setup, and current limitations.
