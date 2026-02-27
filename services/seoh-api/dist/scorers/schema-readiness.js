"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scoreSchemaReadiness = scoreSchemaReadiness;
function scoreSchemaReadiness($) {
    let score = 0;
    const issues = [];
    // JSON-LD structured data (25 pts)
    const jsonLd = $('script[type="application/ld+json"]');
    if (jsonLd.length > 0) {
        score += 15;
        // Check for common schema types
        try {
            const schemas = jsonLd.map((_, el) => {
                try {
                    return JSON.parse($(el).html() || '{}');
                }
                catch {
                    return {};
                }
            }).get();
            const types = schemas.map((s) => s['@type'] || '').filter(Boolean);
            if (types.length > 0) {
                score += 10;
            }
            else {
                issues.push('JSON-LD present but missing @type — define Organization, WebSite, etc.');
            }
        }
        catch {
            score += 5;
        }
    }
    else {
        issues.push('No JSON-LD structured data — add schema.org markup for Organization, WebSite, FAQPage');
    }
    // OpenGraph tags (20 pts)
    const ogTitle = $('meta[property="og:title"]').attr('content');
    const ogDesc = $('meta[property="og:description"]').attr('content');
    const ogImage = $('meta[property="og:image"]').attr('content');
    const ogType = $('meta[property="og:type"]').attr('content');
    let ogScore = 0;
    if (ogTitle)
        ogScore += 5;
    else
        issues.push('Missing og:title');
    if (ogDesc)
        ogScore += 5;
    else
        issues.push('Missing og:description');
    if (ogImage)
        ogScore += 5;
    else
        issues.push('Missing og:image');
    if (ogType)
        ogScore += 5;
    else
        issues.push('Missing og:type');
    score += ogScore;
    // Meta description (15 pts)
    const metaDesc = $('meta[name="description"]').attr('content');
    if (metaDesc && metaDesc.length >= 50 && metaDesc.length <= 160) {
        score += 15;
    }
    else if (metaDesc) {
        score += 8;
        issues.push(`Meta description length (${metaDesc.length} chars) — optimal is 50-160 chars`);
    }
    else {
        issues.push('No meta description — critical for search and AI understanding');
    }
    // Canonical URL (10 pts)
    const canonical = $('link[rel="canonical"]').attr('href');
    if (canonical) {
        score += 10;
    }
    else {
        issues.push('No canonical URL — add <link rel="canonical"> to prevent duplicate content');
    }
    // Title tag (10 pts)
    const title = $('title').text().trim();
    if (title && title.length >= 10 && title.length <= 70) {
        score += 10;
    }
    else if (title) {
        score += 5;
        issues.push(`Title tag length (${title.length} chars) — optimal is 10-70 chars`);
    }
    else {
        issues.push('No title tag');
    }
    // Twitter card tags (10 pts)
    const twitterCard = $('meta[name="twitter:card"]').attr('content');
    const twitterTitle = $('meta[name="twitter:title"]').attr('content');
    if (twitterCard && twitterTitle) {
        score += 10;
    }
    else if (twitterCard || twitterTitle) {
        score += 5;
        issues.push('Incomplete Twitter card tags');
    }
    else {
        issues.push('No Twitter card meta tags');
    }
    // Viewport meta (5 pts)
    const viewport = $('meta[name="viewport"]').attr('content');
    if (viewport) {
        score += 5;
    }
    else {
        issues.push('No viewport meta tag — required for mobile-friendly rendering');
    }
    // Lang attribute (5 pts)
    const lang = $('html').attr('lang');
    if (lang) {
        score += 5;
    }
    else {
        issues.push('No lang attribute on <html> — helps AI understand content language');
    }
    return { score: Math.min(score, 100), issues };
}
