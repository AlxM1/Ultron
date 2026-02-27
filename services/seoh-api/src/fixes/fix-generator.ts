import type { AuditResult, DimensionResult } from '../scorers';

export interface Fix {
  category: 'schema' | 'meta' | 'content' | 'technical';
  priority: 'critical' | 'high' | 'medium' | 'low';
  issue: string;
  currentValue: string | null;
  fixedCode: string;
  explanation: string;
}

export interface FixResult {
  url: string;
  generatedAt: string;
  totalFixes: number;
  fixes: Fix[];
}

/**
 * Generate actionable code fixes from a GEO audit result.
 * Returns ready-to-paste HTML, JSON-LD, meta tags, etc.
 */
export function generateFixes(audit: AuditResult): FixResult {
  const fixes: Fix[] = [];
  const url = audit.url;
  const domain = extractDomain(url);
  const siteName = domainToName(domain);
  const dims = audit.dimensions;

  // Analyze issues and generate fixes
  generateMetaFixes(fixes, dims, url, siteName);
  generateSchemaFixes(fixes, dims, url, domain, siteName);
  generateContentFixes(fixes, dims, url, siteName);
  generateTechnicalFixes(fixes, dims, domain);

  // Sort by priority
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  fixes.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return {
    url,
    generatedAt: new Date().toISOString(),
    totalFixes: fixes.length,
    fixes,
  };
}

function extractDomain(url: string): string {
  try { return new URL(url).hostname; } catch { return url; }
}

