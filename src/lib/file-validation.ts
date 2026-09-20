import { z } from 'zod'
export const MAX_FILE_SIZE = 4 * 1024 * 1024
export const MAX_PDF_PAGES = 20
const input = z.instanceof(File).refine(f=>f.size>0,'Files must not be empty.')
export async function validateUpload(value: unknown) {
  const file=input.parse(value); const bytes=new Uint8Array(await file.slice(0,12).arrayBuffer())
  const pdf=bytes.slice(0,5).every((v,i)=>v===[0x25,0x50,0x44,0x46,0x2d][i]); const png=bytes.slice(0,8).every((v,i)=>v===[137,80,78,71,13,10,26,10][i]); const jpg=bytes[0]===0xff&&bytes[1]===0xd8&&bytes[2]===0xff
  if(!pdf&&!png&&!jpg) throw new Error('Only valid PDF, JPG and PNG files are supported.')
  return {file,kind:pdf?'pdf':png?'png':'jpeg'} as const
}

export async function validateUploads(value: unknown) {
  const files=z.array(z.instanceof(File)).min(1,'Please upload at least one document.').parse(value)
  const totalSize=files.reduce((sum,file)=>sum+file.size,0)
  if(totalSize>MAX_FILE_SIZE) throw new Error('The combined upload must be 4 MB or less.')
  return Promise.all(files.map(validateUpload))
}
