import PDFDocument from 'pdfkit';
import { AuditResult, DimensionResult } from '../scorers';

// Color palette — dark + amber (Jarvis theme)
const COLORS = {
  bg: '#0a0a0a',
  surface: '#141414',
  card: '#1a1a1a',
  amber: '#f5a623',
  amberLight: '#f7c564',
  amberDark: '#c4841d',
  text: '#e8e8e8',
  textMuted: '#888888',
  white: '#ffffff',
  red: '#e74c3c',
  green: '#2ecc71',
  yellow: '#f39c12',
  border: '#2a2a2a',
};

const DIMENSION_LABELS: Record<string, { label: string; description: string }> = {
  ai_citability: {
    label: 'AI Citability',
    description: 'How likely AI models are to cite and reference your content in responses.',
  },
  schema_readiness: {
    label: 'Schema Readiness',
    description: 'Structured data markup quality for machine understanding.',
  },
  eeat_signals: {
    label: 'E-E-A-T Signals',
    description: 'Experience, Expertise, Authoritativeness, and Trustworthiness indicators.',
  },
  content_structure: {
    label: 'Content Structure',
    description: 'How well your content is organized for AI consumption and extraction.',
  },
  platform_visibility: {
    label: 'Platform Visibility',
    description: 'Composite visibility score across AI-powered search platforms.',
  },
};

function scoreColor(score: number): string {
  if (score >= 80) return COLORS.green;
  if (score >= 50) return COLORS.yellow;
  return COLORS.red;
}

function scoreLabel(score: number): string {
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Needs Work';
  return 'Critical';
}

export function generateAuditPdf(audit: AuditResult): PDFKit.PDFDocument {
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 50, bottom: 50, left: 50, right: 50 },
    bufferPages: true,
    info: {
      Title: `GEO Audit Report - ${audit.url}`,
      Author: 'SEOh.ca',
      Subject: 'Generative Engine Optimization Audit',
      Creator: 'SEOh GEO Scoring Engine',
    },
  });

  const pageWidth = 595.28 - 100; // A4 minus margins
  const auditDate = new Date(audit.audited_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // ── Cover Page ──
  drawCoverPage(doc, audit, auditDate, pageWidth);

  // ── Executive Summary ──
  doc.addPage();
  drawExecutiveSummary(doc, audit, pageWidth);

  // ── Dimension Detail Pages ──
  const dims = Object.entries(audit.dimensions) as [string, DimensionResult][];
  for (const [key, dim] of dims) {
    doc.addPage();
    drawDimensionPage(doc, key, dim, pageWidth);
  }

  // ── Recommendations / CTA Page ──
  doc.addPage();
  drawCtaPage(doc, audit, pageWidth);

  // Footer on all pages
  const pages = doc.bufferedPageRange();
  for (let i = 0; i < pages.count; i++) {
    doc.switchToPage(i);
    doc
      .fontSize(8)
      .fillColor(COLORS.textMuted)
      .text(`seoh.ca  |  GEO Audit Report  |  Page ${i + 1} of ${pages.count}`, 50, 790, {
        align: 'center',
        width: pageWidth,
      });
  }

  doc.end();
  return doc;
}

function drawCoverPage(doc: PDFKit.PDFDocument, audit: AuditResult, date: string, w: number) {
  // Dark background
  doc.rect(0, 0, 595.28, 841.89).fill(COLORS.bg);

  // Top accent line
  doc.rect(50, 50, w, 3).fill(COLORS.amber);

  // Brand
  doc.fontSize(14).fillColor(COLORS.amber).text('SEOh.ca', 50, 70, { align: 'right', width: w });

  // Main title
  doc.fontSize(38).fillColor(COLORS.white).text('GEO Audit Report', 50, 250, { align: 'center', width: w });

  // Subtitle
  doc.fontSize(14).fillColor(COLORS.textMuted).text('Generative Engine Optimization Analysis', 50, 300, {
    align: 'center',
    width: w,
  });

  // URL
  doc.moveDown(3);
  doc.fontSize(16).fillColor(COLORS.amberLight).text(audit.url, 50, 370, { align: 'center', width: w });

  // Score circle (simulated)
  const cx = 595.28 / 2;
  const cy = 480;
  doc.circle(cx, cy, 55).lineWidth(4).strokeColor(scoreColor(audit.overall_score)).stroke();
  doc.circle(cx, cy, 50).fill(COLORS.surface);
  doc
    .fontSize(36)
    .fillColor(scoreColor(audit.overall_score))
    .text(String(audit.overall_score), cx - 40, cy - 18, { width: 80, align: 'center' });
  doc.fontSize(10).fillColor(COLORS.textMuted).text('Overall Score', cx - 40, cy + 22, { width: 80, align: 'center' });

  // Date
  doc.fontSize(12).fillColor(COLORS.textMuted).text(date, 50, 600, { align: 'center', width: w });

  // Bottom accent
  doc.rect(50, 780, w, 2).fill(COLORS.amber);
}

