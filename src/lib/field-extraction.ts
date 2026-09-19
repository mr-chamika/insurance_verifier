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
export const extractDates = (text: string) => ({ start: findLabelledDate(text, C.startLabels), end: findLabelledDate(text, C.endLabels) })
