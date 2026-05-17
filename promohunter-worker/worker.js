/**
 * PromoHunter Cloudflare Worker
 * ─────────────────────────────
 * Receives a hunt request from the PWA, scrapes coupon sites server-side
 * (no CORS issues), passes real content to Claude, returns structured deals.
 *
 * POST /hunt
 * Body: { store, region, category, apiKey }
 * Returns: { deals: [...], source: "scraped"|"knowledge" }
 */

// ─── Coupon sources to scrape per region ─────────────────────────────────────
const SOURCES = {
  AU: (store) => [
    `https://www.ozbargain.com.au/search/node/${encodeURIComponent(store)}?sort=date`,
    `https://www.retailmenot.com/view/${encodeURIComponent(slug(store) + '.com.au')}`,
    `https://www.groupon.com.au/coupons/${encodeURIComponent(slug(store))}`,
    `https://www.picodi.com/au/s/${encodeURIComponent(slug(store))}`,
    `https://couponsnatch.com/coupons/${encodeURIComponent(slug(store))}`,
  ],
  US: (store) => [
    `https://www.retailmenot.com/view/${encodeURIComponent(slug(store) + '.com')}`,
    `https://www.groupon.com/coupons/${encodeURIComponent(slug(store))}`,
    `https://www.coupons.com/coupon-codes/${encodeURIComponent(slug(store))}`,
  ],
  UK: (store) => [
    `https://www.retailmenot.com/view/${encodeURIComponent(slug(store) + '.co.uk')}`,
    `https://www.vouchercodes.co.uk/${encodeURIComponent(slug(store))}.com`,
    `https://www.groupon.co.uk/coupons/${encodeURIComponent(slug(store))}`,
  ],
  NZ: (store) => [
    `https://www.retailmenot.com/view/${encodeURIComponent(slug(store) + '.co.nz')}`,
    `https://www.picodi.com/nz/s/${encodeURIComponent(slug(store))}`,
  ],
  CA: (store) => [
    `https://www.retailmenot.com/view/${encodeURIComponent(slug(store) + '.ca')}`,
    `https://www.groupon.ca/coupons/${encodeURIComponent(slug(store))}`,
  ],
  SG: (store) => [
    `https://www.picodi.com/sg/s/${encodeURIComponent(slug(store))}`,
    `https://www.retailmenot.com/view/${encodeURIComponent(slug(store) + '.com.sg')}`,
  ],
};

const slug = str => str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const stripHtml = html => html.replace(/<[^>]+>/g, ' ').replace(/\s{2,}/g, ' ').trim();

const REGION_CONTEXT = {
  AU: 'Australia (AUD). Major AU retailers: JB Hi-Fi, The Iconic, Chemist Warehouse, Kogan, Catch, Myer, David Jones, Cotton On, Woolworths, Coles, Menulog, DoorDash AU, Bunnings, Harvey Norman, Officeworks, Dan Murphy\'s, BCF, rebel sport, Wilson Parking, Secure Parking.',
  US: 'United States (USD). Major retailers: Amazon, Target, Walmart, Best Buy, Nike, Gap, DoorDash, Uber Eats.',
  UK: 'United Kingdom (GBP). Major retailers: ASOS, Boots, Argos, John Lewis, Deliveroo, Just Eat, Currys.',
  NZ: 'New Zealand (NZD). Major retailers: The Warehouse, Farmers, Noel Leeming, PB Tech, Countdown.',
  CA: 'Canada (CAD). Major retailers: Canadian Tire, Sport Chek, Hudson\'s Bay, Indigo, Skip The Dishes.',
  SG: 'Singapore (SGD). Major retailers: Lazada, Shopee, FairPrice, Redmart, Grab Food.',
};

// ─── Fetch a single URL with a realistic browser User-Agent ──────────────────
async function fetchPage(url) {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-AU,en;q=0.9',
        'Cache-Control': 'no-cache',
      },
      cf: { cacheEverything: false },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return '';
    const text = await res.text();
    return stripHtml(text).slice(0, 6000); // cap per source
  } catch {
    return '';
  }
}

// ─── Scrape all sources for a region in parallel ─────────────────────────────
async function scrape(store, region) {
  const urls = (SOURCES[region] || SOURCES.AU)(store);
  const results = await Promise.allSettled(urls.map(fetchPage));
  return results
    .map(r => r.status === 'fulfilled' ? r.value : '')
    .filter(Boolean)
    .join('\n\n---\n\n')
    .slice(0, 20000); // total cap
}

