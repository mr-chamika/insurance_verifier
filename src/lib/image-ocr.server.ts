import { createCanvas, loadImage } from '@napi-rs/canvas'
import { createWorker, PSM } from 'tesseract.js'

async function prepareImage(buffer:Buffer) {
  const image=await loadImage(buffer)
  const source=createCanvas(image.width,image.height)
  const context=source.getContext('2d')
  context.drawImage(image,0,0)
  const pixels=context.getImageData(0,0,image.width,image.height).data
  const step=Math.max(4,Math.floor(Math.min(image.width,image.height)/250))
  const brightRow=(y:number) => {
    let bright=0,total=0
    for(let x=0;x<image.width;x+=step){const i=(y*image.width+x)*4;const luminance=.2126*pixels[i]+.7152*pixels[i+1]+.0722*pixels[i+2];if(luminance>165)bright++;total++}
    return bright/Math.max(1,total)>.45
  }
  const bands:Array<{top:number;bottom:number}>=[]
  let top:number|null=null
  for(let y=0;y<image.height;y+=step){if(brightRow(y)){if(top===null)top=y}else if(top!==null){if(y-top>image.height*.12)bands.push({top,bottom:y});top=null}}
  if(top!==null)bands.push({top,bottom:image.height})
  const band=bands.sort((a,b)=>(b.bottom-b.top)-(a.bottom-a.top))[0]
  let left=0,right=image.width,cropTop=0,cropBottom=image.height
  if(band && band.bottom-band.top<image.height*.92){
    cropTop=Math.max(0,band.top-step*2);cropBottom=Math.min(image.height,band.bottom+step*2)
    const brightColumn=(x:number) => {
      let bright=0,total=0
      for(let y=cropTop;y<cropBottom;y+=step){const i=(y*image.width+x)*4;const luminance=.2126*pixels[i]+.7152*pixels[i+1]+.0722*pixels[i+2];if(luminance>165)bright++;total++}
      return bright/Math.max(1,total)>.35
    }
    const columns:number[]=[]
    for(let x=0;x<image.width;x+=step)if(brightColumn(x))columns.push(x)
    if(columns.length){left=Math.max(0,columns[0]-step*2);right=Math.min(image.width,columns.at(-1)!+step*2)}
  }
  const width=right-left,height=cropBottom-cropTop
  const scale=Math.max(1,Math.min(3,2200/width))
  const output=createCanvas(Math.round(width*scale),Math.round(height*scale))
  const outputContext=output.getContext('2d')
  outputContext.fillStyle='white';outputContext.fillRect(0,0,output.width,output.height)
  outputContext.drawImage(source,left,cropTop,width,height,0,0,output.width,output.height)
  return output.toBuffer('image/png')
}
export async function ocrImages(images: Array<{page:number;buffer:Buffer}>) {
  const worker=await createWorker('eng')
  await worker.setParameters({preserve_interword_spaces:'1',tessedit_pageseg_mode:PSM.AUTO})
  try { const pages=[]; for(const image of images){
    let input=image.buffer
    try { input=await prepareImage(image.buffer) } catch { /* Tesseract can still try the original image. */ }
    const {data}=await worker.recognize(input)
    pages.push({page:image.page,text:data.text,confidence:data.confidence,processed:true})
  } return pages }
  finally { await worker.terminate() }
}
