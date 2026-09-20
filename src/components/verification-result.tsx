import { useState } from 'react'
import { createPortal } from 'react-dom'
import { CheckCircle2, RotateCcw, X, XCircle } from 'lucide-react'
import type { VerificationResult } from '~/types/verification'

const EXCLUSION_HIGHLIGHT = /\b(hire|reward|passengers?|towing|recovery)\b/gi

function HighlightedExclusion({ text }: { text: string }) {
  return <>{text.split(EXCLUSION_HIGHLIGHT).map((part, index) =>
    /^(?:hire|reward|passengers?|towing|recovery)$/i.test(part)
      ? <strong key={index} className="font-bold not-italic">{part}</strong>
      : part
  )}</>
}

export function VerificationResultView({ result, onReset, previewUrl }: {
  result: VerificationResult
  onReset: () => void
  previewUrl?: string
}) {
  const [showDocument, setShowDocument] = useState(false)
  const ok = result.status === 'APPROVED'
  const failed = result.rules.filter((rule) => !rule.passed)
  const statedExclusions = result.rules.filter((rule) => rule.ruleId.startsWith('exclusions-stated-') && rule.evidence)

  const resultCard = <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_12px_40px_rgba(30,50,90,.08)]">
    <div className={`mx-auto grid size-20 place-items-center rounded-full border-4 shadow-lg ${ok ? 'border-emerald-200 bg-emerald-100 text-emerald-700 shadow-emerald-200/70' : 'border-red-200 bg-red-100 text-red-700 shadow-red-200/70'}`}>
      {ok ? <CheckCircle2 size={46} strokeWidth={2.5} /> : <XCircle size={46} strokeWidth={2.5} />}
    </div>
    <div className="mt-4 text-center">
      <h2 className={`inline-block rounded-2xl border-2 px-6 py-2 text-4xl font-black tracking-wide shadow-sm sm:text-5xl ${ok ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-red-300 bg-red-50 text-red-800'}`}>{result.status}</h2>
    </div>
    <p className="mt-3 text-center text-base font-medium leading-6 text-slate-700">{result.summary}</p>
    {!showDocument && <div className="mt-4 flex flex-col items-stretch justify-center gap-2 sm:flex-row sm:items-center">
      {previewUrl && <button type="button" onClick={() => setShowDocument(true)} className="inline-flex items-center justify-center rounded-lg border border-blue-200 px-4 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-50">View uploaded document</button>}
      <button type="button" onClick={onReset} className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-emerald-200 transition hover:bg-emerald-700 hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600">
        <RotateCcw size={15} />Check another document
      </button>
    </div>}
    {!ok && <div className="mt-4 rounded-xl bg-red-50 px-5 py-4">
      <h3 className="text-lg font-semibold text-red-900">Why it was rejected</h3>
      <ul className="mt-3 space-y-3 text-base leading-7 text-red-800">
        {failed.map((rule) => <li key={rule.ruleId} className="flex gap-2">
          <span className="font-bold" aria-hidden="true">•</span>
          <div>
            <p className="font-bold">{rule.label}</p>
            <p>{rule.reason}</p>
            {rule.ruleId === 'exclusions' && rule.evidence && <blockquote className="mt-1 border-l-2 border-red-300 pl-2 italic text-red-700">
              “{rule.evidence.length > 220 ? `${rule.evidence.slice(0, 220)}…` : rule.evidence}”
              {rule.page && <span className="not-italic text-red-500"> — page {rule.page}</span>}
            </blockquote>}
          </div>
        </li>)}
      </ul>
    </div>}
    {statedExclusions.length > 0 && <div className="mt-3 rounded-xl bg-amber-50 px-5 py-4 text-base leading-7 text-amber-900">
      <p className="text-lg font-semibold">Exclusions stated</p>
      <div className="mt-2 space-y-3">
        {statedExclusions.map((rule) => <blockquote key={rule.ruleId} className="border-l-4 border-amber-300 pl-3 italic text-amber-800">
          “<HighlightedExclusion text={rule.evidence!} />”{rule.page && <span className="not-italic text-amber-700"> — page {rule.page}</span>}
        </blockquote>)}
      </div>
      <p className="mt-3 text-sm leading-6 text-amber-700">This wording is shown for review. It causes rejection only when it conflicts directly with recovery, customers’ vehicles, or motor-trade business use.</p>
    </div>}
    <div className="mt-3 border-t border-slate-200 pt-3">
      <p className="text-[10px] leading-4 text-slate-500">This automated result only means the document passed the configured checks. It does not confirm authenticity, insurer records, continuing policy status, or freedom from fraud.</p>
    </div>
  </div>

  if (!showDocument || !previewUrl) return resultCard

  const splitView = <div className="document-comparison">
    <section className="comparison-result" aria-label="Verification result">
      {resultCard}
    </section>
    <section className="comparison-document" aria-label="Uploaded document">
      <div className="comparison-toolbar">
        <span>Uploaded document</span>
        <button type="button" onClick={() => setShowDocument(false)} className="comparison-close" aria-label="Close document view"><X size={16} />Close</button>
      </div>
      <iframe src={`${previewUrl}#view=FitH&zoom=page-width`} title="Uploaded insurance document" className="comparison-frame" />
    </section>
  </div>

  return createPortal(splitView, document.body)
}
