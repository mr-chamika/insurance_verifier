import { MAX_PDF_PAGES, validateUploads } from './file-validation'
import { extractPdf } from './pdf-extractor.server'
import { ocrImages } from './image-ocr.server'
import { verifyInsurance } from './insurance-verifier'
import { verifyGoodsInTransit } from './goods-in-transit-verifier'
import { extractDocumentDetails } from './document-details'
import type { ExtractedPage, VerificationType } from '~/types/verification'
export async function processDocuments(value:unknown,verificationType:VerificationType='insurance'){
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
      const offset=pages.length
      pages.push(...extracted.map(page=>({...page,page:page.page+offset,sourceName:upload.file.name,sourcePage:page.page})))
    }
    return pages
  }
  function withDocuments(pages:ExtractedPage[],result:ReturnType<typeof verifyInsurance>){
    return {...result,verificationType,documents:prepared.map(upload=>({
      ...extractDocumentDetails(upload.file.name,pages.filter(page=>page.sourceName===upload.file.name)),
    }))}
  }
  const pages=await extract()
  const verify=verificationType==='goods-in-transit'?verifyGoodsInTransit:verifyInsurance
  const first=verify(pages)
  const missingCritical=first.rules.some(rule=>!rule.passed&&['start-date','expiry-date','recovery-cover','customer-vehicles'].includes(rule.ruleId))
  if(prepared.some(upload=>upload.kind==='pdf')&&missingCritical){
    const retried=await extract(true)
    return withDocuments(retried,verify(retried))
  }
  return withDocuments(pages,first)
}
