import type { CheerioAPI } from 'cheerio';

interface ScoreResult {
  score: number;
  issues: string[];
  details?: {
    brand: string;
    domain: string;
    queries: QueryResult[];
    structuredDataBonus: number;
  };
}

interface QueryResult {
  query: string;
  found: boolean;
  position: number | null; // 1-indexed, null if not found
  context: string | null;
}

const SEARXNG_URL = process.env.SEARXNG_URL || 'http://raiser-searxng:8080';

/**
 * Extract brand name from page metadata / structured data
 */
function extractBrand($: CheerioAPI, url: string): string {
  // Try JSON-LD Organization name
  const jsonLd = $('script[type="application/ld+json"]');
  for (let i = 0; i < jsonLd.length; i++) {
    try {
      const data = JSON.parse($(jsonLd[i]).html() || '{}');
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        if (item['@type'] === 'Organization' && item.name) return item.name;
        if (item['@type'] === 'WebSite' && item.name) return item.name;
      }
    } catch {}
  }

  // Try og:site_name
  const ogSiteName = $('meta[property="og:site_name"]').attr('content');
  if (ogSiteName) return ogSiteName;

  // Try title tag (first segment before separator)
  const title = $('title').text();
  if (title) {
    const brand = title.split(/[|\-–—:]/)[0].trim();
    if (brand && brand.length < 40) return brand;
  }

  // Fallback: domain name
  try {
    const hostname = new URL(url).hostname.replace('www.', '');
    return hostname.split('.')[0];
  } catch {
    return '';
  }
}

/**
 * Extract domain from URL
 */
function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return '';
  }
}

/**
 * Extract industry keywords from page content
 */
function extractKeywords($: CheerioAPI, text: string): string[] {
  const keywords: string[] = [];

  // Meta keywords
  const metaKw = $('meta[name="keywords"]').attr('content');
  if (metaKw) {
    keywords.push(...metaKw.split(',').map(k => k.trim()).filter(k => k.length > 2 && k.length < 40));
  }

  // Meta description
  const desc = $('meta[name="description"]').attr('content') || '';

  // H1 tags
  const h1s = $('h1').map((_, el) => $(el).text().trim()).get().filter(Boolean);

  // Extract key phrases from description and headings
  const combined = [desc, ...h1s].join(' ');

  // Common industry terms — extract 2-3 word phrases from headings
  const headingPhrases = $('h1, h2').map((_, el) => $(el).text().trim()).get()
    .filter(h => h.length > 5 && h.length < 60)
    .slice(0, 5);

  keywords.push(...headingPhrases);

  return [...new Set(keywords)].slice(0, 8);
}

/**
 * Generate search queries based on brand and keywords
 */
function generateQueries(brand: string, domain: string, keywords: string[]): string[] {
  const queries: string[] = [];

  // Brand-specific queries
  if (brand) {
    queries.push(brand);
    queries.push(`${brand} reviews`);
  }

  // Domain query
  if (domain) {
    queries.push(domain);
  }

  // Keyword-based queries (industry visibility)
  for (const kw of keywords.slice(0, 5)) {
    // "best [keyword]" style queries that LLMs would generate
    if (kw.length > 3) {
      queries.push(`best ${kw.toLowerCase()}`);
    }
  }

  // If we don't have enough, add generic variants
  if (queries.length < 5 && brand) {
    queries.push(`what is ${brand}`);
    queries.push(`${brand} alternatives`);
  }

  return [...new Set(queries)].slice(0, 10);
}

/**
 * Query SearXNG and return top 10 results
 */
async function querySearxng(query: string): Promise<Array<{ url: string; title: string; content: string }>> {
  try {
    const params = new URLSearchParams({
      q: query,
      format: 'json',
      pageno: '1',
    });

    const resp = await fetch(`${SEARXNG_URL}/search?${params}`, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(10000),
    });

    if (!resp.ok) return [];
    const data = await resp.json() as any;
    return (data.results || []).slice(0, 10).map((r: any) => ({
      url: r.url || '',
      title: r.title || '',
      content: r.content || '',
    }));
  } catch (err) {
    console.warn(`[platform-visibility] SearXNG query failed for "${query}":`, err);
    return [];
  }
}

/**
 * Check structured data quality for LLM parseability
 */
function checkStructuredData($: CheerioAPI): { bonus: number; issues: string[] } {
  let bonus = 0;
  const issues: string[] = [];

  const jsonLd = $('script[type="application/ld+json"]');
  const schemas: any[] = [];

  jsonLd.each((_, el) => {
    try {
      const parsed = JSON.parse($(el).html() || '{}');
      const items = Array.isArray(parsed) ? parsed : [parsed];
      schemas.push(...items);
    } catch {}
  });

  const types = schemas.map(s => s['@type']).filter(Boolean);

  // FAQ schema — highly valuable for LLM citation
  if (types.includes('FAQPage') || schemas.some(s => s.mainEntity?.some?.((e: any) => e['@type'] === 'Question'))) {
    bonus += 8;
  } else {
    issues.push('No FAQ schema — FAQPage markup dramatically increases AI citation likelihood');
  }

  // HowTo schema
  if (types.includes('HowTo')) {
    bonus += 5;
  }

  // Organization with complete info
  const org = schemas.find(s => s['@type'] === 'Organization');
  if (org) {
    if (org.name && org.url && (org.description || org.sameAs)) {
      bonus += 5;
    } else {
      issues.push('Organization schema incomplete — add description and sameAs links');
    }
  }

  // Article / BlogPosting
  if (types.includes('Article') || types.includes('BlogPosting') || types.includes('WebPage')) {
    bonus += 3;
  }

  // sameAs links (social profiles help LLMs identify entities)
  const hasSameAs = schemas.some(s => s.sameAs && (Array.isArray(s.sameAs) ? s.sameAs.length > 0 : true));
  if (hasSameAs) {
    bonus += 4;
  } else {
    issues.push('No sameAs links in structured data — add social profiles to help AI identify your brand');
  }

  return { bonus: Math.min(bonus, 20), issues };
}

