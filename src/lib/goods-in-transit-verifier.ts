import type { ExtractedPage, RuleResult, VerificationResult } from '~/types/verification'
import { RULE_CONFIG as C } from './insurance-rules'
import { extractDates } from './field-extraction'
import { normaliseText, textWindows } from './text-normalisation'

const GIT_COVER = [
  /\bgoods in transit\b/i,
  /\bgoods(?: and merchandise)? while in transit\b/i,
  /\bcarriers'? goods in transit\b/i,
]
export const MINIMUM_GIT_LIMIT = 50_000
const INSURED = [/\b(?:insured|policyholder|proposer|name of insured)\s*[:-]?\s*[a-z][a-z .'-]{2,}/i]
const GIT_LIMIT = [
  /\bgoods in transit\b[^.\n]{0,120}\b(?:limit of indemnity|sum insured|limit|any one (?:vehicle|load|claim|event))\s*[:-]?\s*£\s*[\d,]+/i,
  /\b(?:limit of indemnity|sum insured|limit|any one (?:vehicle|load|claim|event))\b[^.\n]{0,80}\bgoods in transit\b[^.\n]{0,40}£\s*[\d,]+/i,
]
const VEHICLE_GOODS = [
  /\b(?:customers?'?|third[- ]part(?:y|ies)'?) (?:motor )?vehicles?\b/i,
  /\b(?:motor )?vehicles? (?:being )?(?:carried|transported|in transit)\b/i,
  /\bvehicle recovery(?:\/collection)?(?: and| &)? delivery\b/i,
]
const EXCLUSIONS = [
  /\b(?:motor )?vehicles?(?: being (?:carried|transported))?[^.;\n]{0,60}\b(?:are |is )?(?:excluded|not covered|not insured)\b/i,
  /\b(?:excluding|no cover for|does not cover|not covering)\s+(?:customers?'? |third[- ]party )?(?:motor )?vehicles?\b/i,
  /\bgoods in transit[^.;\n]{0,80}\b(?:is |are )?(?:excluded|not covered|not insured)\b/i,
  /\b(?:excluding|no cover for|does not cover|not covering)\s+goods in transit\b/i,
]

const match = (text: string, patterns: readonly RegExp[]) => patterns.map(pattern=>text.match(pattern)?.[0]).find(Boolean)
const money = (evidence?:string) => {
  const value=evidence?.match(/£\s*([\d,]+)/)?.[1]
  return value ? Number(value.replace(/,/g,'')) : undefined
}
const rule = (ruleId:string,label:string,passed:boolean,reason:string,evidence?:string,page?:number):RuleResult=>({ruleId,label,passed,reason,evidence,page})

export function verifyGoodsInTransit(pages: ExtractedPage[], now=new Date()):VerificationResult {
  const all=normaliseText(pages.map(page=>page.text).join('\n\n'))
  const windows=textWindows(pages)
  const cover=windows.map(window=>({...window,evidence:match(window.text,GIT_COVER)})).find(item=>item.evidence)
  const vehicleCover=windows.map(window=>({...window,evidence:match(window.text,VEHICLE_GOODS)})).find(item=>item.evidence)
  const limit=windows.map(window=>({...window,evidence:match(window.text,GIT_LIMIT)})).find(item=>item.evidence)
  const limitAmount=money(limit?.evidence)
  const exclusion=windows.map(window=>({...window,evidence:match(window.text,EXCLUSIONS)})).find(item=>item.evidence)
  const dates=extractDates(all)
  const today=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate()))
  const confidences=pages.filter(page=>page.confidence!=null)
  const averageConfidence=confidences.reduce((sum,page)=>sum+(page.confidence??0),0)/Math.max(1,confidences.length)
  const rules:RuleResult[]=[
    rule('readable','Readable document',all.length>=C.minimumTextLength,'The uploaded document could not be read.'),
    rule('pages','All pages processed',pages.length>0&&pages.every(page=>page.processed),'One or more pages could not be processed.'),
    rule('confidence','Reliable extraction',!confidences.length||averageConfidence>=C.minimumOcrConfidence,'The extracted information was not reliable enough to approve the document.'),
    rule('policy-number','Policy or certificate number',C.policyNumberLabels.some(pattern=>pattern.test(all)),'The policy number could not be identified.'),
    rule('insured','Named insured or policyholder',Boolean(match(all,INSURED)),'The named insured or policyholder could not be identified.',match(all,INSURED)),
    rule('start-date','Policy start date',Boolean(dates.start?.date),'The policy start date could not be confirmed.',dates.start?.evidence),
    rule('started','Policy has started',!dates.start?.date||dates.start.date<=today,'The policy has not started.',dates.start?.evidence),
    rule('expiry-date','Policy expiry date',Boolean(dates.end?.date),'The policy expiry date could not be confirmed.',dates.end?.evidence),
    rule('active','Policy expiration',!dates.end?.date||dates.end.date>=today,'The policy has expired.',dates.end?.evidence),
    rule('git-cover','Goods in Transit cover',Boolean(cover),'Explicit Goods in Transit cover could not be confirmed.',cover?.evidence,cover?.page),
    rule('vehicle-cover','Vehicles carried as goods',Boolean(vehicleCover),'Cover for customers’ vehicles while carried or transported could not be confirmed.',vehicleCover?.evidence,vehicleCover?.page),
    rule('indemnity-limit','Goods in Transit limit of at least £50,000',Boolean(limitAmount&&limitAmount>=MINIMUM_GIT_LIMIT),limitAmount==null?'A Goods in Transit indemnity or sum-insured limit could not be confirmed.':`The Goods in Transit limit is £${limitAmount.toLocaleString('en-GB')}, below the required minimum of £${MINIMUM_GIT_LIMIT.toLocaleString('en-GB')}.`,limit?.evidence,limit?.page),
    rule('git-exclusions','Conflicting vehicle/GIT exclusion',!exclusion,'The document contains an exclusion conflicting with the required Goods in Transit cover.',exclusion?.evidence,exclusion?.page),
  ]
  const failed=rules.filter(item=>!item.passed)
  return {verificationType:'goods-in-transit',status:failed.length?'REJECTED':'APPROVED',summary:failed.length?'The document did not pass every required Goods in Transit check.':'The document passed the configured Goods in Transit checks.',reasons:failed.map(item=>item.reason),rules}
}
