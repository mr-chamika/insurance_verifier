import { MAX_PDF_PAGES, validateUploads } from './file-validation'
import { extractPdf } from './pdf-extractor.server'
import { ocrImages } from './image-ocr.server'
import { verifyInsurance } from './insurance-verifier'
import type { ExtractedPage } from '~/types/verification'
export async function processDocuments(value:unknown){
  const uploads=await validateUploads(value)
  const prepared=await Promise.all(uploads.map(async upload=>({...upload,buffer:Buffer.from(await upload.file.arrayBuffer())})))
  async function extract(forceOcr=false){
    const pages:ExtractedPage[]=[]
    for(const upload of prepared){
      const remaining=MAX_PDF_PAGES-pages.length
      if(remaining<1) throw new Error(`The combined upload may contain at most ${MAX_PDF_PAGES} pages.`)
      const extracted=upload.kind==='pdf'
        ? await extractPdf(upload.buffer,forceOcr,remaining)
        : await ocrImages([{page:1,buffer:upload.buffer}])
      pages.push(...extracted.map(page=>({...page,page:page.page+pages.length})))
    }
    return pages
  }
  const pages=await extract()
  const first=verifyInsurance(pages)
  const missingCritical=first.rules.some(rule=>!rule.passed&&['start-date','expiry-date','recovery-cover','customer-vehicles'].includes(rule.ruleId))
  if(prepared.some(upload=>upload.kind==='pdf')&&missingCritical)return verifyInsurance(await extract(true))
  return first
}
