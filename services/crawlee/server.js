// Crawlee Social Scraper — HTTP API for AgentSmith + OpenClaw
import { PlaywrightCrawler } from 'crawlee';
import express from 'express';
import { URL } from 'url';

const app = express();
app.use(express.json());

const API_KEY = process.env.API_KEY || '';

// Auth middleware
function auth(req, res, next) {
  if (!API_KEY) return next();
  const key = req.headers['x-api-key'] || req.query.api_key;
  if (key !== API_KEY) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

app.use(auth);

// --- Scraper helpers ---

async function scrapeWithPlaywright(url, extractFn, opts = {}) {
  let result = {};
  const crawler = new PlaywrightCrawler({
    maxRequestsPerCrawl: 1,
    headless: true,
    browserPoolOptions: { useFingerprints: true },
    requestHandlerTimeoutSecs: 60,
    requestHandler: async ({ page }) => {
      await page.waitForLoadState('networkidle');
      const delay = Math.random() * (parseInt(process.env.REQUEST_DELAY_MAX || '10000') - parseInt(process.env.REQUEST_DELAY_MIN || '3000')) + parseInt(process.env.REQUEST_DELAY_MIN || '3000');
      await page.waitForTimeout(delay);
      result = await page.evaluate(extractFn);
    },
    failedRequestHandler: async ({ request }) => {
      result = { error: `Failed to scrape ${request.url}`, scrapedAt: new Date().toISOString() };
    },
  });
  await crawler.run([url]);
  return result;
}

// --- Instagram ---
app.post('/scrape/instagram', async (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ error: 'username required' });
  try {
    const data = await scrapeWithPlaywright(
      `https://www.instagram.com/${username}/`,
      () => {
        const getMeta = (prop) => {
          const el = document.querySelector(`meta[property="${prop}"]`) || document.querySelector(`meta[name="${prop}"]`);
          return el ? el.getAttribute('content') : null;
        };
        const desc = getMeta('og:description') || '';
        const followers = desc.match(/([\d,.]+[KMB]?)\s*Followers/i);
        const following = desc.match(/([\d,.]+[KMB]?)\s*Following/i);
        const posts = desc.match(/([\d,.]+[KMB]?)\s*Posts/i);
        return {
          username: getMeta('og:title') || null,
          description: desc,
          image: getMeta('og:image') || null,
          followers: followers ? followers[1] : null,
          following: following ? following[1] : null,
          posts: posts ? posts[1] : null,
          url: getMeta('og:url') || window.location.href,
          verified: !!document.querySelector('[aria-label="Verified"]'),
          scrapedAt: new Date().toISOString(),
        };
      }
    );
    res.json({ success: !data.error, data });
  } catch (e) {
    res.json({ success: false, error: e.message, data: null });
  }
});

// --- TikTok ---
app.post('/scrape/tiktok', async (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ error: 'username required' });
  try {
    const data = await scrapeWithPlaywright(
      `https://www.tiktok.com/@${username}`,
      () => {
        const getMeta = (prop) => {
          const el = document.querySelector(`meta[property="${prop}"]`) || document.querySelector(`meta[name="${prop}"]`);
          return el ? el.getAttribute('content') : null;
        };
        let sigiData = {};
        try {
          const s = document.getElementById('SIGI_STATE') || document.getElementById('__UNIVERSAL_DATA_FOR_REHYDRATION__');
          if (s) sigiData = JSON.parse(s.textContent);
        } catch (e) {}
        const userModule = sigiData?.UserModule?.users || sigiData?.['__DEFAULT_SCOPE__']?.['webapp.user-detail']?.userInfo;
        const user = userModule ? Object.values(userModule)[0] : null;
        const stats = sigiData?.UserModule?.stats ? Object.values(sigiData.UserModule.stats)[0] : userModule?.stats || null;
        return {
          username: user?.uniqueId || getMeta('og:title') || null,
          nickname: user?.nickname || null,
          description: user?.signature || getMeta('og:description') || null,
          followers: stats?.followerCount || null,
          following: stats?.followingCount || null,
          likes: stats?.heartCount || null,
          videos: stats?.videoCount || null,
          verified: user?.verified || false,
          scrapedAt: new Date().toISOString(),
        };
      }
    );
    res.json({ success: !data.error, data });
  } catch (e) {
    res.json({ success: false, error: e.message, data: null });
  }
});

// --- LinkedIn ---
app.post('/scrape/linkedin', async (req, res) => {
  const { profileUrl } = req.body;
  if (!profileUrl) return res.status(400).json({ error: 'profileUrl required' });
  try {
    const data = await scrapeWithPlaywright(
      profileUrl,
      () => {
        const getMeta = (prop) => {
          const el = document.querySelector(`meta[property="${prop}"]`) || document.querySelector(`meta[name="${prop}"]`);
          return el ? el.getAttribute('content') : null;
        };
        return {
          name: getMeta('og:title') || document.title || null,
          description: getMeta('og:description') || null,
          image: getMeta('og:image') || null,
          headline: getMeta('og:description')?.split(' - ')?.[0] || null,
          scrapedAt: new Date().toISOString(),
        };
      }
    );
    res.json({ success: !data.error, data });
  } catch (e) {
    res.json({ success: false, error: e.message, data: null });
  }
});

