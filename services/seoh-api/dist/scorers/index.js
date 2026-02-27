"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.runAudit = runAudit;
const cheerio = __importStar(require("cheerio"));
const ai_citability_1 = require("./ai-citability");
const schema_readiness_1 = require("./schema-readiness");
const eeat_signals_1 = require("./eeat-signals");
const content_structure_1 = require("./content-structure");
const platform_visibility_1 = require("./platform-visibility");
async function runAudit(url) {
    // Fetch the page
    const response = await fetch(url, {
        headers: {
            'User-Agent': 'SEOh-GEO-Scorer/1.0 (+https://seoh.ca)',
            'Accept': 'text/html,application/xhtml+xml',
        },
        redirect: 'follow',
        signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) {
        throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
    }
    const html = await response.text();
    const $ = cheerio.load(html);
    const text = $('body').text().replace(/\s+/g, ' ').trim();
    // Score each dimension
    const ai_citability = (0, ai_citability_1.scoreAiCitability)($, text);
    const schema_readiness = (0, schema_readiness_1.scoreSchemaReadiness)($);
    const eeat_signals = (0, eeat_signals_1.scoreEeatSignals)($, url, text);
    const content_structure = (0, content_structure_1.scoreContentStructure)($);
    const platform_visibility = (0, platform_visibility_1.scorePlatformVisibility)({
        ai_citability: ai_citability.score,
        schema_readiness: schema_readiness.score,
        eeat_signals: eeat_signals.score,
        content_structure: content_structure.score,
    });
    // Overall score: weighted average
    const overall_score = Math.round(ai_citability.score * 0.25 +
        schema_readiness.score * 0.20 +
        eeat_signals.score * 0.20 +
        content_structure.score * 0.15 +
        platform_visibility.score * 0.20);
    // Generate recommendations from top issues
    const allIssues = [
        ...ai_citability.issues.map(i => ({ dim: 'AI Citability', issue: i })),
        ...schema_readiness.issues.map(i => ({ dim: 'Schema Readiness', issue: i })),
        ...eeat_signals.issues.map(i => ({ dim: 'E-E-A-T', issue: i })),
        ...content_structure.issues.map(i => ({ dim: 'Content Structure', issue: i })),
        ...platform_visibility.issues.map(i => ({ dim: 'Platform Visibility', issue: i })),
    ];
    const recommendations = allIssues
        .slice(0, 10)
        .map(({ dim, issue }) => `[${dim}] ${issue}`);
    return {
        url,
        overall_score,
        dimensions: {
            ai_citability,
            schema_readiness,
            eeat_signals,
            content_structure,
            platform_visibility,
        },
        recommendations,
        audited_at: new Date().toISOString(),
    };
}