/**
 * Platform Visibility scorer — LIVE
 * Queries SearXNG to check actual brand/domain presence in search results,
 * plus structured data analysis for LLM parseability.
 */
export async function scorePlatformVisibility(
  $: CheerioAPI,
  url: string,
  text: string
): Promise<ScoreResult> {
  const issues: string[] = [];
  const brand = extractBrand($, url);
  const domain = extractDomain(url);
  const keywords = extractKeywords($, text);
  const queries = generateQueries(brand, domain, keywords);

  if (queries.length === 0) {
    return { score: 0, issues: ['Could not generate search queries — insufficient page content'] };
  }

  // Query SearXNG for each query in parallel (with concurrency limit)
  const queryResults: QueryResult[] = [];
  const batchSize = 3;

  for (let i = 0; i < queries.length; i += batchSize) {
    const batch = queries.slice(i, i + batchSize);
    const results = await Promise.all(batch.map(async (query) => {
      const searchResults = await querySearxng(query);

      // Check if brand/domain appears
      let found = false;
      let position: number | null = null;
      let context: string | null = null;

      for (let j = 0; j < searchResults.length; j++) {
        const r = searchResults[j];
        const resultDomain = extractDomain(r.url);
        const brandLower = brand.toLowerCase();
        const domainLower = domain.toLowerCase();

        const domainMatch = resultDomain.includes(domainLower) || domainLower.includes(resultDomain);
        const brandInTitle = r.title.toLowerCase().includes(brandLower);
        const brandInContent = r.content.toLowerCase().includes(brandLower);
        const urlMatch = r.url.toLowerCase().includes(domainLower);

        if (domainMatch || urlMatch || brandInTitle) {
          found = true;
          position = j + 1;
          context = r.title;
          break;
        }

        // Softer match: brand name in content
        if (brandInContent && !found) {
          found = true;
          position = j + 1;
          context = `Mentioned in: ${r.title}`;
        }
      }

      return { query, found, position, context } as QueryResult;
    }));
    queryResults.push(...results);
  }

  // Calculate score components
  const totalQueries = queryResults.length;
  const foundCount = queryResults.filter(r => r.found).length;
  const appearanceRate = totalQueries > 0 ? foundCount / totalQueries : 0;

  // Appearance rate score (0-40 points)
  const appearanceScore = Math.round(appearanceRate * 40);

  // Position quality score (0-30 points) — higher for top positions
  let positionScore = 0;
  const foundResults = queryResults.filter(r => r.found && r.position !== null);
  if (foundResults.length > 0) {
    const avgPosition = foundResults.reduce((sum, r) => sum + (r.position || 10), 0) / foundResults.length;
    // Position 1 = 30pts, Position 10 = 3pts
    positionScore = Math.round(Math.max(0, 30 - (avgPosition - 1) * 3));
  }

  // Brand query score (0-10 points) — are you findable when people search your name?
  let brandQueryScore = 0;
  const brandQuery = queryResults.find(r => r.query === brand || r.query === domain);
  if (brandQuery?.found) {
    brandQueryScore = brandQuery.position && brandQuery.position <= 3 ? 10 : 5;
  } else {
    issues.push('Brand/domain not found in top 10 results for direct brand search — critical visibility gap');
  }

  // Structured data bonus (0-20 points)
  const structuredData = checkStructuredData($);
  issues.push(...structuredData.issues);

  const rawScore = appearanceScore + positionScore + brandQueryScore + structuredData.bonus;
  const score = Math.max(0, Math.min(100, rawScore));

  // Generate issues based on results
  if (appearanceRate === 0) {
    issues.push('Brand not found in ANY search results — zero search visibility detected');
  } else if (appearanceRate < 0.3) {
    issues.push(`Brand found in only ${Math.round(appearanceRate * 100)}% of relevant queries — low visibility`);
  } else if (appearanceRate < 0.6) {
    issues.push(`Brand found in ${Math.round(appearanceRate * 100)}% of relevant queries — moderate visibility`);
  }

  if (foundResults.length > 0) {
    const avgPos = foundResults.reduce((s, r) => s + (r.position || 10), 0) / foundResults.length;
    if (avgPos > 5) {
      issues.push(`Average position ${avgPos.toFixed(1)} — appearing too low in results to be cited by AI`);
    }
  }

  const notFoundQueries = queryResults.filter(r => !r.found).map(r => r.query);
  if (notFoundQueries.length > 0 && notFoundQueries.length <= 5) {
    issues.push(`Not found for: ${notFoundQueries.map(q => `"${q}"`).join(', ')}`);
  }

  return {
    score,
    issues,
    details: {
      brand,
      domain,
      queries: queryResults,
      structuredDataBonus: structuredData.bonus,
    },
  };
}
