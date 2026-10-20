import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle2, GraduationCap, Search, XCircle } from 'lucide-react';
import { acad, type Verification } from '../api/academics';
import { docTitle } from '../composants/academics/DocumentSheet';

/** Public page (no login): confirms that a printed document is genuine. Shows no grades. */
export default function VerifyDocument() {
  const { code: param } = useParams();
  const [code, setCode] = useState(param ?? '');
  const [res, setRes] = useState<(Verification & { http: number }) | null>(null);
  const [busy, setBusy] = useState(false);
  const check = async (c: string) => { if (!c.trim()) return; setBusy(true); try { setRes(await acad.verify(c)); } catch { setRes({ valid: false, http: 0 }); } finally { setBusy(false); } };
  useEffect(() => { if (param) void check(param); }, [param]);
  const fr = (() => { try { const l = localStorage.getItem('lang'); if (l) return l === 'fr'; } catch { /* storage unavailable */ } return navigator.language.startsWith('fr'); })();
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-slate-200 p-6 space-y-5">
        <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center"><GraduationCap className="text-white" size={22} /></div><div><h1 className="font-bold text-slate-800">{fr ? 'Vérification de document' : 'Document verification'}</h1><p className="text-xs text-slate-500">{fr ? 'Confirmez qu’un document est authentique' : 'Confirm a document is genuine'}</p></div></div>
        <form className="flex gap-2" onSubmit={e => { e.preventDefault(); void check(code); }}>
          <input aria-label="Verification code" className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono uppercase" placeholder="UMS-XXXXXXXX-XXXXXXXX" value={code} onChange={e => setCode(e.target.value)} />
          <button className="px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium flex items-center gap-1.5 disabled:opacity-50" disabled={busy || !code.trim()}><Search size={14} /> {fr ? 'Vérifier' : 'Check'}</button>
        </form>
        {res && (res.valid ? (
          <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 space-y-2">
            <p className="flex items-center gap-2 font-semibold text-emerald-700"><CheckCircle2 size={20} /> {fr ? 'Document authentique' : 'Genuine document'}</p>
            <dl className="text-sm text-slate-700 space-y-1">
              {([[fr ? 'Type' : 'Type', docTitle(res.type ?? '', fr)], [fr ? 'Établissement' : 'Institution', res.school], [fr ? 'Délivré à' : 'Issued to', res.student?.name], ['Matricule', res.student?.matricule], [fr ? 'Filière' : 'Programme', res.student?.programme], ['Date', res.issued_at ? new Date(res.issued_at).toLocaleDateString() : '']] as [string, string | null | undefined][])
                .filter(([, v]) => v).map(([k, v]) => <div key={k} className="flex gap-3"><dt className="w-28 shrink-0 text-slate-500">{k}</dt><dd className={k === 'Matricule' ? 'font-mono' : ''}>{v}</dd></div>)}
            </dl>
          </div>
        ) : res.http === 429 ? (
          <p role="alert" className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">{fr ? 'Trop de vérifications. Réessayez dans une minute.' : 'Too many checks. Try again in a minute.'}</p>
        ) : (
          <div role="status" className="rounded-xl border border-red-200 bg-red-50 p-4">
            <p className="flex items-center gap-2 font-semibold text-red-700"><XCircle size={20} /> {res.status === 'revoked' ? (fr ? 'Document révoqué' : 'Document revoked') : (fr ? 'Code inconnu ou invalide' : 'Unknown or invalid code')}</p>
            <p className="text-sm text-red-700/80 mt-1">{res.status === 'revoked' ? (fr ? 'Ce document n’est plus valide.' : 'This document is no longer valid.') : (fr ? 'Vérifiez le code ou contactez l’établissement.' : 'Check the code or contact the institution.')}</p>
          </div>
        ))}
        <p className="text-[11px] text-slate-400 text-center">{fr ? 'Aucune note n’est affichée ici.' : 'No grades are shown on this page.'}</p>
      </div>
    </div>
  );
}
