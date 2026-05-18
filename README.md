# PromoHunter Worker

Cloudflare Worker that scrapes coupon sites server-side and calls the Anthropic API.
No CORS issues, no blocked requests — runs on Cloudflare's global edge network.

**Free tier covers:** 100,000 requests/day — more than enough for personal use.

---

## Deploy in 5 minutes

### 1. Sign up for Cloudflare (free)
Go to https://dash.cloudflare.com and create a free account.

### 2. Install Wrangler (Cloudflare's CLI)
```bash
npm install -g wrangler
```

### 3. Log in
```bash
wrangler login
```
This opens a browser tab — click Authorise.

### 4. Deploy
```bash
cd promohunter-worker
npm install
npm run deploy
```

You'll see output like:
```
Published promohunter-worker (1.23 sec)
  https://promohunter-worker.<your-subdomain>.workers.dev
```

### 5. Copy your worker URL
It will look like:
```
https://promohunter-worker.yourname.workers.dev
```

### 6. Add it to PromoHunter
Open the app → ⚙️ Settings → Worker URL → paste your URL → Save.

That's it. AI Hunt will now scrape live coupon sites before asking Claude.

---

## How it works

```
[PromoHunter App]
      │
      │ POST /hunt { store, region, category, apiKey }
      ▼
[Cloudflare Worker]  ← no CORS restrictions
      │
      ├─ fetch OzBargain, RetailMeNot, Groupon, Picodi (parallel)
      │  (server-side, full browser User-Agent, no blocks)
      │
      ├─ strip HTML, combine scraped text
      │
      ├─ POST to api.anthropic.com with scraped content
      │  "Extract all codes from this real content..."
      │
      └─ return { deals: [...], source: "scraped"|"knowledge" }
```

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | / | Health check |
| POST | /hunt | Main hunt endpoint |

### POST /hunt body
```json
{
  "store": "Wilson Parking",
  "region": "AU",
  "category": "travel",
  "apiKey": "sk-ant-..."
}
```

### Response
```json
{
  "deals": [
    {
      "store": "Wilson Parking",
      "code": "MERLIN",
      "discount": "20% off",
      "type": "Percentage",
      "category": "travel",
      "notes": "Found on OzBargain — apply at checkout",
      "verified": true,
      "expiresAt": "2025-12-31",
      "sourceUrl": "https://www.ozbargain.com.au/..."
    }
  ],
  "source": "scraped",
  "scraped": 14823
}
```

## Security

- Your Anthropic API key is sent from the app to the worker over HTTPS
- The worker calls Anthropic directly — your key is never logged or stored
- For extra security you can add a `WORKER_SECRET` env var and check it in the worker

## Cost

- **Cloudflare Worker:** Free up to 100k requests/day
- **Anthropic API:** ~$0.03–0.06 per hunt (same as before, charged to your account)

## Local development

```bash
wrangler dev
```

Worker runs at http://localhost:8787
