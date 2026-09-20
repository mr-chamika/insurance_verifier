export type VerificationStatus = 'APPROVED' | 'REJECTED'
export type VerificationType = 'insurance' | 'goods-in-transit'
export type RuleResult = { ruleId: string; label: string; passed: boolean; reason: string; evidence?: string; page?: number; confidence?: number }
export type ExtractedDocumentData = { name: string; fields: Array<{ label: string; value: string }> }
export type VerificationResult = { status: VerificationStatus; verificationType?: VerificationType; summary: string; reasons: string[]; rules: RuleResult[]; documents?: ExtractedDocumentData[] }
export type ExtractedPage = { page: number; text: string; confidence?: number; processed: boolean; sourceName?: string; sourcePage?: number }
