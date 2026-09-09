# Ampere Atlas — EV Charging Demand Intelligence (Demo)

A demo dashboard for estimating EV charging demand and identifying white space
across India, with three role based views: charging network operator,
government and policy, and fleet or OEM. Runs entirely on a seeded dummy
dataset, no external API or database required.

## What is in this demo

- A single shared map (dark themed, custom styled) showing demand, supply, and
  gap scores across ten major Indian cities plus three highway corridors.
- A role switcher that changes the KPI figures and ranked table without
  touching the underlying data or map.
- All data lives in `lib/data.ts`, generated with a seeded random function so
  the numbers stay consistent across reloads. Replace this file with real
  data sources later without touching any UI code.

## Running locally

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`.

## Deploying to GitHub and Vercel

1. Initialize git and make the first commit:
   ```bash
   git init
   git add .
   git commit -m "Initial demo build"
   ```
2. Create a new repository on GitHub (via the website or `gh repo create`),
   then push:
   ```bash
   git remote add origin https://github.com/<your-username>/<repo-name>.git
   git branch -M main
   git push -u origin main
   ```
3. Go to [vercel.com](https://vercel.com), sign in with your GitHub account,
   and click **Add New Project**. Select the repository you just pushed.
   Vercel detects the Next.js setup automatically, no configuration is
   needed.
4. Click **Deploy**. Within a minute or two, Vercel gives you a public URL
   such as `https://<repo-name>.vercel.app`, which is the shareable link.
5. Every future push to the `main` branch redeploys automatically.

## A note on the security warning during install

`npm install` and `npm audit` flag some known issues in the Next.js 14 line.
For a client facing production build later, worth revisiting the Next.js
version or upgrading closer to release, since this demo intentionally stays
on a stable 14.x release for compatibility with the current component code.

## Swapping in real data later

Everything the UI needs comes from a handful of exported functions in
`lib/data.ts`: `operatorRows`, `governmentRows`, `fleetRows`, and their
matching `*Kpis` functions. Replacing the seeded generator with a real data
pipeline (Vahan registrations, actual charger locations, Census density,
etc.) only requires these functions to return data shaped the same way, the
map and tables need no changes.
