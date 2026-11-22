# Breeder's Assistant

An offline-first Progressive Web App (PWA) for gamefowl breeders: bird records, pedigrees, inbreeding checks, incubation tracking, a vaccination schedule and offline guides. It is built mobile-first for Android phones in the Philippines.

## Features

- **Bird registry**: band number, name, sex, bloodline, color, hatch date, photo, status and notes.
- **Pedigree**: 3-generation tree, offspring list and each bird's coefficient of inbreeding (COI).
- **Mating planner**: pick a sire and dam to see the chicks' expected COI, with hens ranked by relatedness to the chosen sire.
- **Incubation**: 21-day timeline (candling on days 7 and 14, lockdown on day 18, hatch on day 21), fertility and hatch rates, and one-tap chick registration with parents filled in automatically.
- **Health**: schedule based on age (defaults follow the BAI Newcastle disease program for game fowls and can be edited), a due/overdue list with bulk "given", and a treatment log.
- **Costs**: log feed and other expenses plus income (bird sales, eggs, stud service). Shows monthly or yearly totals by category, feed kg and average ₱/kg, cost per active bird, and one tap to repeat a recent entry.
- **Ratings & nick finder**: rate birds 1–5. The app flags pairs and bloodline crosses whose offspring beat what each parent produces with other mates. Labels are softened when there's little data.
- **Reminders**: one-time or repeating reminders for a bird, several birds or a pen, plus a "Today" checklist on Home. For real alarms, export to the phone calendar (.ics with alarms, or a Google Calendar link). In-app notifications show while the app is open.
- **Programs & routines**: built-in breeding-season programs (pre-breeding conditioning, molt care, hen recovery, chick-to-stag grow-out) with sources, plus a builder for your own multi-day routines. Starting one creates all its reminders.
- **Feeding by age**: stages from chick to adult (plus breeders and molt) with protein and calcium targets, using Philippine feeds. Includes a feed mix calculator that checks your own mix's protein against the target, and each bird's page shows its current feeding stage.
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
