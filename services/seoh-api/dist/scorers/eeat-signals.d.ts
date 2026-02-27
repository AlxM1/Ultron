import type { CheerioAPI } from 'cheerio';
interface ScoreResult {
    score: number;
    issues: string[];
}
export declare function scoreEeatSignals($: CheerioAPI, url: string, text: string): ScoreResult;
export {};