// ─── Build the Claude prompt ──────────────────────────────────────────────────
function buildPrompt({ store, region, category, scrapedContent }) {
  const ctx = REGION_CONTEXT[region] || REGION_CONTEXT.AU;
  const today = new Date().toDateString();

  if (scrapedContent && scrapedContent.length > 300) {
    return `You are PromoHunter AI. Extract every promo code, discount, and deal for "${store}" from the scraped web content below.

Region: ${ctx}
Category: ${category}
Today: ${today}

=== SCRAPED CONTENT ===
${scrapedContent}
=== END CONTENT ===

Extract ALL coupon codes, discount percentages, dollar amounts, free shipping offers, and any other deals found in the text above.
Also include any codes from your training knowledge for "${store}" that are NOT already in the scraped content.

For parking companies (Wilson Parking, Secure Parking etc) — also include known codes: MERLIN, EARLYBIRD, FLEXI, FLEXI15, WEEKEND, MONTHLY, and any others you know.

Return ONLY a valid JSON array. No markdown, no backticks.
Each item:
{"store":"${store}","code":"CODE or empty string if auto-applied","discount":"e.g. 20% off or Free delivery","type":"Percentage|Fixed Amount|BOGO|Free Shipping|Free Trial|Other","category":"${category}","notes":"restrictions, source, how to redeem","verified":true,"expiresAt":"YYYY-MM-DD or empty","sourceUrl":"url if found in content or empty"}

Return up to 10 results. If nothing found, return [].`;
  }

  // Fallback — no scraped content
  return `You are PromoHunter AI, an expert in ${ctx} retail discounts.

Find ALL known promo codes and deals for "${store}" in ${region} (${category}).
Today: ${today}

Think carefully about:
- Loyalty programs, app-exclusive codes, partner discounts
- Seasonal promotions, welcome codes, first-order discounts  
- For parking companies: MERLIN, EARLYBIRD, FLEXI, FLEXI15, WEEKEND, MONTHLY and similar codes
- Codes seen on OzBargain, RetailMeNot, or the store's own promotions page
- Include codes even if potentially expired — mark verified:false and note "Worth trying"

Return ONLY a valid JSON array. No markdown, no backticks.
Each item:
{"store":"${store}","code":"CODE or empty string","discount":"e.g. 20% off","type":"Percentage|Fixed Amount|BOGO|Free Shipping|Free Trial|Other","category":"${category}","notes":"restrictions or source info","verified":false,"expiresAt":"","sourceUrl":""}

Return up to 10 results. If you have no knowledge of any codes, return [].`;
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
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  const data = await res.json();
  if (data.error) throw new Error(data.error.message || data.error.type);

  const text = (data.content || [])
    .filter(b => b.type === 'text')
    .map(b => b.text)
    .join('');

  const match = text.replace(/```json|```/g, '').match(/\[[\s\S]*\]/);
  if (!match) return [];

  const parsed = JSON.parse(match[0]);
  return Array.isArray(parsed) ? parsed : [];
}

// ─── CORS headers ─────────────────────────────────────────────────────────────
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// ─── Main handler ─────────────────────────────────────────────────────────────
export default {
  async fetch(request, env) {

    // Handle preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }

    const url = new URL(request.url);

    // Health check
    if (url.pathname === '/') {
      return new Response(JSON.stringify({ status: 'PromoHunter Worker running' }), {
        headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    // Hunt endpoint
    if (url.pathname === '/hunt' && request.method === 'POST') {
      let body;
      try {
        body = await request.json();
      } catch {
        return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
          status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
        });
      }

      const { store, region = 'AU', category = 'retail', apiKey } = body;

      if (!store || !apiKey) {
        return new Response(JSON.stringify({ error: 'store and apiKey are required' }), {
          status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
        });
      }

      try {
        // Step 1: Scrape coupon sites server-side (no CORS issues here)
        const scrapedContent = await scrape(store, region);
        const source = scrapedContent.length > 300 ? 'scraped' : 'knowledge';

        // Step 2: Send to Claude for extraction
        const prompt = buildPrompt({ store, region, category, scrapedContent });
        const deals   = await callClaude(prompt, apiKey);

        return new Response(JSON.stringify({ deals, source, scraped: scrapedContent.length }), {
          headers: { ...CORS, 'Content-Type': 'application/json' },
        });

      } catch (err) {
        const isAuth = err.message?.includes('authentication');
        return new Response(JSON.stringify({
          error: isAuth ? 'Invalid API key' : err.message || 'Worker error',
          auth: isAuth,
        }), {
          status: isAuth ? 401 : 500,
          headers: { ...CORS, 'Content-Type': 'application/json' },
        });
      }
    }

    return new Response('Not found', { status: 404, headers: CORS });
  },
};