function drawExecutiveSummary(doc: PDFKit.PDFDocument, audit: AuditResult, w: number) {
  doc.rect(0, 0, 595.28, 841.89).fill(COLORS.bg);

  doc.fontSize(24).fillColor(COLORS.amber).text('Executive Summary', 50, 50);
  doc.rect(50, 82, 80, 2).fill(COLORS.amberDark);

  // Overall assessment
  doc.fontSize(12).fillColor(COLORS.text).text(
    `Your site scored ${audit.overall_score}/100, rated "${scoreLabel(audit.overall_score)}". ` +
    `This report analyzes five key dimensions of Generative Engine Optimization to determine ` +
    `how well your content performs in AI-powered search environments.`,
    50, 100, { width: w, lineGap: 4 }
  );

  // Dimension summary table
  let y = 170;
  doc.fontSize(14).fillColor(COLORS.white).text('Dimension Scores', 50, y);
  y += 30;

  const dims = Object.entries(audit.dimensions) as [string, DimensionResult][];
  for (const [key, dim] of dims) {
    const meta = DIMENSION_LABELS[key];
    const barWidth = (dim.score / 100) * 300;

    // Label
    doc.fontSize(11).fillColor(COLORS.text).text(meta.label, 50, y, { width: 150 });
    // Score
    doc.fontSize(11).fillColor(scoreColor(dim.score)).text(`${dim.score}/100`, 440, y, { width: 60, align: 'right' });
    // Bar background
    doc.rect(200, y + 3, 230, 10).fill(COLORS.card);
    // Bar fill
    const clampedBar = Math.min(barWidth, 230);
    if (clampedBar > 0) {
      doc.rect(200, y + 3, clampedBar * (230 / 300), 10).fill(scoreColor(dim.score));
    }

    y += 30;
  }

  // Key findings
  y += 20;
  doc.fontSize(14).fillColor(COLORS.white).text('Key Findings', 50, y);
  y += 25;

  const topIssues = audit.recommendations.slice(0, 5);
  for (const rec of topIssues) {
    doc.fontSize(10).fillColor(COLORS.textMuted).text('--', 55, y, { continued: true })
      .fillColor(COLORS.text).text(`  ${rec}`, { width: w - 20 });
    y += 20;
    if (y > 720) break;
  }
}

function drawDimensionPage(doc: PDFKit.PDFDocument, key: string, dim: DimensionResult, w: number) {
  doc.rect(0, 0, 595.28, 841.89).fill(COLORS.bg);

  const meta = DIMENSION_LABELS[key];

  // Header
  doc.fontSize(22).fillColor(COLORS.amber).text(meta.label, 50, 50);
  doc.rect(50, 80, 80, 2).fill(COLORS.amberDark);

  // Description
  doc.fontSize(11).fillColor(COLORS.textMuted).text(meta.description, 50, 95, { width: w });

  // Score badge
  const badgeY = 130;
  doc.roundedRect(50, badgeY, 120, 45, 6).fill(COLORS.surface);
  doc.rect(50, badgeY, 5, 45).fill(scoreColor(dim.score));
  doc.fontSize(24).fillColor(scoreColor(dim.score)).text(`${dim.score}`, 65, badgeY + 5, { width: 50 });
  doc.fontSize(9).fillColor(COLORS.textMuted).text(`/ 100`, 65, badgeY + 30, { width: 50 });
  doc.fontSize(11).fillColor(COLORS.text).text(scoreLabel(dim.score), 120, badgeY + 12);

  // Issues table
  let y = badgeY + 70;
  doc.fontSize(14).fillColor(COLORS.white).text('Issues Found', 50, y);
  y += 25;

  if (dim.issues.length === 0) {
    doc.fontSize(11).fillColor(COLORS.green).text('No issues detected. Excellent performance.', 50, y);
    y += 30;
  } else {
    // Table header
    doc.rect(50, y, w, 22).fill(COLORS.card);
    doc.fontSize(9).fillColor(COLORS.amberLight).text('#', 58, y + 6, { width: 25 });
    doc.text('Issue', 85, y + 6, { width: w - 45 });
    y += 22;

    dim.issues.forEach((issue, i) => {
      if (y > 700) return;
      const rowBg = i % 2 === 0 ? COLORS.surface : COLORS.bg;
      doc.rect(50, y, w, 22).fill(rowBg);
      doc.fontSize(9).fillColor(COLORS.textMuted).text(String(i + 1), 58, y + 6, { width: 25 });
      doc.fontSize(9).fillColor(COLORS.text).text(issue, 85, y + 6, { width: w - 45 });
      y += 22;
    });
  }

  // Recommendations
  y += 25;
  if (y < 650) {
    doc.fontSize(14).fillColor(COLORS.white).text('Recommendations', 50, y);
    y += 25;

    const recs = getRecommendationsForDimension(key, dim);
    for (const rec of recs) {
      if (y > 730) break;
      doc.fontSize(10).fillColor(COLORS.amber).text('>', 55, y, { continued: true });
      doc.fillColor(COLORS.text).text(`  ${rec}`, { width: w - 20 });
      y += 20;
    }
  }
}

