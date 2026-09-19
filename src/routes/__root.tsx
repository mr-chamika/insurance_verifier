import { createRootRoute, HeadContent, Outlet, Scripts } from '@tanstack/react-router'
import '../styles.css'
export const Route=createRootRoute({head:()=>({meta:[{charSet:'utf-8'},{name:'viewport',content:'width=device-width, initial-scale=1'},{title:'Recovery Insurance Document Check'}]}),component:Root,notFoundComponent:NotFound})
function Root(){return <html lang="en"><head><HeadContent/></head><body><Outlet/><Scripts/></body></html>}
function NotFound(){return <main className="grid min-h-screen place-items-center bg-slate-50 px-4"><div className="text-center"><p className="text-sm font-semibold text-blue-700">404</p><h1 className="mt-2 text-3xl font-bold text-slate-900">Page not found</h1><p className="mt-2 text-slate-600">The page you requested does not exist.</p><a href="/" className="mt-6 inline-block rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white hover:bg-blue-800">Return to document checker</a></div></main>}
