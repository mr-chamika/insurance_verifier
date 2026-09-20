import { RULE_CONFIG as C } from './insurance-rules'

const MONTHS: Record<string, number> = { jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11 }
const DATE = /(\d{1,2})[/. -](\d{1,2})[/. -](\d{4})|(\d{1,2})\s+(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{4})|(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{1,2}),?\s+(\d{4})/i
function parseDate(match: RegExpMatchArray) {
  const [,d,m,y,d2,mon,y2,mon2,d3,y3] = match
  const date = d ? new Date(Date.UTC(+y,+m-1,+d)) : d2 ? new Date(Date.UTC(+y2,MONTHS[mon.toLowerCase().slice(0,3)],+d2)) : new Date(Date.UTC(+y3,MONTHS[mon2.toLowerCase().slice(0,3)],+d3))
  return Number.isNaN(date.valueOf()) ? undefined : date
}
export function findLabelledDate(text: string, labels: readonly string[]) {
  const searchable=text.replace(/\s+/g,' ')
  for (const label of labels) {
    let at = searchable.toLowerCase().indexOf(label)
    while (at >= 0) {
      const source=searchable.slice(at + label.length, at + label.length + 220)
      const repaired=source.replace(/\b(20\d)\s+(\d)\b/g,'$1$2').replace(/\b(20)\s+(\d{2})\b/g,'$1$2').replace(/\b(\d{1,2})\s*(?:st|nd|rd|th)\b/gi,'$1').replace(/\bj\s+une\b/gi,'june')
      const match = repaired.match(DATE)
      if (match) return { date: parseDate(match), evidence: `${label} ${match[0]}` }
      at=searchable.toLowerCase().indexOf(label,at+label.length)
    }
  }
}

function documentDates(text: string) {
  const repaired=text.replace(/\b(20\d)\s+(\d)\b/g,'$1$2').replace(/\b(20)\s+(\d{2})\b/g,'$1$2').replace(/\b(\d{1,2})\s*(?:st|nd|rd|th)\b/gi,'$1').replace(/\bj\s+une\b/gi,'june')
  const pattern=new RegExp(DATE.source,'gi')
  return [...repaired.matchAll(pattern)].map(match=>({date:parseDate(match),evidence:match[0]}))
    .filter((item): item is {date:Date,evidence:string}=>Boolean(item.date))
    .filter((item,index,items)=>items.findIndex(other=>other.date.valueOf()===item.date.valueOf())===index)
}

export function extractDates(text: string) {
  let start=findLabelledDate(text,C.startLabels)
  let end=findLabelledDate(text,C.endLabels)
  const candidates=documentDates(text)

  // Some PDFs expose table cells in column order: both labels are emitted
  // separately from their two values. With exactly two policy dates there is
  // no ambiguity, so restore their chronological meaning.
  if(candidates.length===2 && (!start?.date || !end?.date || start.date>=end.date)) {
    const [earlier,later]=candidates.sort((a,b)=>a.date.valueOf()-b.date.valueOf())
    start={date:earlier.date,evidence:`policy commencement date ${earlier.evidence}`}
    end={date:later.date,evidence:`policy expiry date ${later.evidence}`}
  }
  return {start,end}
}
