# Resinaprint worker portal

Copy of the live site at https://resinaprint.netlify.app, downloaded 2026-11-13 so the code lives in this repo.

- `index.html`: the whole app (one file): owner/worker login codes, jobs, payments, wage report, Discord webhook posting, cloud sync.
- `cloud.json`: points the app at its sync API, a Cloudflare Worker at `resinaprint-api.celcriusdg.workers.dev`.
  The Worker's own code is **not** in this folder; it lives in the Cloudflare account it was deployed from.
- `sw.js`, `manifest.webmanifest`, icons, `logo.jpg`: offline support and the installable app.

To redeploy: drag this folder onto Netlify (Deploys tab), or link the site to this repo with `worker-portal` as the publish directory.
