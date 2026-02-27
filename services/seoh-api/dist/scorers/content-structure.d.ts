import type { CheerioAPI } from 'cheerio';
interface ScoreResult {
    score: number;
    issues: string[];
}
export declare function scoreContentStructure($: CheerioAPI): ScoreResult;
export {};
