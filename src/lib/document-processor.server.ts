import { validateUpload } from './file-validation'
import { extractPdf } from './pdf-extractor.server'
import { ocrImages } from './image-ocr.server'
import { verifyInsurance } from './insurance-verifier'
export async function processDocument(value:unknown){
  const {file,kind}=await validateUpload(value)
  const buffer=Buffer.from(await file.arrayBuffer())
  const pages=kind==='pdf'?await extractPdf(buffer):await ocrImages([{page:1,buffer}])
  const first=verifyInsurance(pages)
  const missingCritical=first.rules.some(rule=>!rule.passed&&['start-date','expiry-date','recovery-cover','customer-vehicles'].includes(rule.ruleId))
  if(kind==='pdf'&&missingCritical)return verifyInsurance(await extractPdf(buffer,true))
  return first
}
