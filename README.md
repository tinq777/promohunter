# 🎯 PromoHunter

> Your personal AI-powered promo code & discount hunting companion.

![PWA Ready](https://img.shields.io/badge/PWA-Ready-ff6b35?style=flat-square)
![MIT License](https://img.shields.io/badge/License-MIT-green?style=flat-square)
![No Backend](https://img.shields.io/badge/Backend-None-blue?style=flat-square)
![Offline First](https://img.shields.io/badge/Offline-First-purple?style=flat-square)

---

## ✨ Features

- 🤖 **AI Promo Hunt** — Ask the AI to find realistic promo codes for any store or service
- 🎫 **Code Collection** — Save, organise, and manage all your promo codes in one place
- ⚡ **Expiry Tracking** — Get warned when your best deals are about to expire
- 🗂️ **Smart Filtering** — Filter by category, status (active/used/expired), or search by name
- ⭐ **Favourites** — Star your best codes for quick access
- ✅ **Used Tracking** — Mark codes as used so you always know what's left
- 💾 **Local Backup** — Export your collection as JSON, restore anytime
- 📱 **PWA** — Install to home screen for a native app feel
- 🔒 **100% Private** — All data stays on your device, no accounts needed

---

## 🚀 Getting Started

### Option 1: GitHub Pages (Recommended)

1. Fork this repo or upload the files to a new GitHub repository
2. Go to **Settings → Pages**
3. Set source to **main branch / root**
4. Click **Save** — your app will be live at `https://yourusername.github.io/promohunter`

### Option 2: Local

```bash
# Clone or download the files
# Open index.html in your browser — that's it!
open index.html
```

### Option 3: Any Static Host

Upload all files to Netlify, Vercel, Cloudflare Pages, or any static hosting provider.

---

## 📱 Installing as a PWA

### iOS (Safari)
1. Open the app in Safari
2. Tap the **Share** button (box with arrow)
3. Scroll down and tap **Add to Home Screen**
4. Tap **Add**

### Android (Chrome)
1. Open the app in Chrome
2. Tap the **⋮** menu
3. Tap **Install app** or **Add to Home Screen**

### Desktop (Chrome / Edge)
1. Open the app in your browser
2. Click the **install icon** (➕) in the address bar
3. Click **Install**

---

## 🛠️ Tech Stack

| Technology | Purpose |
|---|---|
| React 18 | UI framework (via CDN, no build step) |
| Babel Standalone | JSX transpilation in-browser |
| localStorage | All data persistence |
| Service Worker | Offline support & caching |
| Anthropic Claude API | AI-powered promo hunting |
| Google Fonts (Syne + Space Mono) | Typography |

---

## 📁 Project Structure

```
promohunter/
├── index.html        ← Entire application (single file)
├── favicon.svg       ← App icon (SVG)
├── icon-192.png      ← PWA icon (192×192 PNG)
├── README.md         ← This file
├── PRIVACY.md        ← Privacy policy
├── LICENSE           ← MIT license
└── .gitignore        ← Standard ignores
```

---

## 🤖 About the AI Hunt Feature

The AI Hunt feature uses the Anthropic Claude API to generate realistic promo code suggestions for any store or service you specify. 

**Important:** AI-generated codes are suggestions based on common promo code patterns. They may or may not work at checkout. Always verify codes before relying on them for purchases. The app clearly marks AI-generated codes as unverified.

---

## 🔒 Privacy

PromoHunter is 100% private by design:
- No user accounts
- No tracking or analytics  
- No data sent to any server (except CDN for app assets)
- All promo data stored in your browser's localStorage
- AI Hunt calls the Anthropic API directly from your browser with your query only

See [PRIVACY.md](./PRIVACY.md) for full details.

---

## 🤝 Contributing

Contributions welcome! Please open an issue or pull request on GitHub.

1. Fork the repo
2. Make your changes to `index.html`
3. Test locally
4. Open a PR

---

## 📄 License

MIT License — see [LICENSE](./LICENSE) for details.

Copyright (c) 2025 PromoHunter
