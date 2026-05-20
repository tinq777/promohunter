/**
 * PromoHunter Cloudflare Worker
 * Scrapes coupon sites + calls Anthropic API server-side (no CORS issues)
 *
 * POST /hunt  { store, region, category, apiKey }
 * GET  /      health check
 */

// ─── Helpers (defined first) ──────────────────────────────────────────────────
const slug = str =>
  str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const stripHtml = html =>
  html.replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim();

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Worker-Token',
};

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });

// ─── Coupon sources per region ────────────────────────────────────────────────
// Note: RetailMeNot AU was shut down in 2018 — not included.
// Sources chosen for server-side fetchability and AU relevance.
const SOURCES = {
  AU: store => [
    // #1 — OzBargain: AU's largest deal community, excellent for promo codes
    `https://www.ozbargain.com.au/search/node/${encodeURIComponent(store)}?sort=date`,
    // #2 — Buckscoop: AU-specific promo code community
    `https://www.buckscoop.com.au/coupons/${slug(store)}`,
    // #3 — ShopBack AU: major cashback + coupon site
    `https://www.shopback.com.au/${slug(store)}`,
    // #4 — CupoNation AU: large coupon aggregator active in AU
    `https://www.cuponation.com.au/discounts/${slug(store)}`,
    // #5 — TopBargains: AU deal forum with promo codes
    `https://www.topbargains.com.au/store/${slug(store)}`,
    // #6 — Couponbirds: global aggregator with good AU coverage
    `https://www.couponbirds.com/codes/${slug(store)}-au`,
    // #7 — Frugal Feeds: AU coupon aggregator
    `https://frugalfeeds.com.au/coupons/${slug(store)}`,
    // #8 — Groupon AU: deals and vouchers
    `https://www.groupon.com.au/coupons/${slug(store)}`,
  ],
  US: store => [
    `https://www.retailmenot.com/view/${slug(store)}.com`,
    `https://www.groupon.com/coupons/${slug(store)}`,
    `https://www.coupons.com/coupon-codes/${slug(store)}`,
    `https://www.couponbirds.com/codes/${slug(store)}`,
    `https://www.honey.com/promo-codes/${slug(store)}`,
    `https://slickdeals.net/slickdeals-promo-codes/${slug(store)}-promo-code/`,
  ],
  UK: store => [
    `https://www.retailmenot.com/view/${slug(store)}.co.uk`,
    `https://www.vouchercodes.co.uk/${slug(store)}.com`,
    `https://www.groupon.co.uk/coupons/${slug(store)}`,
    `https://www.couponbirds.com/codes/${slug(store)}-uk`,
    `https://www.picodi.com/gb/s/${slug(store)}`,
  ],
  NZ: store => [
    `https://www.retailmenot.com/view/${slug(store)}.co.nz`,
    `https://www.picodi.com/nz/s/${slug(store)}`,
    `https://www.couponbirds.com/codes/${slug(store)}-nz`,
    `https://www.shopback.co.nz/${slug(store)}`,
  ],
  CA: store => [
    `https://www.retailmenot.com/view/${slug(store)}.ca`,
    `https://www.groupon.ca/coupons/${slug(store)}`,
    `https://www.couponbirds.com/codes/${slug(store)}-ca`,
    `https://www.redflagdeals.com/stores/${slug(store)}/`,
  ],
  SG: store => [
    `https://www.shopback.com.sg/${slug(store)}`,
    `https://www.picodi.com/sg/s/${slug(store)}`,
    `https://www.couponbirds.com/codes/${slug(store)}-sg`,
    `https://www.retailmenot.com/view/${slug(store)}.com.sg`,
  ],
};

const REGION_CONTEXT = {
  AU: "Australia (AUD). Key AU retailers: JB Hi-Fi, The Iconic, Chemist Warehouse, Kogan, Catch, Myer, David Jones, Cotton On, Woolworths, Coles, Menulog, DoorDash AU, Bunnings, Harvey Norman, Officeworks, Dan Murphy's, BCF, rebel sport, Wilson Parking, Secure Parking.",
  US: 'United States (USD). Key retailers: Amazon, Target, Walmart, Best Buy, Nike, Gap, DoorDash, Uber Eats.',
  UK: 'United Kingdom (GBP). Key retailers: ASOS, Boots, Argos, John Lewis, Deliveroo, Just Eat, Currys.',
  NZ: "New Zealand (NZD). Key retailers: The Warehouse, Farmers, Noel Leeming, PB Tech, Countdown.",
  CA: "Canada (CAD). Key retailers: Canadian Tire, Sport Chek, Hudson's Bay, Indigo, Skip The Dishes.",
  SG: 'Singapore (SGD). Key retailers: Lazada, Shopee, FairPrice, Redmart, Grab Food.',
};

// ─── Fetch one HTML page ──────────────────────────────────────────────────────
async function fetchPage(url) {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-AU,en;q=0.9',
      },
      signal: AbortSignal.timeout(7000),
    });
    if (!res.ok) return '';
    const text = await res.text();
    return stripHtml(text).slice(0, 3000);
  } catch {
    return '';
  }
}

