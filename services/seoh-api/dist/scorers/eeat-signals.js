"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scoreEeatSignals = scoreEeatSignals;
function scoreEeatSignals($, url, text) {
    let score = 0;
    const issues = [];
    // SSL/HTTPS (15 pts)
    if (url.startsWith('https://')) {
        score += 15;
    }
    else {
        issues.push('Site not using HTTPS — critical trust signal');
    }
    // About page link (15 pts)
    const aboutLink = $('a[href*="about"], a[href*="About"]').length > 0 ||
        text.toLowerCase().includes('about us');
    if (aboutLink) {
        score += 15;
    }
    else {
        issues.push('No "About" page link found — important for establishing authority');
    }
    // Author attribution (15 pts)
    const hasAuthor = $('[rel="author"], .author, [itemprop="author"], [class*="author"]').length > 0 ||
        $('meta[name="author"]').attr('content');
    if (hasAuthor) {
        score += 15;
    }
    else {
        issues.push('No author attribution found — author bios build E-E-A-T');
    }
    // Privacy policy / Terms (10 pts)
    const hasPrivacy = $('a[href*="privacy"], a[href*="Privacy"]').length > 0;
    const hasTerms = $('a[href*="terms"], a[href*="Terms"]').length > 0;
    if (hasPrivacy && hasTerms) {
        score += 10;
    }
    else if (hasPrivacy || hasTerms) {
        score += 5;
        issues.push('Missing either privacy policy or terms of service link');
    }
    else {
        issues.push('No privacy policy or terms of service — required for trust');
    }
    // Contact information (10 pts)
    const hasContact = $('a[href*="contact"], a[href*="Contact"], a[href^="mailto:"], a[href^="tel:"]').length > 0;
    if (hasContact) {
        score += 10;
    }
    else {
        issues.push('No contact information found — add contact page, email, or phone');
    }
    // External references / citations (10 pts)
    const externalLinks = $('a[href^="http"]').filter((_, el) => {
        const href = $(el).attr('href') || '';
        try {
            return new URL(href).hostname !== new URL(url).hostname;
        }
        catch {
            return false;
        }
    }).length;
    if (externalLinks >= 5) {
        score += 10;
    }
    else if (externalLinks >= 2) {
        score += 5;
        issues.push('Few external references — citing authoritative sources builds credibility');
    }
    else {
        issues.push('No external references — link to authoritative sources');
    }
    // Social proof links (10 pts)
    const socialPatterns = /linkedin|twitter|x\.com|facebook|instagram|youtube|github/i;
    const socialLinks = $('a').filter((_, el) => socialPatterns.test($(el).attr('href') || '')).length;
    if (socialLinks >= 2) {
        score += 10;
    }
    else if (socialLinks >= 1) {
        score += 5;
        issues.push('Limited social media presence links');
    }
    else {
        issues.push('No social media links — social presence validates authority');
    }
    // Credentials / expertise signals (10 pts)
    const credentialPatterns = /certified|award|recognized|partner|accredited|years of experience|founded in/i;
    if (credentialPatterns.test(text)) {
        score += 10;
    }
    else {
        issues.push('No credential or expertise signals found — mention certifications, awards, experience');
    }
    // Testimonials / reviews (5 pts)
    const hasTestimonials = $('[class*="testimonial"], [class*="review"], [itemtype*="Review"]').length > 0 ||
        /testimonial|review|client said|customer said/i.test(text);
    if (hasTestimonials) {
        score += 5;
    }
    else {
        issues.push('No testimonials or reviews section — social proof strengthens E-E-A-T');
    }
    return { score: Math.min(score, 100), issues };
}