function domainToName(domain: string): string {
  return domain.replace(/^www\./, '').split('.')[0].replace(/-/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

function hasIssue(dim: DimensionResult, keyword: string): boolean {
  return dim.issues.some(i => i.toLowerCase().includes(keyword.toLowerCase()));
}

function getIssueText(dim: DimensionResult, keyword: string): string | null {
  return dim.issues.find(i => i.toLowerCase().includes(keyword.toLowerCase())) || null;
}

// ── Meta Tag Fixes ──────────────────────────────────────────────────

function generateMetaFixes(fixes: Fix[], dims: AuditResult['dimensions'], url: string, siteName: string) {
  const sr = dims.schema_readiness;

  if (hasIssue(sr, 'no meta description')) {
    fixes.push({
      category: 'meta',
      priority: 'critical',
      issue: 'Missing meta description',
      currentValue: null,
      fixedCode: `<meta name="description" content="${siteName} — Your concise, compelling description here (50-160 characters). Describe what your page offers and why visitors should care.">`,
      explanation: 'Meta descriptions are the primary snippet source for search engines and AI models. Without one, engines guess — often poorly. Critical for GEO citability.',
    });
  } else if (hasIssue(sr, 'meta description length')) {
    const match = getIssueText(sr, 'meta description length');
    fixes.push({
      category: 'meta',
      priority: 'high',
      issue: 'Meta description length out of range',
      currentValue: match,
      fixedCode: `<meta name="description" content="${siteName} — Write a clear, benefit-driven description between 50-160 characters that summarizes your page's core value proposition.">`,
      explanation: 'Descriptions under 50 chars get ignored by AI models; over 160 get truncated in SERPs. The sweet spot is 120-155 characters.',
    });
  }

  if (hasIssue(sr, 'no title tag')) {
    fixes.push({
      category: 'meta',
      priority: 'critical',
      issue: 'Missing title tag',
      currentValue: null,
      fixedCode: `<title>${siteName} — Primary Keyword | Brand Name</title>`,
      explanation: 'Title tags are the #1 on-page ranking signal. AI models use them to determine page topic and authority.',
    });
  } else if (hasIssue(sr, 'title tag length')) {
    fixes.push({
      category: 'meta',
      priority: 'high',
      issue: 'Title tag length out of range',
      currentValue: getIssueText(sr, 'title tag length'),
      fixedCode: `<title>${siteName} — Concise Title Here (10-70 chars)</title>`,
      explanation: 'Titles under 10 chars lack context; over 70 get truncated. Aim for 50-60 characters with primary keyword near the front.',
    });
  }

  if (hasIssue(sr, 'no viewport')) {
    fixes.push({
      category: 'meta',
      priority: 'medium',
      issue: 'Missing viewport meta tag',
      currentValue: null,
      fixedCode: `<meta name="viewport" content="width=device-width, initial-scale=1.0">`,
      explanation: 'Required for mobile-first indexing. Google and AI crawlers penalize non-mobile-friendly pages.',
    });
  }

  if (hasIssue(sr, 'no lang')) {
    fixes.push({
      category: 'meta',
      priority: 'medium',
      issue: 'Missing lang attribute',
      currentValue: null,
      fixedCode: `<html lang="en">`,
      explanation: 'The lang attribute helps AI models understand content language for proper citation in multilingual contexts.',
    });
  }

  if (hasIssue(sr, 'no canonical')) {
    fixes.push({
      category: 'meta',
      priority: 'high',
      issue: 'Missing canonical URL',
      currentValue: null,
      fixedCode: `<link rel="canonical" href="${url}">`,
      explanation: 'Without a canonical tag, search engines may index duplicate versions of your page, diluting authority signals.',
    });
  }

  // Open Graph tags
  generateOgFixes(fixes, sr, url, siteName);

  // Twitter cards
  if (hasIssue(sr, 'no twitter card') || hasIssue(sr, 'incomplete twitter')) {
    fixes.push({
      category: 'meta',
      priority: 'medium',
      issue: 'Missing or incomplete Twitter card tags',
      currentValue: getIssueText(sr, 'twitter'),
      fixedCode: `<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${siteName} — Your Page Title">
<meta name="twitter:description" content="Compelling description for Twitter/X sharing (under 200 chars).">
<meta name="twitter:image" content="${url}/og-image.jpg">`,
      explanation: 'Twitter cards control how your content appears when shared. Large image cards get significantly more engagement.',
    });
  }
}

function generateOgFixes(fixes: Fix[], sr: DimensionResult, url: string, siteName: string) {
  const missingOg: string[] = [];
  if (hasIssue(sr, 'missing og:title')) missingOg.push('og:title');
  if (hasIssue(sr, 'missing og:description')) missingOg.push('og:description');
  if (hasIssue(sr, 'missing og:image')) missingOg.push('og:image');
  if (hasIssue(sr, 'missing og:type')) missingOg.push('og:type');

  if (missingOg.length > 0) {
    fixes.push({
      category: 'meta',
      priority: missingOg.length >= 3 ? 'critical' : 'high',
      issue: `Missing Open Graph tags: ${missingOg.join(', ')}`,
      currentValue: null,
      fixedCode: `<meta property="og:title" content="${siteName} — Your Page Title">
<meta property="og:description" content="Clear description of your page content (under 200 characters).">
<meta property="og:image" content="${url}/og-image.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:type" content="website">
<meta property="og:url" content="${url}">
<meta property="og:site_name" content="${siteName}">`,
      explanation: 'Open Graph tags control how your page appears when shared on Facebook, LinkedIn, Discord, and messaging apps. AI models also use OG data to understand page purpose.',
    });
  }
}

// ── Schema / JSON-LD Fixes ──────────────────────────────────────────

function generateSchemaFixes(fixes: Fix[], dims: AuditResult['dimensions'], url: string, domain: string, siteName: string) {
  const sr = dims.schema_readiness;

  if (hasIssue(sr, 'no json-ld')) {
    // Full schema package when nothing exists
    fixes.push({
      category: 'schema',
      priority: 'critical',
      issue: 'No JSON-LD structured data found',
      currentValue: null,
      fixedCode: buildOrganizationSchema(url, siteName),
      explanation: 'JSON-LD structured data is how search engines and AI models understand your business entity. Without it, you are invisible to knowledge graphs.',
    });

    fixes.push({
      category: 'schema',
      priority: 'critical',
      issue: 'No WebSite schema — search engines cannot identify your site',
      currentValue: null,
      fixedCode: buildWebSiteSchema(url, siteName),
      explanation: 'WebSite schema enables sitelinks search box in Google and helps AI models map your site structure.',
    });

    fixes.push({
      category: 'schema',
      priority: 'high',
      issue: 'No BreadcrumbList schema',
      currentValue: null,
      fixedCode: buildBreadcrumbSchema(url, siteName),
      explanation: 'Breadcrumb schema creates rich navigation snippets in search results and helps AI understand page hierarchy.',
    });
  } else if (hasIssue(sr, 'missing @type')) {
    fixes.push({
      category: 'schema',
      priority: 'high',
      issue: 'JSON-LD present but missing @type definitions',
      currentValue: 'JSON-LD blocks without @type property',
      fixedCode: buildOrganizationSchema(url, siteName),
      explanation: 'Schema without @type is meaningless to parsers. Every JSON-LD block needs a defined type from schema.org.',
    });
  }

  // Always recommend FAQPage if content issues suggest missing FAQ
  if (hasIssue(dims.content_structure, 'no faq') || hasIssue(dims.ai_citability, 'question')) {
    fixes.push({
      category: 'schema',
      priority: 'high',
      issue: 'No FAQPage schema detected',
      currentValue: null,
      fixedCode: buildFaqSchema(siteName),
      explanation: 'FAQPage schema is one of the highest-impact GEO signals. AI models directly cite FAQ content in responses.',
    });
  }
}

function buildOrganizationSchema(url: string, name: string): string {
  return `<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "${name}",
  "url": "${url}",
  "logo": "${url}/logo.png",
  "description": "Brief description of ${name} and what you do.",
  "sameAs": [
    "https://twitter.com/yourhandle",
    "https://linkedin.com/company/yourcompany",
    "https://github.com/yourorg"
  ],
  "contactPoint": {
    "@type": "ContactPoint",
    "contactType": "customer service",
    "email": "hello@${extractDomainClean(url)}"
  }
}
</script>`;
}

function buildWebSiteSchema(url: string, name: string): string {
  return `<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "${name}",
  "url": "${url}",
  "potentialAction": {
    "@type": "SearchAction",
    "target": "${url}/search?q={search_term_string}",
    "query-input": "required name=search_term_string"
  }
}
</script>`;
}

function buildBreadcrumbSchema(url: string, name: string): string {
  return `<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "name": "Home",
      "item": "${url}"
    },
    {
      "@type": "ListItem",
      "position": 2,
      "name": "Current Page",
      "item": "${url}/current-page"
    }
  ]
}
</script>`;
}

function buildFaqSchema(siteName: string): string {
  return `<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "What does ${siteName} do?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Provide a clear, concise answer here. 2-3 sentences that directly answer the question."
      }
    },
    {
      "@type": "Question",
      "name": "How does ${siteName} work?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Explain your process or product in plain language. AI models cite this directly."
      }
    },
    {
      "@type": "Question",
      "name": "Who is ${siteName} for?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Define your target audience clearly. This helps AI models match queries to your content."
      }
    }
  ]
}
</script>`;
}

function extractDomainClean(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return 'example.com'; }
}

// ── Content Fixes ───────────────────────────────────────────────────

function generateContentFixes(fixes: Fix[], dims: AuditResult['dimensions'], url: string, siteName: string) {
  const cs = dims.content_structure;
  const ac = dims.ai_citability;

  if (hasIssue(cs, 'no faq') || hasIssue(ac, 'question') || hasIssue(cs, 'heading')) {
    fixes.push({
      category: 'content',
      priority: 'high',
      issue: 'No FAQ section detected on page',
      currentValue: null,
      fixedCode: buildFaqHtml(siteName),
      explanation: 'FAQ sections are the single most citable content format for AI. ChatGPT, Perplexity, and Google SGE pull FAQ answers directly into responses.',
    });
  }

  if (hasIssue(cs, 'no h1') || hasIssue(cs, 'missing h1')) {
    fixes.push({
      category: 'content',
      priority: 'critical',
      issue: 'Missing H1 heading',
      currentValue: null,
      fixedCode: `<h1>${siteName} — Primary Keyword or Value Proposition</h1>`,
      explanation: 'The H1 is the strongest content signal on a page. AI models use it as the primary topic identifier.',
    });
  }

  if (hasIssue(ac, 'thin content') || hasIssue(cs, 'thin')) {
    fixes.push({
      category: 'content',
      priority: 'high',
      issue: 'Thin content — insufficient text for AI citation',
      currentValue: 'Page has too little substantive text',
      fixedCode: `<!-- Add 300+ words of substantive content covering: -->
<!-- 1. What you do (clear, factual description) -->
<!-- 2. How it works (process or methodology) -->
<!-- 3. Who it's for (target audience) -->
<!-- 4. What makes you different (unique value proposition) -->
<!-- 5. Key statistics or proof points -->

<section>
  <h2>What We Do</h2>
  <p>Describe your core offering in clear, factual language. AI models need declarative statements to cite.</p>

  <h2>How It Works</h2>
  <p>Explain your process step by step. Numbered lists and clear structure improve citability.</p>

  <h2>Who We Serve</h2>
  <p>Define your audience. This helps AI match your content to relevant queries.</p>
</section>`,
      explanation: 'Pages with under 300 words rarely get cited by AI models. They need substantive, structured content to pull from.',
    });
  }
}

function buildFaqHtml(siteName: string): string {
  return `<section id="faq" aria-labelledby="faq-heading">
  <h2 id="faq-heading">Frequently Asked Questions</h2>

  <div class="faq-item" itemscope itemprop="mainEntity" itemtype="https://schema.org/Question">
    <h3 itemprop="name">What does ${siteName} do?</h3>
    <div itemscope itemprop="acceptedAnswer" itemtype="https://schema.org/Answer">
      <p itemprop="text">Provide a clear, direct answer here. 2-3 sentences. AI models cite this verbatim.</p>
    </div>
  </div>

  <div class="faq-item" itemscope itemprop="mainEntity" itemtype="https://schema.org/Question">
    <h3 itemprop="name">How does ${siteName} work?</h3>
    <div itemscope itemprop="acceptedAnswer" itemtype="https://schema.org/Answer">
      <p itemprop="text">Explain your process clearly. Step-by-step if possible.</p>
    </div>
  </div>

  <div class="faq-item" itemscope itemprop="mainEntity" itemtype="https://schema.org/Question">
    <h3 itemprop="name">Who is ${siteName} for?</h3>
    <div itemscope itemprop="acceptedAnswer" itemtype="https://schema.org/Answer">
      <p itemprop="text">Define your target audience. Be specific — AI uses this for query matching.</p>
    </div>
  </div>

  <div class="faq-item" itemscope itemprop="mainEntity" itemtype="https://schema.org/Question">
    <h3 itemprop="name">What makes ${siteName} different?</h3>
    <div itemscope itemprop="acceptedAnswer" itemtype="https://schema.org/Answer">
      <p itemprop="text">Your unique value proposition. What you do that others don't.</p>
    </div>
  </div>
</section>`;
}

// ── Technical Fixes ─────────────────────────────────────────────────

function generateTechnicalFixes(fixes: Fix[], dims: AuditResult['dimensions'], domain: string) {
  const pv = dims.platform_visibility;

  if (hasIssue(pv, 'robots.txt') || hasIssue(pv, 'robots')) {
    fixes.push({
      category: 'technical',
      priority: 'high',
      issue: 'Missing or misconfigured robots.txt',
      currentValue: getIssueText(pv, 'robots'),
      fixedCode: `# robots.txt for ${domain}
User-agent: *
Allow: /

# Allow AI crawlers explicitly
User-agent: GPTBot
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: anthropic-ai
Allow: /

User-agent: PerplexityBot
Allow: /

# Block admin/private paths
Disallow: /admin/
Disallow: /api/
Disallow: /private/

Sitemap: https://${domain}/sitemap.xml`,
      explanation: 'robots.txt controls which crawlers can index your site. For GEO, you MUST allow AI crawlers (GPTBot, PerplexityBot, etc.) or you will never be cited.',
    });
  }

  if (hasIssue(pv, 'sitemap') || hasIssue(pv, 'no sitemap')) {
    fixes.push({
      category: 'technical',
      priority: 'medium',
      issue: 'Missing sitemap.xml',
      currentValue: null,
      fixedCode: `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://${domain}/</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://${domain}/about</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <!-- Add all important pages here -->
</urlset>`,
      explanation: 'Sitemaps help search engines and AI crawlers discover all your content. Without one, pages may be missed during indexing.',
    });
  }
}
