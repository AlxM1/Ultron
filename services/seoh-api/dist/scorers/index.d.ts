export interface DimensionResult {
    score: number;
    issues: string[];
}
export interface AuditResult {
    url: string;
    overall_score: number;
    dimensions: {
        ai_citability: DimensionResult;
        schema_readiness: DimensionResult;
        eeat_signals: DimensionResult;
        content_structure: DimensionResult;
        platform_visibility: DimensionResult;
    };
    recommendations: string[];
    audited_at: string;
}
export declare function runAudit(url: string): Promise<AuditResult>;
