import type { CheerioAPI } from 'cheerio';
interface ScoreResult {
    score: number;
    issues: string[];
}
export declare function scoreSchemaReadiness($: CheerioAPI): ScoreResult;
export {};
