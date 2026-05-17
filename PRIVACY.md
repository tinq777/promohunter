# Privacy Policy — PromoHunter

**Last updated: May 2025**

---

## Overview

PromoHunter is designed with privacy as a core principle. We do not collect, transmit, or store any personal data on any server. Everything stays on your device.

---

## Data Collection

**We collect absolutely nothing.**

- No user accounts or registration required
- No email addresses, names, or personal identifiers collected
- No usage analytics or tracking
- No advertising or third-party tracking scripts
- No cookies of any kind

---

## Data Storage

All application data is stored exclusively in your browser's **localStorage**. This data never leaves your device unless you explicitly export a backup file.

### localStorage Keys Used

| Key | Contents |
|---|---|
| `promohunter_v1` | Your promo codes, searches, and app settings |
| `promohunter_backup_meta` | Backup history metadata (last backup date, frequency preference) |

You can view, export, or delete all stored data at any time from within the app.

---

## Network Requests

PromoHunter makes the following network requests:

### CDN Assets (App Loading)
These requests are made to load the application itself:

| Service | URL | Purpose |
|---|---|---|
| React | `unpkg.com` | UI framework |
| Babel | `unpkg.com` | JSX transpilation |
| Google Fonts | `fonts.googleapis.com`, `fonts.gstatic.com` | Typography (Syne, Space Mono) |

These are standard CDN requests and subject to those providers' respective privacy policies. No user data is included in these requests.

### AI Hunt Feature (Optional)
When you use the **AI Promo Hunt** feature:

- A request is sent to `api.anthropic.com`
- The request contains your search query (e.g. "Amazon discount codes") and selected category
- No personal information is included
- Anthropic's privacy policy applies: [anthropic.com/privacy](https://www.anthropic.com/privacy)

The AI Hunt feature only activates when you explicitly tap the **Hunt** button. No background requests are ever made.

---

## Your Data Rights

Since all data is stored locally on your device, you have complete control:

- **View**: All data visible within the app
- **Export**: Download a full JSON backup anytime
- **Delete**: Clear individual promos or all data via Settings
- **Portability**: Your backup JSON file is human-readable and portable

---

## Third-Party Links

PromoHunter may contain links to external stores and websites. These are provided for convenience. We have no control over and assume no responsibility for the privacy practices of any third-party sites.

---

## Changes to This Policy

If this privacy policy changes, the updated version will be available in the app repository:

**GitHub:** [github.com/promohunter/app](https://github.com/promohunter/app)

---

## Contact

For privacy questions, please open an issue on GitHub:
[github.com/promohunter/app/issues](https://github.com/promohunter/app/issues)

---

*PromoHunter is open-source software. You can inspect all code to verify these claims.*
