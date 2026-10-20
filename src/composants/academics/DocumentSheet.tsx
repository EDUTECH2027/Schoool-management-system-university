import { createPortal } from 'react-dom';
import { Printer, X } from 'lucide-react';
import type { OfficialDoc } from '../../api/academics';
import { useLanguage } from '../../i18n/LanguageContext';
import { fmtDate } from './ui';

/* eslint-disable @typescript-eslint/no-explicit-any */
const TITLES: Record<string, [string, string]> = {
  transcript: ['Relevé de notes officiel', 'Official transcript'], statement_of_results: ['Relevé de résultats', 'Statement of results'],
  enrolment_certificate: ['Certificat de scolarité', 'Certificate of enrolment'], registration_summary: ['Récapitulatif d’inscription', 'Registration summary'],
};
export const docTitle = (type: string, fr: boolean) => (TITLES[type] ?? [type, type])[fr ? 0 : 1];

/** Portal overlay whose content is the only thing printed (see .doc-print-root in index.css). */
export function PrintOverlay({ label, onClose, children }: { label: string; onClose: () => void; children: React.ReactNode }) {
  const { lang } = useLanguage(); const fr = lang === 'fr';
  return createPortal(
    <div className="fixed inset-0 z-[70] bg-black/60 overflow-y-auto p-4" role="dialog" aria-modal="true" aria-label={label}>
      <div className="doc-print-root max-w-3xl mx-auto bg-white text-slate-900 rounded-xl shadow-2xl p-8 relative">
        <div className="no-print absolute top-3 right-3 flex gap-2">
          <button className="px-3 py-1.5 rounded-lg text-sm border border-slate-300 flex items-center gap-1.5 text-slate-700 bg-white hover:bg-slate-50" onClick={() => window.print()}><Printer size={14} /> {fr ? 'Imprimer' : 'Print'}</button>
          <button aria-label="Close" className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100" onClick={onClose}><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>, document.body);
}

/** Full-screen printable sheet with the verification QR code. Rendered in a portal so printing isolates it. */
export default function DocumentSheet({ doc, onClose }: { doc: OfficialDoc; onClose: () => void }) {
  const { lang } = useLanguage(); const fr = lang === 'fr';
  const p: any = doc.payload ?? {};
  const s = p.student ?? {};
  return createPortal(
    <div className="fixed inset-0 z-[70] bg-black/60 overflow-y-auto p-4 no-print-bg" role="dialog" aria-modal="true" aria-label={docTitle(doc.type, fr)}>
      <div className="doc-print-root max-w-3xl mx-auto bg-white text-slate-900 rounded-xl shadow-2xl p-8 relative">
        <div className="no-print absolute top-3 right-3 flex gap-2">
          <button className="px-3 py-1.5 rounded-lg text-sm border border-slate-300 flex items-center gap-1.5 text-slate-700 bg-white hover:bg-slate-50" onClick={() => window.print()}><Printer size={14} /> {fr ? 'Imprimer' : 'Print'}</button>
          <button aria-label="Close" className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100" onClick={onClose}><X size={18} /></button>
        </div>
        <header className="text-center border-b-2 border-slate-800 pb-4 mb-5">
          <h1 className="text-xl font-bold uppercase tracking-wide">{p.school?.name}</h1>
          <p className="text-xs text-slate-500">{[p.school?.address, p.school?.phone, p.school?.email].filter(Boolean).join(' · ')}</p>
          <h2 className="text-lg font-semibold mt-3">{docTitle(doc.type, fr)}</h2>
        </header>
        <section className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm mb-5">
          <p><span className="text-slate-500">{fr ? 'Nom' : 'Name'}:</span> <b>{s.name}</b></p><p><span className="text-slate-500">Matricule:</span> <b>{s.matricule}</b></p>
          <p><span className="text-slate-500">{fr ? 'Filière' : 'Programme'}:</span> {s.programme ?? '—'}</p><p><span className="text-slate-500">{fr ? 'Niveau' : 'Level'}:</span> {s.level ?? s.class_name ?? '—'}</p>
          {s.faculty && <p><span className="text-slate-500">{fr ? 'Faculté' : 'Faculty'}:</span> {s.faculty}</p>}
          {p.academic_year && <p><span className="text-slate-500">{fr ? 'Année académique' : 'Academic year'}:</span> {p.academic_year}</p>}
        </section>

        {doc.type === 'enrolment_certificate' && (
          <p className="text-sm leading-7 my-6">{fr ? `Nous certifions que ${s.name} (matricule ${s.matricule}) est régulièrement inscrit(e) en ${s.programme ?? 'formation'}${p.academic_year ? `, année académique ${p.academic_year}` : ''}.` : `We certify that ${s.name} (matricule ${s.matricule}) is regularly enrolled in ${s.programme ?? 'a programme'}${p.academic_year ? ` for the academic year ${p.academic_year}` : ''}.`}</p>
        )}

        {(p.terms ?? []).map((t: any, i: number) => (
          <section key={i} className="mb-4 break-inside-avoid">
            <h3 className="text-sm font-semibold bg-slate-100 px-2 py-1 rounded">{t.academic_year} · {t.term} — GPA {t.gpa}</h3>
            <table className="w-full text-xs mt-1"><thead><tr className="text-left text-slate-500"><th className="py-1">Code</th><th>{fr ? 'Cours' : 'Course'}</th><th className="text-center">Cr.</th><th className="text-center">CA</th><th className="text-center">{fr ? 'Exam' : 'Exam'}</th><th className="text-center">Total</th><th className="text-center">{fr ? 'Note' : 'Grade'}</th></tr></thead>
              <tbody>{t.courses.map((c: any, j: number) => <tr key={j} className="border-t border-slate-200"><td className="py-1 font-mono">{c.code}</td><td>{c.course}{c.resit && ` (${fr ? 'rattrapage' : 'resit'} ${c.resit.score})`}</td><td className="text-center">{c.credits}</td><td className="text-center">{c.ca}</td><td className="text-center">{c.exam}</td><td className="text-center">{c.total}</td><td className="text-center font-semibold">{c.grade}{!c.passed && ' ✗'}</td></tr>)}</tbody></table>
          </section>
        ))}
        {p.cumulative && <p className="text-sm font-semibold mt-3">{fr ? 'GPA cumulé' : 'Cumulative GPA'}: {p.cumulative.gpa} · {fr ? 'Crédits capitalisés' : 'Credits earned'}: {p.earned_credits}</p>}

        {doc.type === 'registration_summary' && (
          <table className="w-full text-sm"><thead><tr className="text-left text-slate-500"><th>Code</th><th>{fr ? 'Cours' : 'Course'}</th><th>Cr.</th></tr></thead><tbody>{(p.courses ?? []).map((c: any, i: number) => <tr key={i} className="border-t"><td className="font-mono text-xs py-1">{c.code}</td><td>{c.course}</td><td>{c.credits}</td></tr>)}</tbody></table>
        )}

        <footer className="mt-8 pt-4 border-t border-slate-300 flex items-center gap-4 text-xs text-slate-600">
          {doc.qr && <img src={doc.qr} alt="QR" width={96} height={96} className="shrink-0" />}
          <div className="min-w-0">
            <p>{fr ? 'Vérifiez l’authenticité de ce document :' : 'Verify the authenticity of this document:'}</p>
            <p className="font-mono break-all">{doc.verify_url}</p>
            <p>{fr ? 'Code' : 'Code'}: <b className="font-mono">{doc.code}</b> · {fr ? 'Émis le' : 'Issued'} {fmtDate(doc.issued_at, lang)}{doc.issued_by_name ? ` · ${doc.issued_by_name}` : ''}</p>
            {doc.status === 'revoked' && <p className="text-red-600 font-semibold mt-1">{fr ? 'DOCUMENT RÉVOQUÉ' : 'REVOKED DOCUMENT'}{doc.revoked_reason ? ` — ${doc.revoked_reason}` : ''}</p>}
          </div>
        </footer>
      </div>
    </div>, document.body);
}
