export type VerificationStatus = 'APPROVED' | 'REJECTED'
export type RuleResult = { ruleId: string; label: string; passed: boolean; reason: string; evidence?: string; page?: number; confidence?: number }
export type VerificationResult = { status: VerificationStatus; summary: string; reasons: string[]; rules: RuleResult[] }
export type ExtractedPage = { page: number; text: string; confidence?: number; processed: boolean }