function drawCtaPage(doc: PDFKit.PDFDocument, audit: AuditResult, w: number) {
  doc.rect(0, 0, 595.28, 841.89).fill(COLORS.bg);

  doc.fontSize(24).fillColor(COLORS.amber).text('How to Improve Your GEO Score', 50, 50);
  doc.rect(50, 82, 80, 2).fill(COLORS.amberDark);

  let y = 110;
  const steps = [
    { title: 'Implement Structured Data', desc: 'Add JSON-LD schema markup for your key content types. This helps AI models understand your content semantically.' },
    { title: 'Strengthen E-E-A-T Signals', desc: 'Add author bios, credentials, and clear sourcing. AI models prioritize trustworthy, expert content.' },
    { title: 'Optimize Content Structure', desc: 'Use clear headings, concise paragraphs, and direct answers. AI extracts from well-structured pages.' },
    { title: 'Create Citable Content', desc: 'Include unique data points, original research, and quotable statements that AI models can reference.' },
    { title: 'Monitor Platform Visibility', desc: 'Track how your content appears across ChatGPT, Perplexity, and Gemini search results.' },
  ];

  steps.forEach((step, i) => {
    doc.roundedRect(50, y, w, 55, 4).fill(COLORS.surface);
    doc.rect(50, y, 4, 55).fill(COLORS.amber);
    doc.fontSize(12).fillColor(COLORS.white).text(`${i + 1}. ${step.title}`, 65, y + 8, { width: w - 30 });
    doc.fontSize(9).fillColor(COLORS.textMuted).text(step.desc, 65, y + 26, { width: w - 30 });
    y += 65;
  });

  // CTA box
  y += 30;
  doc.roundedRect(80, y, w - 60, 100, 8).fill(COLORS.card);
  doc.rect(80, y, w - 60, 4).fill(COLORS.amber);
  doc.fontSize(18).fillColor(COLORS.white).text('Ready to dominate AI search?', 80, y + 20, {
    align: 'center',
    width: w - 60,
  });
  doc.fontSize(12).fillColor(COLORS.textMuted).text(
    'Get a comprehensive GEO optimization strategy tailored to your business.',
    100, y + 50, { align: 'center', width: w - 100 }
  );
  doc.fontSize(14).fillColor(COLORS.amber).text('seoh.ca', 80, y + 75, { align: 'center', width: w - 60 });
}

function getRecommendationsForDimension(key: string, dim: DimensionResult): string[] {
  const recs: Record<string, string[]> = {
    ai_citability: [
      'Add unique data points and original statistics that AI can cite.',
      'Include clear, concise definitions and explanations.',
      'Create FAQ sections with direct, quotable answers.',
      'Structure content with claim-evidence-source patterns.',
    ],
    schema_readiness: [
      'Add JSON-LD Organization and WebSite schema.',
      'Implement Article or Product schema for key content.',
      'Add FAQ schema for question-answer content.',
      'Validate schema with Google Rich Results Test.',
    ],
    eeat_signals: [
      'Add detailed author bios with credentials and links.',
      'Include publication dates and last-updated timestamps.',
      'Link to authoritative sources and references.',
      'Display trust signals: reviews, certifications, affiliations.',
    ],
    content_structure: [
      'Use a clear H1-H2-H3 heading hierarchy.',
      'Keep paragraphs short and focused (2-3 sentences).',
      'Add bullet points and numbered lists for key information.',
      'Include a table of contents for longer content.',
    ],
    platform_visibility: [
      'Ensure your site is accessible and fast-loading.',
      'Build topical authority with comprehensive content clusters.',
      'Optimize meta descriptions for AI snippet extraction.',
      'Monitor AI search citations with regular audits.',
    ],
  };

  return dim.score >= 90 ? ['Excellent performance. Maintain current practices.'] : (recs[key] || []);
}
