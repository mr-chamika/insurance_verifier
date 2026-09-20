import { FileText, ShieldCheck, Trash2, UploadCloud } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import type { VerificationResult, VerificationType } from '~/types/verification'
import { VerificationResultView } from './verification-result'

const MAX_UPLOAD_SIZE = 4 * 1024 * 1024
const acceptedTypes = new Set(['application/pdf','image/jpeg','image/png'])
type Preview = { name:string; url:string }
type UploadItem = { file:File; pages:number }

async function countPages(file:File){
  if(file.type!=='application/pdf')return 1
  const {getDocument,GlobalWorkerOptions}=await import('pdfjs-dist')
  GlobalWorkerOptions.workerSrc=pdfWorkerUrl
  const task=getDocument({data:new Uint8Array(await file.arrayBuffer())})
  try{return (await task.promise).numPages}
  catch{throw new Error(`${file.name} could not be opened. It may be corrupted, encrypted or password-protected.`)}
}

export function DocumentUpload() {
  const input=useRef<HTMLInputElement>(null)
  const [items,setItems]=useState<UploadItem[]>([])
  const [drag,setDrag]=useState(false)
  const [busy,setBusy]=useState(false)
  const [counting,setCounting]=useState(false)
  const [stage,setStage]=useState('')
  const [result,setResult]=useState<VerificationResult>()
  const [error,setError]=useState('')
  const [previews,setPreviews]=useState<Preview[]>([])
  const [verificationType,setVerificationType]=useState<VerificationType>('insurance')

  useEffect(()=>{
    const next=items.map(({file})=>({name:file.name,url:URL.createObjectURL(file)}))
    setPreviews(next)
    return()=>next.forEach(preview=>URL.revokeObjectURL(preview.url))
  },[items])

  async function choose(selected:FileList|File[]){
    setError('');setResult(undefined)
    const additions=Array.from(selected)
    if(!additions.length)return
    if(additions.some(file=>!acceptedTypes.has(file.type))){setError('Only PDF, JPG and PNG files are supported.');return}
    const unique=additions.filter(file=>!items.some(({file:existing})=>existing.name===file.name&&existing.size===file.size&&existing.lastModified===file.lastModified))
    if(items.reduce((sum,{file})=>sum+file.size,0)+unique.reduce((sum,file)=>sum+file.size,0)>MAX_UPLOAD_SIZE){setError('The combined upload must be 4 MB or less.');return}
    setCounting(true)
    try{
      const counted=await Promise.all(unique.map(async file=>({file,pages:await countPages(file)})))
      const currentPages=items.reduce((sum,item)=>sum+item.pages,0)
      const addedPages=counted.reduce((sum,item)=>sum+item.pages,0)
      if(currentPages+addedPages>20){setError(`Cannot add ${addedPages} page${addedPages===1?'':'s'}. This would make ${currentPages+addedPages} pages; the maximum is 20.`);return}
      setItems(current=>[...current,...counted])
    }catch(e){setError(e instanceof Error?e.message:'The document pages could not be counted.')}
    finally{setCounting(false);if(input.current)input.current.value=''}
  }

  async function verify(){
    if(!items.length)return
    setBusy(true);setError('');setStage(items.some(({file})=>file.type==='application/pdf')?'Reading every PDF page':'Reading images with OCR')
    const controller=new AbortController();const timeout=window.setTimeout(()=>controller.abort(),75_000)
    try{
      const body=new FormData();body.append('verificationType',verificationType);items.forEach(({file})=>body.append('documents',file))
      const response=await fetch('/api/verify-document',{method:'POST',body,signal:controller.signal})
      setStage('Checking policy dates and cover')
      const data=await response.json().catch(()=>null)
      if(!response.ok)throw new Error(data?.error||`The server could not process the documents (${response.status}).`)
      if(!data)throw new Error('The server returned an invalid response.')
      setResult(data)
    }catch(e){
      setError(e instanceof DOMException&&e.name==='AbortError'?'Document processing timed out. Try a smaller or clearer upload.':e instanceof Error?e.message:'The documents could not be processed.')
    }finally{window.clearTimeout(timeout);setBusy(false);setStage('')}
  }

  function remove(index:number){setError('');setItems(current=>current.filter((_,itemIndex)=>itemIndex!==index))}
  function reset(){setItems([]);setResult(undefined);setError('');if(input.current)input.current.value=''}
  const tabs=<div className="mb-5 grid grid-cols-2 rounded-xl bg-slate-100 p-1" role="tablist" aria-label="Verification type">
    {([['insurance','Recovery insurance'],['goods-in-transit','Goods in Transit']] as const).map(([value,label])=><button key={value} type="button" role="tab" aria-selected={verificationType===value} onClick={()=>{setVerificationType(value);reset()}} className={`rounded-lg px-3 py-2.5 text-sm font-semibold transition ${verificationType===value?'bg-white text-blue-800 shadow-sm':'text-slate-600 hover:text-slate-900'}`}>{label}</button>)}
  </div>
  if(result)return <>{tabs}<VerificationResultView result={result} onReset={reset} previews={previews}/></>

  const totalSize=items.reduce((sum,{file})=>sum+file.size,0)
  const totalPages=items.reduce((sum,item)=>sum+item.pages,0)
  return <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_16px_60px_rgba(30,50,90,.08)] sm:p-9">{tabs}
    <div onDragOver={e=>{e.preventDefault();setDrag(true)}} onDragLeave={()=>setDrag(false)} onDrop={e=>{e.preventDefault();setDrag(false);choose(e.dataTransfer.files)}} className={`rounded-2xl border-2 border-dashed p-9 text-center transition ${drag?'border-blue-500 bg-blue-50':'border-slate-300 bg-slate-50'}`}>
      <div className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-blue-100 text-blue-700"><UploadCloud/></div>
      <h2 className="text-lg font-semibold">Upload {verificationType==='insurance'?'insurance':'Goods in Transit'} documents</h2>
      <p className="mt-2 text-sm text-slate-500">Drag and drop PDF, JPG or PNG files here</p>
      <input ref={input} type="file" multiple accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" className="hidden" onChange={e=>e.target.files&&choose(e.target.files)}/>
      <button type="button" disabled={counting} onClick={()=>input.current?.click()} className="mt-5 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold shadow-sm hover:bg-slate-50 disabled:cursor-wait disabled:opacity-60">{counting?'Counting pages…':'Choose documents'}</button>
      <p className="mt-3 text-xs text-slate-400">Maximum 4 MB combined · Up to 20 pages combined</p>
    </div>
    {error&&<p role="alert" aria-live="assertive" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</p>}
    {items.length>0&&<div className="mt-5 space-y-2">
      {items.map(({file,pages},index)=><div key={`${file.name}-${file.lastModified}`} className="flex items-center gap-3 rounded-xl border border-slate-200 p-4">
        <FileText className="shrink-0 text-blue-600"/><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{file.name}</p><p className="text-xs text-slate-500">{(file.size/1024/1024).toFixed(2)} MB · {pages} page{pages===1?'':'s'}</p></div>
        {previews[index]&&<a href={previews[index].url} target="_blank" rel="noreferrer" className="rounded-lg border border-blue-200 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50">View</a>}
        <button type="button" onClick={()=>remove(index)} aria-label={`Remove ${file.name}`} className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-700"><Trash2 size={17}/></button>
      </div>)}
      <p className="text-right text-xs text-slate-500">{items.length} file{items.length===1?'':'s'} · {totalPages} of 20 pages · {(totalSize/1024/1024).toFixed(2)} MB of 4 MB</p>
    </div>}
    {stage&&<div className="mt-5 flex items-center gap-3 rounded-xl bg-blue-50 p-4 text-sm text-blue-800"><span className="size-4 animate-spin rounded-full border-2 border-blue-200 border-t-blue-700"/>{stage}</div>}
    <button onClick={verify} disabled={!items.length||busy} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3.5 font-semibold text-white hover:bg-blue-800 disabled:bg-slate-300"><ShieldCheck size={19}/>{busy?'Verifying documents…':'Verify documents'}</button>
  </div>
}