// --- Generic website scrape ---
app.post('/scrape/website', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'url required' });
  try {
    const data = await scrapeWithPlaywright(
      url,
      () => {
        const getMeta = (prop) => {
          const el = document.querySelector(`meta[property="${prop}"]`) || document.querySelector(`meta[name="${prop}"]`);
          return el ? el.getAttribute('content') : null;
        };
        return {
          title: document.title,
          description: getMeta('og:description') || getMeta('description'),
          image: getMeta('og:image'),
          url: window.location.href,
          text: document.body?.innerText?.substring(0, 5000),
          scrapedAt: new Date().toISOString(),
        };
      }
    );
    res.json({ success: !data.error, data });
  } catch (e) {
    res.json({ success: false, error: e.message, data: null });
  }
});

// --- Deep Crawl for SEO Audits ---

async function fetchTextResource(targetUrl) {
  try {
    const resp = await fetch(targetUrl, { signal: AbortSignal.timeout(10000) });
    if (!resp.ok) return null;
    return await resp.text();
  } catch { return null; }
}

// Shared page extraction function for deep crawl
const seoExtractFn = () => {
  const getMeta = (attr, val) => {
    const el = document.querySelector(`meta[${attr}="${val}"]`);
    return el ? (el.getAttribute('content') || el.getAttribute('value') || '') : null;
  };

  const metaTags = {
    title: document.title || null,
    description: getMeta('name', 'description') || getMeta('property', 'og:description'),
    robots: getMeta('name', 'robots'),
    canonical: (() => { const c = document.querySelector('link[rel="canonical"]'); return c ? c.href : null; })(),
    ogTitle: getMeta('property', 'og:title'),
    ogDescription: getMeta('property', 'og:description'),
    ogImage: getMeta('property', 'og:image'),
    ogType: getMeta('property', 'og:type'),
    ogUrl: getMeta('property', 'og:url'),
    ogSiteName: getMeta('property', 'og:site_name'),
    twitterCard: getMeta('name', 'twitter:card'),
    twitterTitle: getMeta('name', 'twitter:title'),
    twitterDescription: getMeta('name', 'twitter:description'),
    twitterImage: getMeta('name', 'twitter:image'),
  };

  const jsonLd = [];
  document.querySelectorAll('script[type="application/ld+json"]').forEach(s => {
    try { jsonLd.push(JSON.parse(s.textContent)); } catch {}
  });

  const headings = [];
  document.querySelectorAll('h1,h2,h3,h4,h5,h6').forEach(h => {
    headings.push({ tag: h.tagName.toLowerCase(), text: h.textContent.trim().substring(0, 200) });
  });

  const images = [];
  document.querySelectorAll('img').forEach(img => {
    images.push({ src: img.src || img.getAttribute('data-src') || null, alt: img.alt || null, hasAlt: !!img.alt });
  });

  const internal = [], external = [];
  const baseOrigin = window.location.origin;
  document.querySelectorAll('a[href]').forEach(a => {
    try {
      const href = new URL(a.href, baseOrigin);
      if (href.origin === baseOrigin) internal.push(href.pathname + href.search);
      else external.push(href.href);
    } catch {}
  });

  const html = document.documentElement.outerHTML;

  return {
    metaTags, jsonLd, headings, images,
    internalLinks: [...new Set(internal)],
    externalLinks: [...new Set(external)],
    internalLinkCount: internal.length,
    externalLinkCount: external.length,
    html, contentSize: html.length,
  };
};

app.post('/api/crawl/deep', async (req, res) => {
  const { url, maxPages = 50 } = req.body;
  if (!url) return res.status(400).json({ error: 'url required' });

  let parsedBase;
  try { parsedBase = new URL(url); } catch { return res.status(400).json({ error: 'Invalid URL' }); }
  const origin = parsedBase.origin;
  const maxPagesClamp = Math.min(Math.max(1, maxPages), 50);

  // Fetch robots.txt and sitemap.xml in parallel
  const [robotsTxt, sitemapXml] = await Promise.all([
    fetchTextResource(`${origin}/robots.txt`),
    fetchTextResource(`${origin}/sitemap.xml`),
  ]);

  const pages = [];

  const crawler = new PlaywrightCrawler({
    maxRequestsPerCrawl: maxPagesClamp,
    headless: true,
    requestHandlerTimeoutSecs: 30,
    maxConcurrency: 2,
    requestHandler: async ({ page, request, enqueueLinks }) => {
      const startTime = Date.now();
      await page.waitForLoadState('domcontentloaded');

      const pageData = await page.evaluate(seoExtractFn);
      const responseTime = Date.now() - startTime;

      pages.push({ url: request.url, ...pageData, responseTimeMs: responseTime });

      // Enqueue internal links (Crawlee handles deduplication)
      await enqueueLinks({
        strategy: 'same-domain',
        transformRequestFunction: (req) => {
          // Strip fragments
          req.url = req.url.split('#')[0];
          return req;
        },
      });
    },
    failedRequestHandler: async ({ request }) => {
      pages.push({ url: request.url, error: 'Failed to crawl', scrapedAt: new Date().toISOString() });
    },
  });

  await crawler.run([url]);

  res.json({
    success: true,
    domain: origin,
    pagesCrawled: pages.length,
    robotsTxt: robotsTxt || null,
    sitemapXml: sitemapXml || null,
    pages,
    crawledAt: new Date().toISOString(),
  });
});

app.get('/health', (req, res) => res.json({ status: 'ok', uptime: process.uptime() }));

const PORT = process.env.PORT || 3500;
app.listen(PORT, () => console.log(`Crawlee Social Scraper on port ${PORT}`));
