import { getDocument, VerbosityLevel } from 'pdfjs-dist/legacy/build/pdf.mjs'
import { createCanvas } from '@napi-rs/canvas'
import { MAX_PDF_PAGES } from './file-validation'
import { ocrImages } from './image-ocr.server'
import type { ExtractedPage } from '~/types/verification'

export async function extractPdf(buffer: Buffer, forceOcr = false): Promise<ExtractedPage[]> {
  const task=getDocument({
    data:new Uint8Array(buffer),
    useSystemFonts:true,
    disableFontFace:true,
    verbosity:VerbosityLevel.ERRORS,
  })
  let pdf
  try { pdf=await task.promise } catch (error) {
    console.error('PDF.js failed to open the uploaded PDF:', error)
    throw new Error('The PDF could not be opened. It may be corrupted, encrypted or password-protected.')
  }
  if(pdf.numPages>MAX_PDF_PAGES) throw new Error(`PDFs may contain at most ${MAX_PDF_PAGES} pages.`)
  const pages: ExtractedPage[]=[]; const scan: Array<{page:number;buffer:Buffer}>=[]
  for(let n=1;n<=pdf.numPages;n++){
    const page=await pdf.getPage(n); const content=await page.getTextContent(); const text=content.items.map(item=>'str' in item?item.str:'').join(' ')
    if(text.trim().length>=80 && !forceOcr) pages.push({page:n,text,processed:true})
    else { const viewport=page.getViewport({scale:2}); const canvas=createCanvas(Math.ceil(viewport.width),Math.ceil(viewport.height)); await page.render({canvasContext:canvas.getContext('2d'),viewport} as never).promise; scan.push({page:n,buffer:canvas.toBuffer('image/png')}) }
    if(forceOcr) pages.push({page:n,text,processed:true})
  }
  if(scan.length){
    const ocr=await ocrImages(scan)
    if(forceOcr){for(const item of ocr){const embedded=pages.find(page=>page.page===item.page);if(embedded){embedded.text=`${embedded.text}\n\n${item.text}`;embedded.confidence=item.confidence}else pages.push(item)}}
    else pages.push(...ocr)
  }
  return pages.sort((a,b)=>a.page-b.page)
}