// ─── Reddit JSON API — no auth needed, returns structured posts ───────────────
async function fetchReddit(store, region) {
  const subreddits = {
    AU: ['AusDeals', 'AUfrugal', 'australia'],
    US: ['deals', 'frugal', 'coupons'],
    UK: ['HotUKDeals', 'UKPersonalFinance'],
    NZ: ['newzealand', 'NZDeals'],
    CA: ['RedFlagDeals', 'PersonalFinanceCanada'],
    SG: ['singapore'],
  };
  const subs = subreddits[region] || subreddits.AU;
  const results = await Promise.allSettled(
    subs.map(sub =>
      fetch(`https://www.reddit.com/r/${sub}/search.json?q=${encodeURIComponent(store + ' promo code discount voucher')}&sort=new&limit=10&restrict_sr=1`, {
        headers: { 'User-Agent': 'PromoHunter/1.0' },
        signal: AbortSignal.timeout(6000),
      })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d?.data?.children) return '';
        return d.data.children
          .map(p => `${p.data.title}\n${p.data.selftext || ''}`)
          .join('\n---\n')
          .slice(0, 4000);
      })
      .catch(() => '')
    )
  );
  return results
    .map(r => r.status === 'fulfilled' ? r.value : '')
    .filter(s => s.length > 30)
    .join('\n\n');
}

// ─── Store's own promo/offers page — official source ─────────────────────────
async function fetchStorePromoPage(store, region) {
  const tld = { AU:'.com.au', US:'.com', UK:'.co.uk', NZ:'.co.nz', CA:'.ca', SG:'.com.sg' };
  const ext = tld[region] || '.com';
  const base = `https://www.${slug(store)}${ext}`;
  // Try common promo page URL patterns
  const paths = ['/promotions', '/offers', '/deals', '/specials', '/discount', '/vouchers', '/promo', '/sale'];
  const urls = paths.map(p => base + p);
  const results = await Promise.allSettled(
    urls.map(url =>
      fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
        },
        signal: AbortSignal.timeout(5000),
      })
      .then(r => r.ok ? r.text() : '')
      .then(t => t ? stripHtml(t).slice(0, 2000) : '')
      .catch(() => '')
    )
  );
  return results
    .map(r => r.status === 'fulfilled' ? r.value : '')
    .filter(s => s.length > 100)
    .slice(0, 2) // max 2 store pages to keep within budget
    .join('\n\n---\n\n');
}

// ─── Google search scrape — surfaces codes from across the web ────────────────
async function fetchGoogleSearch(store, region) {
  const regionHint = { AU:'australia', US:'usa', UK:'uk', NZ:'new zealand', CA:'canada', SG:'singapore' };
  const hint = regionHint[region] || '';
  const query = `${store} promo code voucher discount ${hint} ${new Date().getFullYear()}`;
  try {
    const res = await fetch(`https://www.google.com/search?q=${encodeURIComponent(query)}&num=10&hl=en`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-AU,en;q=0.9',
      },
      signal: AbortSignal.timeout(7000),
    });
    if (!res.ok) return '';
    const text = await res.text();
    return stripHtml(text).slice(0, 4000);
  } catch {
    return '';
  }
}

// ─── Scrape all sources in parallel ──────────────────────────────────────────
async function scrape(store, region) {
  // Run all source types concurrently
  const [
    couponPages,
    redditContent,
    storePromoContent,
    googleContent,
  ] = await Promise.allSettled([
    // Coupon sites
    Promise.allSettled((SOURCES[region] || SOURCES.AU)(store).map(fetchPage))
      .then(results => results
        .map(r => r.status === 'fulfilled' ? r.value : '')
        .filter(s => s.length > 50)
        .join('\n\n---\n\n')
      ),
    // Reddit
    fetchReddit(store, region),
    // Store's own promo page
    fetchStorePromoPage(store, region),
    // Google search
    fetchGoogleSearch(store, region),
  ]);

  const sections = [
    couponPages.status === 'fulfilled' && couponPages.value
      ? `=== COUPON SITES ===\n${couponPages.value}` : '',
    redditContent.status === 'fulfilled' && redditContent.value
      ? `=== REDDIT COMMUNITY POSTS ===\n${redditContent.value}` : '',
    storePromoContent.status === 'fulfilled' && storePromoContent.value
      ? `=== STORE PROMO PAGE ===\n${storePromoContent.value}` : '',
    googleContent.status === 'fulfilled' && googleContent.value
      ? `=== GOOGLE SEARCH RESULTS ===\n${googleContent.value}` : '',
  ].filter(Boolean);

  return sections.join('\n\n').slice(0, 24000);
}

