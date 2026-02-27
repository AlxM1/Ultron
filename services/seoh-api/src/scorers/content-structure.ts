import type { CheerioAPI } from 'cheerio';

interface ScoreResult {
  score: number;
  issues: string[];
}

export function scoreContentStructure($: CheerioAPI): ScoreResult {
  let score = 0;
  const issues: string[] = [];

  // H1 tag (15 pts) — exactly one
  const h1Count = $('h1').length;
  if (h1Count === 1) {
    score += 15;
  } else if (h1Count > 1) {
    score += 5;
    issues.push(`${h1Count} H1 tags found — use exactly one H1 per page`);
  } else {
    issues.push('No H1 tag — every page needs one primary heading');
  }

  // Heading hierarchy (15 pts)
  const headings = $('h1, h2, h3, h4, h5, h6');
  const headingLevels = headings.map((_, el) => parseInt(el.tagName.charAt(1))).get();
  if (headingLevels.length >= 3) {
    // Check for proper nesting (no skipping levels)
    let properNesting = true;
    for (let i = 1; i < headingLevels.length; i++) {
      if (headingLevels[i] > headingLevels[i - 1] + 1) {
        properNesting = false;
        break;
      }
    }
    if (properNesting) {
      score += 15;
    } else {
      score += 8;
      issues.push('Heading hierarchy skips levels — maintain H1 > H2 > H3 order');
    }
  } else if (headingLevels.length >= 1) {
    score += 5;
    issues.push('Too few headings — use H2/H3 subheadings to structure content');
  } else {
    issues.push('No headings found — add heading hierarchy for content structure');
  }

  // Paragraph structure (15 pts)
  const paragraphs = $('p').filter((_, el) => $(el).text().trim().length > 20);
  if (paragraphs.length >= 5) {
    score += 15;
  } else if (paragraphs.length >= 2) {
    score += 8;
    issues.push('Limited paragraph content');
  } else {
    issues.push('Very few content paragraphs — add more substantive text content');
  }

  // Lists (15 pts)
  const ulCount = $('ul').length;
  const olCount = $('ol').length;
  const totalLists = ulCount + olCount;
  if (totalLists >= 3) {
    score += 15;
  } else if (totalLists >= 1) {
    score += 8;
    issues.push('Few lists — bullet points help LLMs parse information');
  } else {
    issues.push('No lists found — add bulleted or numbered lists');
  }

  // Image alt text (15 pts)
  const images = $('img');
  const imagesWithAlt = $('img[alt]').filter((_, el) => $(el).attr('alt')!.trim().length > 0);
  if (images.length === 0) {
    score += 10; // No images isn't necessarily bad
    issues.push('No images found — images with descriptive alt text improve content');
  } else {
    const altRatio = imagesWithAlt.length / images.length;
    if (altRatio >= 0.9) {
      score += 15;
    } else if (altRatio >= 0.5) {
      score += 8;
      issues.push(`${images.length - imagesWithAlt.length} images missing alt text`);
    } else {
      score += 3;
      issues.push(`Most images lack alt text (${imagesWithAlt.length}/${images.length} have alt)`);
    }
  }

  // Tables (10 pts)
  const tables = $('table').length;
  if (tables >= 1) {
    score += 10;
  } else {
    // Not a hard requirement
    score += 3;
    issues.push('No tables — tabular data is highly parseable by AI systems');
  }

  // Internal links (10 pts)
  const internalLinks = $('a[href^="/"], a[href^="./"], a[href^="#"]').length;
  if (internalLinks >= 5) {
    score += 10;
  } else if (internalLinks >= 2) {
    score += 5;
    issues.push('Few internal links — improve site navigation and content interconnection');
  } else {
    issues.push('Very few internal links — add navigation and cross-references');
  }

  // Semantic HTML (5 pts)
  const semanticTags = $('article, section, nav, aside, main, header, footer').length;
  if (semanticTags >= 3) {
    score += 5;
  } else if (semanticTags >= 1) {
    score += 3;
    issues.push('Limited semantic HTML — use <article>, <section>, <nav>, <main>');
  } else {
    issues.push('No semantic HTML elements — use proper HTML5 semantic tags');
  }

  return { score: Math.min(score, 100), issues };
}
