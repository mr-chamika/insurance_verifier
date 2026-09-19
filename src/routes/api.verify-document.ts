import { createFileRoute } from '@tanstack/react-router'
import { processDocument } from '~/lib/document-processor.server'

const attempts=new Map<string,{count:number;reset:number}>()
export const Route=createFileRoute('/api/verify-document')({server:{handlers:{POST:async({request})=>{
  const ip=request.headers.get('x-forwarded-for')?.split(',')[0]??'local'; const now=Date.now(); const state=attempts.get(ip)
  if(state&&state.reset>now&&state.count>=10)return Response.json({error:'Too many requests. Please try again later.'},{status:429})
  attempts.set(ip,!state||state.reset<=now?{count:1,reset:now+60_000}:{...state,count:state.count+1})
  try { const form=await request.formData(); const result=await Promise.race([processDocument(form.get('document')),new Promise<never>((_,reject)=>setTimeout(()=>reject(new Error('Processing timed out.')),120_000))]); return Response.json(result,{headers:{'Cache-Control':'no-store'}}) }
  catch(error){const message=error instanceof Error?error.message:'The document could not be processed.';return Response.json({error:message},{status:400,headers:{'Cache-Control':'no-store'}})}
}}}})
