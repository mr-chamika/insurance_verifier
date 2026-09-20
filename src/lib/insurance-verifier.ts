import type { ExtractedPage, RuleResult, VerificationResult } from '~/types/verification'
import { RULE_CONFIG as C } from './insurance-rules'
import { extractDates } from './field-extraction'
import { normaliseText, textWindows } from './text-normalisation'

const has = (s: string, terms: readonly RegExp[]) => {
  const searchable=s.replace(/\s+/g,' ')
  return terms.some(r => r.test(searchable))
}
const result = (ruleId:string,label:string,passed:boolean,reason:string,evidence?:string,page?:number): RuleResult => ({ruleId,label,passed,reason,evidence,page})
const SECTION_HEADING = String.raw`(?:effective (?:time and )?date|operative (?:date|from|until|to)|persons? entitled to drive|limitations? as to use|declaration|car transportation cover|covered vehicles|motor vehicle european cover|description of vehicles|name of (?:the )?policyholder|territorial limits|limit of indemnity|we hereby certify|notes?|advice to third parties|procedure in the event|warning|broker|date of issue)`
const exclusionBlocks = (text:string,page:number) => {
  const normalised=normaliseText(text)
  const starts=[...normalised.matchAll(/\b(?:the policy does not cover|exclud\w*|does not cover|not covered|use for (?:the )?carriage of passengers? or goods? for hire or reward)\b/gi)]
  return starts.map((match) => {
    const start=match.index ?? 0
    const tail=normalised.slice(start)
    const boundary=tail.search(new RegExp(String.raw`\s+(?=(?:\d{1,2}[.)]\s*)?${SECTION_HEADING}\b)`,'i'))
    const end=boundary>0 ? start+boundary : Math.min(normalised.length,start+1600)
    return {page,start,end,text:normalised.slice(start,end).replace(/\s+/g,' ').trim()}
  }).filter((item,index,items)=>!items.some((other,otherIndex)=>otherIndex<index && other.start<=item.start && other.end>=item.end))
    .map(({page,text})=>({page,text}))
}
export function verifyInsurance(pages: ExtractedPage[], now = new Date()): VerificationResult {
  const all = normaliseText(pages.map(p => p.text).join('\n\n'))
  const windows = textWindows(pages)
  const coverage = windows.find(w => has(w.text,C.recoveryTerms) && has(w.text,C.customerVehicleTerms) && has(w.text,C.commercialTerms) && has(w.text,C.tradeUseTerms))
  const recovery = windows.find(w => has(w.text,C.recoveryTerms))
  const customerVehicles = windows.find(w => has(w.text,C.customerVehicleTerms))
  const declaredRecoveryBusiness = has(all,C.declaredRecoveryBusinessTerms) && has(all,C.tradeUseTerms)
  const positiveCommercialUse = windows.some(w => has(w.text,C.commercialTerms) && !/\b(?:exclusion|exclusions|excluding|excluded|not covered|does not cover|not permitted|prohibited)\b/i.test(w.text))
  const commercialRecovery = Boolean(recovery && customerVehicles && (declaredRecoveryBusiness || positiveCommercialUse))
  const directExclusion = windows.find(w => has(w.text,C.exclusionPatterns))
  const exclusionClauses = pages.flatMap(({text,page}) => exclusionBlocks(text,page))
  const negativeClauses = exclusionClauses
    .filter(item=>/\b(?:does not cover|not covered)\b/i.test(item.text))
  const passengerVehicleExclusion=negativeClauses.find(item=>/\bpassengers?\b/i.test(item.text)&&/\bvehicles?\b/i.test(item.text))
  const hireRewardExclusion=exclusionClauses.find(item=>/\buse for hire (?:or|and) reward\b/i.test(item.text))
    ?? pages.map(({text,page})=>({page,text:normaliseText(text).match(/\buse for hire (?:or|and) reward(?:\s+is)?\s+(?:excluded|not covered|not permitted)\b/i)?.[0]}))
      .find((item): item is {page:number,text:string}=>Boolean(item.text))
  const exclusion=directExclusion??passengerVehicleExclusion??((recovery||declaredRecoveryBusiness)?hireRewardExclusion:undefined)
  const statedExclusions = exclusionClauses
    .filter(item=>item.text.length>0)
    // A forced OCR retry contains both the PDF text layer and OCR text. Keep
    // only the first rendering of exclusion sections that begin alike.
    .filter((item,index,items)=>{
      const opening=item.text.replace(/[^a-z0-9 ]/gi,' ').replace(/\s+/g,' ').split(' ').slice(0,10).join(' ')
      return items.findIndex(other=>other.page===item.page&&other.text.replace(/[^a-z0-9 ]/gi,' ').replace(/\s+/g,' ').split(' ').slice(0,10).join(' ')===opening)===index
    })
  const personalOnly = has(all,C.personalUseTerms) && !has(all,C.tradeUseTerms)
  const dates = extractDates(all)
  const today = new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate()))
  const averageConfidence = pages.filter(p => p.confidence != null).reduce((a,p)=>a+(p.confidence ?? 0),0) / Math.max(1,pages.filter(p=>p.confidence!=null).length)
  const rules: RuleResult[] = [
    result('readable','Readable document',all.length>=C.minimumTextLength,'The uploaded document could not be read.'),
    result('pages','All pages processed',pages.length>0 && pages.every(p=>p.processed),'One or more pages could not be processed.'),
    result('confidence','Reliable extraction',!pages.some(p=>p.confidence!=null) || averageConfidence>=C.minimumOcrConfidence,'The extracted information was not reliable enough to approve the document.'),
    result('policy-number','Policy or certificate number',has(all,C.policyNumberLabels),'The policy number could not be identified.'),
    result('start-date','Policy start date',!!dates.start?.date,'The policy start date could not be confirmed.',dates.start?.evidence),
    result('started','Policy has started',!dates.start?.date || dates.start.date<=today,'The policy has not started.',dates.start?.evidence),
    result('expiry-date','Policy expiry date',!!dates.end?.date,'The policy expiry date could not be confirmed.',dates.end?.evidence),
    result('active','Policy expiration',!dates.end?.date || dates.end.date>=today,'The policy has expired.',dates.end?.evidence),
    result('business-use','Motor-trade recovery business use',has(all,C.tradeUseTerms) && !personalOnly, personalOnly ? 'The policy only confirms social, domestic and pleasure use; commercial recovery use is not insured.' : 'Motor-trade or recovery-business use could not be confirmed.'),
    result('recovery-cover','Recovery or towing cover',!!recovery,'Recovery or towing cover could not be confirmed.',recovery?.text,recovery?.page),
    result('customer-vehicles','Customers’ vehicles covered',!!customerVehicles,'Cover for customers’ or third-party vehicles could not be confirmed.',customerVehicles?.text,customerVehicles?.page),
    result('commercial-recovery','Commercial recovery use',commercialRecovery,'Commercial motor-trade recovery use could not be confirmed.',coverage?.text,coverage?.page),
    result('exclusions','Conflicting exclusion',!exclusion,'The document contains an exclusion conflicting with the required cover.',exclusion?.text,exclusion?.page),
    ...statedExclusions.map((item,index)=>result(`exclusions-stated-${index}`,'Exclusions stated',true,'The document contains an exclusion that should be reviewed.',item.text,item.page)),
  ]
  const failed = rules.filter(r=>!r.passed)
  return { status: failed.length ? 'REJECTED':'APPROVED', summary: failed.length ? 'The document did not pass every required check.':'The document passed the configured document checks.', reasons: failed.map(r=>r.reason), rules }
}
