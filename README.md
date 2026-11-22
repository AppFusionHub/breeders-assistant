# Breeder's Assistant

An offline-first Progressive Web App (PWA) for gamefowl breeders: bird records, pedigrees, inbreeding checks, incubation tracking, a vaccination schedule and offline guides. It is built mobile-first for Android phones in the Philippines.

## Features

- **Bird registry**: band number, name, sex, bloodline, color, hatch date, photo, status and notes.
- **Pedigree**: 3-generation tree, offspring list and each bird's coefficient of inbreeding (COI).
- **Mating planner**: pick a sire and dam to see the chicks' expected COI, with hens ranked by relatedness to the chosen sire.
- **Incubation**: 21-day timeline (candling on days 7 and 14, lockdown on day 18, hatch on day 21), fertility and hatch rates, and one-tap chick registration with parents filled in automatically.
- **Health**: schedule based on age (defaults follow the BAI Newcastle disease program for game fowls and can be edited), a due/overdue list with bulk "given", and a treatment log.
- **Guides** (offline): incubation, brooding, vaccination, biosecurity, disease signs, breeding systems and record keeping, with sources.
- **Backup**: JSON export/import (uses the share sheet on mobile). All data stays on the device in IndexedDB.

## Development

```bash
npm install
npm run dev       # local dev server
npm test          # unit tests (pedigree / COI math)
npm run build     # type-check + production build to dist/
npm run preview   # serve the built app
```

The app uses hash routing and relative asset paths, so `dist/` can be hosted on any static host (GitHub Pages, Netlify, Cloudflare Pages, Firebase Hosting). Installing as a PWA requires HTTPS.

## Stack

React 19, React Router (HashRouter), Dexie (IndexedDB), vite-plugin-pwa (Workbox), Vite and Vitest.

## Content disclaimer

The guides are general information, not veterinary advice. Check vaccination schedules against current BAI guidance and your veterinarian's advice.

## Deployment (GitHub Pages)

`.github/workflows/deploy.yml` tests, builds and deploys `dist/` to GitHub Pages on every push to `main` (or the current dev branch), and can also be run manually from the Actions tab.

One-time setup: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
The site will be at `https://<owner>.github.io/breeders-assistant/`.
