# 🎯 PromoHunter

> Your personal AI-powered promo code & discount hunting companion.

![PWA Ready](https://img.shields.io/badge/PWA-Ready-ff6b35?style=flat-square)
![MIT License](https://img.shields.io/badge/License-MIT-green?style=flat-square)
![No Backend](https://img.shields.io/badge/Backend-None-blue?style=flat-square)
![Offline First](https://img.shields.io/badge/Offline-First-purple?style=flat-square)

---

## ✨ Features

- 🤖 **AI Promo Hunt** — Scrapes live coupon sites + uses Claude AI to find real codes
- 🎫 **Code Collection** — Save, organise, and manage all your promo codes in one place
- 🌏 **Region Aware** — Optimised for Australia, US, UK, NZ, CA, SG
- ⚡ **Expiry Tracking** — Warns you when deals are about to expire
- 🗂️ **Smart Filtering** — Filter by category, status, or search by store name
- ⭐ **Favourites** — Star your best codes for quick access
- ✅ **Used Tracking** — Mark codes as used so you always know what's left
- 🌙 **Dark Mode** — Toggle in Settings
- 📱 **PWA** — Install to home screen for a native app feel
- 🔒 **100% Private** — All data stays on your device, no accounts needed

---

## 🚀 Complete Setup Guide

Setting up PromoHunter has three parts:

1. **Deploy the PWA** — the app itself (GitHub Pages, free)
2. **Set up the Cloudflare Worker** — enables live coupon scraping on iPhone (free)
3. **Get an Anthropic API key** — powers the AI search (pay-as-you-go, ~$0.05/search)

---

### Part 1 — Deploy the PWA

#### Option A: GitHub Pages (Recommended)

1. Create a new repository on [github.com](https://github.com)
2. Upload all files from `promohunter-app.zip` to the repo root:
   - `index.html`
   - `favicon.svg`
   - `icon-192.png`
   - `README.md`
   - `PRIVACY.md`
   - `LICENSE`
   - `.gitignore`
3. Go to repo **Settings → Pages**
4. Set source to **main branch / root**
5. Click **Save**
6. Your app is live at `https://yourusername.github.io/repo-name`

#### Option B: Any Static Host

Upload all files from `promohunter-app.zip` to Netlify, Vercel, or Cloudflare Pages.

---

### Part 2 — Set Up the Cloudflare Worker

> **Required for iPhone.** iOS Safari blocks direct API calls — the Worker is the bridge between the app and Anthropic. Without it, AI Hunt will not work on iPhone.

#### Step 1 — Sign up for Cloudflare (free)
Go to [dash.cloudflare.com](https://dash.cloudflare.com) and create a free account.

#### Step 2 — Create the Worker

1. Go to **Workers & Pages → Create application**
2. Click the **Workers** tab
3. Click **Start with Hello World**
4. Name it `promohunter-worker`
5. Click **Deploy**
6. Click **Edit code**
7. Select all existing code → delete
8. Open `worker.js` from `promohunter-worker.zip` → copy all → paste
9. Click **Deploy**

Your worker URL will be: `https://promohunter-worker.yourname.workers.dev`

#### Step 3 (Optional) — Auto-deploy from GitHub

If you want the worker to auto-deploy whenever you push to GitHub:

1. Add these files from `promohunter-worker.zip` to your GitHub repo:
   - `worker.js`
   - `wrangler.toml`
   - `package.json`
   - `.github/workflows/deploy-worker.yml`

2. Get your **Cloudflare Account ID**
   - Go to [dash.cloudflare.com](https://dash.cloudflare.com)
   - Your Account ID is shown in the right sidebar

3. Create a **Cloudflare API Token**
   - Go to [dash.cloudflare.com/profile/api-tokens](https://dash.cloudflare.com/profile/api-tokens)
   - Click **Create Token**
   - Use the **Edit Cloudflare Workers** template
   - Click **Continue to summary → Create Token**
   - Copy the token (shown once only)

4. Add secrets to your GitHub repo
   - Go to repo **Settings → Secrets and variables → Actions**
   - Add `CLOUDFLARE_API_TOKEN` → paste your token
   - Add `CLOUDFLARE_ACCOUNT_ID` → paste your account ID

5. Push to `main` — GitHub Actions will auto-deploy the worker

#### Step 4 — Add Worker URL to the App

1. Open PromoHunter
2. Tap **⚙️ Settings → Cloudflare Worker URL**
3. Paste your worker URL (e.g. `https://promohunter-worker.yourname.workers.dev`)
4. Tap **Test** — you should see ✅ Worker is connected and working!
5. Tap **Save**

---

### Part 3 — Get an Anthropic API Key

The AI Hunt feature uses Claude to find and extract promo codes.

1. Go to [console.anthropic.com](https://console.anthropic.com) and sign up
2. Go to **Billing** and add a credit card (minimum $5 top-up)
3. Go to **API Keys → Create Key**
4. Copy the key (starts with `sk-ant-...`)
5. In PromoHunter, tap **⚙️ Settings → Anthropic API key**
6. Paste your key → tap **Save & use key**

**Cost:** Each AI Hunt search costs approximately $0.03–0.06 AUD. A $5 credit lasts hundreds of searches.

---

## 📱 Installing as a PWA

### iPhone (Safari) — Recommended
1. Open the app URL in **Safari** (not Chrome)
2. Tap the **Share** button (box with arrow at bottom)
3. Scroll down and tap **Add to Home Screen**
4. Tap **Add**
5. The app appears on your home screen like a native app

### Android (Chrome)
1. Open the app in Chrome
2. Tap **⋮ menu → Install app** or **Add to Home Screen**

### Desktop (Chrome / Edge)
1. Open the app in your browser
2. Click the **install icon** (➕) in the address bar
3. Click **Install**

---

## 🤖 How AI Hunt Works

```
iPhone
  │
  ▼
PromoHunter PWA
  │  POST /hunt { store, region, apiKey }
  ▼
Cloudflare Worker  ←  scrapes OzBargain, RetailMeNot, Groupon, Picodi
  │  real coupon page content
  ▼
Anthropic Claude API  ←  extracts codes from scraped content
  │  structured JSON deals
  ▼
Results shown in app
```

Results show either:
- 🟢 **Live — scraped from coupon sites** — codes found on real coupon pages
- 🟡 **From AI training knowledge** — Claude's best knowledge when scraping yields nothing

---

## 🛠️ Tech Stack

| Technology | Purpose |
|---|---|
| React 18 (CDN) | UI framework — no build step needed |
| Babel Standalone | JSX transpilation in-browser |
| localStorage | All data persistence |
| Service Worker | Offline support & caching |
| Cloudflare Workers | Server-side scraping (no CORS issues) |
| Anthropic Claude API | AI code extraction |
| GitHub Pages | Free app hosting |

---

## 📁 Project Structure

```
promohunter-app.zip          ← Deploy this as your PWA
├── index.html               ← Entire application (single file)
├── favicon.svg              ← App icon
├── icon-192.png             ← PWA home screen icon
├── README.md
├── PRIVACY.md
├── LICENSE
└── .gitignore

promohunter-worker.zip       ← Deploy this to Cloudflare
├── worker.js                ← Cloudflare Worker (scraping + Claude)
├── wrangler.toml            ← Worker config
├── package.json
└── .github/
    └── workflows/
        └── deploy-worker.yml  ← Auto-deploy from GitHub
```

---

## 💰 Cost Summary

| Service | Cost |
|---|---|
| GitHub Pages | Free |
| Cloudflare Worker | Free (100k requests/day) |
| Anthropic API | ~$0.03–0.06 per AI Hunt search |

A $5 API credit covers hundreds of searches and doesn't expire.

---

## 🔒 Privacy & Data Protection

PromoHunter is built with a **privacy-first** approach. Here's exactly what happens to your data:

### What stays on your device
| Data | Where stored | Leaves your device? |
|---|---|---|
| Your saved promo codes | Browser `localStorage` | Never |
| Your API key | Browser `localStorage` | Only to `api.anthropic.com` |
| Your Worker URL | Browser `localStorage` | Never |
| Dark mode / settings | Browser `localStorage` | Never |
| Onboarding status | Browser `localStorage` | Never |

### What gets sent where
| Request | Sent to | Why |
|---|---|---|
| AI Hunt search query | Your Cloudflare Worker | To scrape coupon sites |
| Coupon site requests | OzBargain, RetailMeNot etc | To find live deals |
| Claude AI request | `api.anthropic.com` | To extract codes from scraped content |
| App assets (React, fonts) | CDN (unpkg, Google Fonts) | To load the app |

### What is never collected
- ❌ No user accounts or registration
- ❌ No analytics or tracking scripts
- ❌ No cookies
- ❌ No advertising
- ❌ No data sent to any PromoHunter server (there isn't one)
- ❌ The Cloudflare Worker never logs, stores, or records your API key or searches

### Your API key
Your Anthropic API key is stored only in your browser's `localStorage`. It is:
- Never hardcoded in the app
- Never sent to any server except `api.anthropic.com` (Anthropic's own servers)
- Removed immediately when you tap "Remove saved key" in Settings
- Never visible in network requests to the Cloudflare Worker beyond the encrypted HTTPS connection

### Cloudflare Worker
The Worker acts as a relay — it receives your search query, fetches coupon sites, and calls the Anthropic API. It does **not** log requests, store queries, or retain your API key between requests. You can inspect the full Worker source code in `worker.js`.

### Deleting your data
All data can be deleted directly from the app:
- Individual promos: swipe or tap 🗑 on any promo card
- All promos: ⚙️ Settings → Clear all promos
- API key: ⚙️ Settings → Anthropic API key → Remove saved key
- Worker URL: ⚙️ Settings → Cloudflare Worker URL → Remove
- Everything: clear your browser's site data for the app URL

See [PRIVACY.md](./PRIVACY.md) for the full privacy policy.

---

## 🤝 Contributing

Contributions welcome! Open an issue or pull request on GitHub.

---

## 📄 License

MIT License — see [LICENSE](./LICENSE) for details.
Copyright (c) 2025 PromoHunter
