import {useEffect,useRef,useState} from 'react';
import type {PDFDocumentLoadingTask,PDFDocumentProxy,RenderTask} from 'pdfjs-dist';
import './official-pdf-preview.css';
/** Real PDF.js canvas view. Copies template bytes before worker transfer. */
export function OfficialPdfPreview({bytes,page=1,title}:{bytes:Uint8Array;page?:number;title:string}) {
 const wrap=useRef<HTMLDivElement>(null);const canvas=useRef<HTMLCanvasElement>(null);
 const [document,setDocument]=useState<PDFDocumentProxy|null>(null);
 const [currentPage,setCurrentPage]=useState(page);const [width,setWidth]=useState(0);
 const [loading,setLoading]=useState(true);const [rendering,setRendering]=useState(false);const [error,setError]=useState('');
 useEffect(()=>{setCurrentPage(page);},[page]);
 useEffect(()=>{
  const node=wrap.current;if(!node)return;
  const measure=()=>setWidth(Math.max(1,node.clientWidth-32));measure();
  const observer=new ResizeObserver(entries=>{const next=entries[0]?.contentRect.width;if(next)setWidth(next);});observer.observe(node);return()=>observer.disconnect();
 },[]);
 useEffect(()=>{
  let cancelled=false;let task:PDFDocumentLoadingTask|undefined;
  setDocument(null);setLoading(true);setError('');
  void(async()=>{try{
   const [pdfjs,workerAsset]=await Promise.all([import('pdfjs-dist'),import('pdfjs-dist/build/pdf.worker.min.mjs?url')]);
   if(cancelled)return;
   pdfjs.GlobalWorkerOptions.workerSrc=workerAsset.default;
   task=pdfjs.getDocument({data:bytes.slice(),useSystemFonts:true});
   const loaded=await task.promise;if(cancelled)return;
   setDocument(loaded);setCurrentPage(p=>Math.max(1,Math.min(p,loaded.numPages)));setLoading(false);
  }catch(e){if(!cancelled){setError(e instanceof Error?e.message:'The PDF could not be opened.');setLoading(false);}}})();
  return()=>{cancelled=true;if(task)void task.destroy().catch(()=>undefined);};
 },[bytes]);
 useEffect(()=>{
  if(!document||!canvas.current||!width)return;
  let cancelled=false;let task:RenderTask|undefined;
  setRendering(true);setError('');
  void(async()=>{try{
   const pdfPage=await document.getPage(currentPage);if(cancelled||!canvas.current)return;
   const base=pdfPage.getViewport({scale:1});const viewport=pdfPage.getViewport({scale:width/base.width});
   const target=canvas.current;const context=target.getContext('2d');if(!context)throw new Error('PDF canvas is unavailable.');
   const dpr=Math.min(window.devicePixelRatio||1,2);target.width=Math.floor(viewport.width*dpr);target.height=Math.floor(viewport.height*dpr);target.style.width=`${viewport.width}px`;target.style.height=`${viewport.height}px`;
   task=pdfPage.render({canvas:target,canvasContext:context,viewport,transform:dpr===1?undefined:[dpr,0,0,dpr,0,0]});await task.promise;
   if(!cancelled)setRendering(false);
  }catch(e){if(!cancelled){setError(e instanceof Error?e.message:'PDF rendering failed.');setRendering(false);}}})();
  return()=>{cancelled=true;task?.cancel();};
 },[document,currentPage,width]);
 return <figure className="opp" aria-busy={loading||rendering}>
  <figcaption className="opp-head"><div><p className="opp-kicker">PDF preview</p><p className="opp-title">{title}</p></div>{document&&document.numPages>1?<div className="opp-pager" role="group" aria-label="PDF pages"><button type="button" className="opp-btn" aria-label="Previous PDF page" disabled={currentPage<=1} onClick={()=>setCurrentPage(p=>p-1)}>←</button><span className="opp-page" aria-live="polite">Page {currentPage} of {document.numPages}</span><button type="button" className="opp-btn" aria-label="Next PDF page" disabled={currentPage>=document.numPages} onClick={()=>setCurrentPage(p=>p+1)}>→</button></div>:null}</figcaption>
  <div className="opp-canvas-wrap" ref={wrap}>{loading||rendering?<p className="opp-state" role="status">{loading?'Opening PDF…':`Rendering page ${currentPage}…`}</p>:null}{error?<p className="opp-state opp-error" role="alert">Could not display PDF: {error}</p>:null}<canvas ref={canvas} className="opp-canvas" role="img" aria-label={`${title} — page ${currentPage}`} hidden={!!error||loading}/><p className="opp-fallback">Text and drawings come from the PDF. Draft entries remain unsigned and require review.</p></div>
 </figure>;
}
