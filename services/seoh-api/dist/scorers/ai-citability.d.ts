import type { CheerioAPI } from 'cheerio';
interface ScoreResult {
    score: number;
    issues: string[];
}
export declare function scoreAiCitability($: CheerioAPI, text: string): ScoreResult;
export {};
