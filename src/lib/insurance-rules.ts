/** All business policy lives here. Terms are intentionally editable and fail closed. */
export const RULE_CONFIG = {
  minimumTextLength: 120,
  minimumOcrConfidence: 65,
  policyNumberLabels: [/\b(?:policy|cer[a-z$5]{1,4}ficate)\s*(?:number|no\.?|#)\s*[:-]?\s*[a-z0-9](?:[a-z0-9/ -]*[a-z0-9])\b/i],
  insurerTerms: [/\b(?:underwritten|insured by|insurer|insurance company)\s*(?:by|:)\s*[a-z][a-z &.'-]{2,}/i, /\bissuing company\s+[a-z][a-z &.'-]{2,}/i, /\b[a-z][a-z &.'-]{1,60}\s+insurance company (?:limited|plc)\b/i, /\b[a-z][a-z &.'-]{1,60}\s+underwriting agency (?:limited|ltd)\b/i, /\b[a-z][a-z &.'-]{1,60}\s+insurance uk plc\b/i],
  comprehensiveTerms: [/\bfully comprehensive\b/i, /\bcomprehensive (?:motor )?cover\b/i],
  recoveryTerms: [/\bbreakdown\s+recovery\b/i, /\bvehicle\s+recovery(?:\s*\/\s*delivery)?\b/i, /\brecovery\s+operator\b/i, /\brecovery\s+of\s+broken[- ]down\b/i, /\brecovery\s+of\s+(?:broken[- ]down\s+and\s+)?accident[- ]damaged\s+vehicles?\b/i, /\bcar\s+transportation\s+cover\b/i, /\btransportation\s+of\s+motor\s+vehicles?\s+by\s+road\b/i, /\btow(?:ing)?\b/i, /\btransport(?:ation|ing)?\s+of\s+(?:customer|third[- ]party).*vehicles?\b/i],
  declaredRecoveryBusinessTerms: [/\baccident\s*\/\s*breakdown\s+recovery\b/i, /\bbreakdown\s+recovery\b/i, /\bvehicle\s+recovery(?:\s*\/\s*delivery)?\b/i, /\brecovery\s+of\s+broken[- ]down\b/i, /\brecovery\s+of\s+(?:broken[- ]down\s+and\s+)?accident[- ]damaged\s+vehicles?\b/i],
  customerVehicleTerms: [/\bcustomers?'? vehicles?\b/i, /\bthird[- ]part(?:y|ies)'? vehicles?\b/i, /\brecovered\s+vehicles?\b/i, /\bvehicles? in (?:the )?(?:insured's )?custody or control\b/i, /\b(?:motor )?vehicles? held in trust(?: by)? or in (?:the )?custody or control\b/i, /\bany motor vehicle(?: being)? transported by the insured\b/i],
  commercialTerms: [/\bhire (?:and|or) reward\b/i, /\bfor (?:payment|remuneration|a fee)\b/i, /\bcommercial (?:vehicle )?recovery\b/i, /\bpaid recovery\b/i],
  tradeUseTerms: [/\bmotor trade(?:r)?\b/i, /\bvehicle recovery business\b/i, /\bbusiness use.*(?:recovery|towing)\b/i, /\buse.*in connection with.*(?:motor trade(?:r)?|recovery business)\b/i],
  personalUseTerms: [/\bsocial,? domestic (?:and|&) pleasure\b/i, /\bsocial,? domestic (?:and|&) pleasure.*commuting\b/i, /\bpersonal use only\b/i],
  exclusionPatterns: [
    /\b(?:exclude[sd]?|excluding|not covered|not permitted|no cover)[^.\n]{0,90}\b(?:breakdown recovery|vehicle recovery|tow(?:ing)?|transport(?:ation)? of customers?'? vehicles?)\b/i,
    /\b(?:breakdown recovery|vehicle recovery|tow(?:ing)?|transport(?:ation)? of customers?'? vehicles?)[^.\n]{0,60}\b(?:exclude[sd]?|not covered|not permitted|prohibited)\b/i,
    /\brecovery of customers?'? vehicles?\b[^.\n]{0,60}\b(?:exclude[sd]?|not covered|not permitted|prohibited)\b/i,
    /\b(?:business|commercial|motor trade) use\b[^.\n]{0,60}\b(?:not covered|exclude[sd]?|not permitted|prohibited)\b/i,
    /\b(?:not covered|exclude[sd]?|not permitted|prohibited)[^.\n]{0,60}\b(?:business|commercial|motor trade) use\b/i,
  ],
  startLabels: ['effective date of the commencement of cover', 'effective date of the commencement of insurance', 'effective time and date for commencement', 'effective time and date of commencement', 'effective time / date', 'effective time/date', 'operative date', 'operative from', 'effective from', 'commencement date', 'start date', 'valid from'],
  endLabels: ['date of the expiry of insurance', 'date of expiry of insurance', 'date of expiry of cover', 'expiry time and date of the insurance', 'expiry time and date of insurance', 'expiry time / date', 'expiry time/date', 'operative until', 'operative to', 'expiry date', 'expires', 'end date', 'valid until'],
} as const