// ─── Build Claude prompt ──────────────────────────────────────────────────────
function buildPrompt(store, region, category, scraped) {
  const ctx   = REGION_CONTEXT[region] || REGION_CONTEXT.AU;
  const today = new Date().toDateString();
  const year  = new Date().getFullYear();

  // Expiry date rules injected into every prompt
  const expiryRule = `IMPORTANT — expiresAt field:
- If a specific expiry date is mentioned, use it in YYYY-MM-DD format
- If no date is mentioned but the deal is seasonal (e.g. Christmas, EOFY, Easter), estimate a realistic end date
- If it looks like an ongoing/permanent code, set expiresAt to the end of this year (${year}-12-31)
- If it's a limited-time or flash deal, estimate 7-14 days from today
- NEVER leave expiresAt empty — always provide a best-estimate date`;

  const schema = `{"store":"${store}","code":"PROMOCODE or empty string if auto-applied","discount":"e.g. 20% off or Free delivery or $10 off","type":"Percentage|Fixed Amount|BOGO|Free Shipping|Free Trial|Other","category":"${category}","notes":"restrictions and source info","verified":true or false,"expiresAt":"YYYY-MM-DD — required, always estimate if unknown","sourceUrl":"url or empty string"}`;

  if (scraped.length > 200) {
    return `You are PromoHunter AI. Extract every promo code and deal for "${store}" from the scraped content below.

Region: ${ctx}
Today: ${today}

The content below comes from multiple sources — coupon sites, Reddit community posts, the store's own promo page, and Google search results. Each section is labelled.

=== SCRAPED CONTENT ===
${scraped}
=== END ===

Extract ALL codes, discounts and deals found across ALL sections. Reddit posts and store promo pages often have the most accurate and up-to-date codes.
Also add codes from your training knowledge not already in the content.
For parking companies (Wilson Parking, Secure Parking etc) also include: MERLIN, EARLYBIRD, FLEXI, FLEXI15, WEEKEND, MONTHLY.

${expiryRule}

Return ONLY a valid JSON array. No markdown, no backticks, no explanation.
Each item: ${schema}
Up to 10 results. If nothing found return [].`;
  }

  return `You are PromoHunter AI, an expert in ${ctx}

Find ALL known promo codes and deals for "${store}" in ${region} (${category}).
Today: ${today}

Consider: loyalty programs, app codes, partner discounts, seasonal promos, welcome codes.
For parking companies: include MERLIN, EARLYBIRD, FLEXI, FLEXI15, WEEKEND, MONTHLY and any others you know.
Include uncertain codes with verified:false and note "Worth trying".
Do NOT invent codes you have no knowledge of.

${expiryRule}

Return ONLY a valid JSON array. No markdown, no backticks, no explanation.
Each item: ${schema}
Up to 10 results. If no knowledge of real codes return [].`;
}

// ─── Call Anthropic API ───────────────────────────────────────────────────────
async function callClaude(prompt, apiKey) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5',
      max_tokens: 3000,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const isAuth = res.status === 401 || err?.error?.type === 'authentication_error';
    throw Object.assign(new Error(err?.error?.message || `HTTP ${res.status}`), { isAuth });
  }

  const data = await res.json();
  const text = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
  const match = text.replace(/```json|```/g, '').match(/\[[\s\S]*\]/);
  if (!match) return [];
  try { return JSON.parse(match[0]); } catch { return []; }
}

// ─── Main handler ─────────────────────────────────────────────────────────────
export default {
  async fetch(request, env) {
    const method = request.method.toUpperCase();

    if (method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }

    const url = new URL(request.url);

    // ── Secret token check ────────────────────────────────────────────────────
    // WORKER_SECRET must be set as a Cloudflare environment variable.
    // All requests (except health check) are rejected without it.
    const secret = env.WORKER_SECRET;
    if (secret) {
      // Allow health check without token so Test Connection still works
      const isHealthCheck = url.pathname === '/' || url.pathname === '';
      if (!isHealthCheck) {
        const token = request.headers.get('X-Worker-Token');
        if (!token || token !== secret) {
          return json({ error: 'Unauthorised' }, 401);
        }
      }
    }

    // Health check
    if (url.pathname === '/' || url.pathname === '') {
      return json({ status: 'ok', service: 'PromoHunter Worker' });
    }

    if (url.pathname === '/hunt' && method === 'POST') {
      let body;
      try { body = await request.json(); }
      catch { return json({ error: 'Invalid JSON body' }, 400); }

      const { store, region = 'AU', category = 'retail', apiKey } = body || {};

      if (!store?.trim()) return json({ error: 'store is required' }, 400);
      if (!apiKey?.trim()) return json({ error: 'apiKey is required', auth: true }, 400);

      try {
        const scraped = await scrape(store.trim(), region);
        const source  = scraped.length > 200 ? 'scraped' : 'knowledge';
        const prompt  = buildPrompt(store.trim(), region, category, scraped);
        const deals   = await callClaude(prompt, apiKey.trim());
        return json({ deals, source, scraped: scraped.length });
      } catch (err) {
        return json({ error: err.message || 'Worker error', auth: !!err.isAuth }, err.isAuth ? 401 : 500);
      }
    }

    return json({ error: 'Not found' }, 404);
  },
};
