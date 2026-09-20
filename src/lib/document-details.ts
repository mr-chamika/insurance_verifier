import type { ExtractedDocumentData, ExtractedPage } from '~/types/verification'
import { extractDates, findLabelledDate } from './field-extraction'
import { normaliseText } from './text-normalisation'

const first = (text:string,patterns:RegExp[]) => patterns.map(pattern=>text.match(pattern)?.[1]?.trim()).find(Boolean)
const dateValue = (date?:Date) => date?.toLocaleDateString('en-GB',{day:'2-digit',month:'long',year:'numeric',timeZone:'UTC'})

export function extractDocumentDetails(name:string,pages:ExtractedPage[]):ExtractedDocumentData {
  const text=normaliseText(pages.map(page=>page.text).join('\n'))
  const dates=extractDates(text)
  const issued=findLabelledDate(text,['date of issue','schedule dated','statement dated','issue date','issued on'])
  const premiumTable=text.match(/\bpremium due\s+plus premium tax(?:\s*\([^)]+\))?\s+total payable\s+(£\s*[\d,]+(?:\.\d{2})?)\s+(£\s*[\d,]+(?:\.\d{2})?)\s+(£\s*[\d,]+(?:\.\d{2})?)/i)
  const fields:Array<{label:string;value:string|undefined}>=[
    {label:'Document type',value:first(text,[/\b(policy schedule motor trade road risks insurance)\b/i,/\b(certificate of motor insurance)\b/i,/\b(goods in transit (?:insurance )?(?:policy|schedule|certificate))\b/i,/\b(temporary cover note)\b/i])},
    {label:'Policyholder / insured',value:first(text,[/\b(?:name of (?:the )?policyholder|name of insured|insured|proposer name)\s*[:-]?\s*((?:mr|mrs|ms|miss|dr)?\s*[a-z][a-z .&'()-]{2,}?)(?=\s*\b(?:address|business address|motor trade occupation|persons? entitled|effective date|commencement date|start date|period of insurance|policy cover|cover type|date of expiry|expiry date)\b|\n|$)/i])},
    {label:'Insurer',value:first(text,[/\b((?:covea|covéa) insurance plc)\b/i,/\b(?:insured|underwritten|insurance provided) by\s*[:-]?\s*([a-z][a-z .&'()-]+?(?:insurance|underwriting)[a-z .&'()-]*(?:plc|limited|ltd))\b/i,/\b([a-z][a-z .&'()-]+ insurance (?:company )?(?:plc|limited|ltd))\b/i])},
    {label:'Policy / certificate number',value:first(text,[/\b(?:policy|certificate)\s*(?:number|no\.?|#)\s*[:-]?\s*([a-z0-9]+(?:[ /-](?!(?:name|insured|policyholder)\b)[a-z0-9]+){0,4})\b/i])},
    {label:'Issue date',value:dateValue(issued?.date)},
    {label:'Cover start',value:dateValue(dates.start?.date)},
    {label:'Cover expiry',value:dateValue(dates.end?.date)},
    {label:'Cover type',value:first(text,[/\bpolicy cover\s*[:-]?\s*(comprehensive|third party fire and theft|third party only)\b/i,/\b(fully comprehensive)\b/i])},
    {label:'Business / occupation',value:first(text,[/\bmotor trade occupation\s*[:-]?\s*([a-z][a-z /&-]{3,80}?)(?=\s{2,}|\bother occupation\b)/i,/\bdeclared business\s*[:-]?\s*([a-z][a-z /&-]{3,80}?)(?=\s{2,}|\bpolicy\b)/i])},
    {label:'Own-vehicle indemnity',value:first(text,[/\bown vehicle indemnity limit(?: for section \d+)?\s*[:-]?\s*(£\s*[\d,]+(?:\.\d{2})?)/i])},
    {label:'Customer-vehicle indemnity',value:first(text,[/\bcustomer vehicle indemnity(?: limit(?: for section \d+)?)?\s*[:-]?\s*(£\s*[\d,]+(?:\.\d{2})?)/i])},
    {label:'Goods in Transit limit',value:first(text,[/\bgoods in transit\b[^.\n]{0,100}\b(?:indemnity limit|limit of indemnity|sum insured|limit)\s*[:-]?\s*(£\s*[\d,]+(?:\.\d{2})?)/i])},
    {label:'Excess',value:first(text,[/\bexcess\s*[:-]?\s*(£\s*[\d,]+(?:\.\d{2})?)/i])},
    {label:'Premium before tax',value:premiumTable?.[1]??first(text,[/\bpremium(?: before tax)?\s*[:-]?\s*(£\s*[\d,]+(?:\.\d{2})?)/i])},
    {label:'Premium tax',value:premiumTable?.[2]??first(text,[/\b(?:premium tax|insurance premium tax|ipt)(?:\s*\([^)]+\))?\s*[:-]?\s*(£\s*[\d,]+(?:\.\d{2})?)/i])},
    {label:'Total premium payable',value:premiumTable?.[3]??first(text,[/\b(?:total payable|premium inclusive of ipt)\s*[:-]?\s*(£\s*[\d,]+(?:\.\d{2})?)/i])},
  ]
  return {name,fields:fields.filter((field):field is {label:string;value:string}=>Boolean(field.value))}
}
