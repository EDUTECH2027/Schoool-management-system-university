import { useState } from 'react';
import { Upload } from 'lucide-react';
import { assess, type ExportResult } from '../../api/assessments';
import { Badge, ErrorBox, Modal, Spinner, btnGhost, btnPrimary, msg, useFr, useLoad } from '../academics/ui';
import { num } from './shared';

const REASON: Record<string, [string, string]> = {
  locked: ['Mark already submitted/approved/published — not touched', 'Note déjà soumise/approuvée/publiée — non modifiée'],
  no_graded_items: ['Nothing graded yet', 'Aucun élément noté'], not_selected: ['Not selected', 'Non sélectionné'], error: ['Error', 'Erreur'],
};

export default function GradebookPanel({ offeringId, canExport }: { offeringId: string; canExport: boolean }) {
  const fr = useFr();
  const g = useLoad(() => assess.gradebook(offeringId), [offeringId]);
  const [preview, setPreview] = useState<ExportResult | null>(null);
  const [done, setDone] = useState<ExportResult | null>(null);
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const openPreview = async () => { setErr(''); setDone(null); setBusy(true); try { setPreview(await assess.exportCA(offeringId, true)); } catch (e) { setErr(msg(e)); } finally { setBusy(false); } };
  const confirm = async () => { setBusy(true); setErr(''); try { setDone(await assess.exportCA(offeringId, false)); setPreview(null); } catch (e) { setErr(msg(e)); } finally { setBusy(false); } };
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm text-slate-500 mr-auto max-w-3xl">{fr ? 'Contrôle continu (0–100) = moyenne pondérée des éléments NOTÉS uniquement ; les éléments non rendus ou en attente ne comptent pas comme zéro mais sont signalés.' : 'Continuous assessment (0–100) = weighted average of GRADED items only; missing or pending items are not counted as zero but are flagged.'}</p>
        <button className={btnPrimary} disabled={!canExport || busy || !g.data?.students.length} title={canExport ? '' : (fr ? 'Réservé à l’enseignant du cours' : 'Only the course lecturer can export')} onClick={openPreview}><Upload size={14} /> {fr ? 'Exporter le CC vers les notes (brouillon)' : 'Export CA to marks (draft)'}</button>
      </div>
      <ErrorBox message={err || g.error} />
      {done && <div role="status" className="text-sm bg-emerald-50 text-emerald-800 rounded-lg p-3">{fr ? `${done.written} note(s) mise(s) à jour en brouillon, ${done.unchanged} inchangée(s), ${done.skipped} ignorée(s).` : `${done.written} mark(s) written as drafts, ${done.unchanged} unchanged, ${done.skipped} skipped.`}</div>}
      {!g.data ? <Spinner /> : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
          <table className="w-full text-sm" style={{ minWidth: 520 + g.data.columns.length * 110 }}>
            <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr>
              <th className="text-left px-4 py-3">{fr ? 'Étudiant' : 'Student'}</th>
              {g.data.columns.map(c => <th key={c.key} className="px-3 py-3 text-center font-semibold normal-case"><span className="block truncate max-w-[9rem]" title={c.title}>{c.title}</span><span className="block text-[10px] font-normal text-slate-400">{c.kind === 'quiz' ? 'Quiz' : (fr ? 'Devoir' : 'Assign.')} · ×{num(c.weight)}</span></th>)}
              <th className="px-3 py-3 text-center">CA /100</th><th className="px-3 py-3 text-center">{fr ? 'Manquants' : 'Missing'}</th>
            </tr></thead>
            <tbody className="divide-y divide-slate-100">
              {g.data.students.map(s => (
                <tr key={s.student_id}>
                  <td className="px-4 py-2"><p className="font-medium text-slate-800">{s.name}</p><p className="text-xs text-slate-400">{s.matricule}</p></td>
                  {g.data!.columns.map(c => { const it = s.items[c.key]; return <td key={c.key} className="px-3 py-2 text-center">{it.state === 'graded' ? <span title={`${num(it.score)}/${num(it.max)}`}>{num(it.pct)}%{it.late && <span className="text-red-500" title="late"> •</span>}</span> : it.state === 'pending' ? <Badge tone="amber">{fr ? 'à noter' : 'to grade'}</Badge> : <span className="text-slate-300">—</span>}</td>; })}
                  <td className="px-3 py-2 text-center font-semibold text-slate-800">{s.ca.value === null ? '—' : num(s.ca.value)}</td>
                  <td className="px-3 py-2 text-center text-xs text-slate-500">{s.ca.missing + s.ca.pending > 0 ? `${s.ca.missing + s.ca.pending}/${s.ca.total}` : ''}</td>
                </tr>
              ))}
              {!g.data.students.length && <tr><td className="px-4 py-10 text-center text-slate-400" colSpan={3 + g.data.columns.length}>{fr ? 'Aucun étudiant inscrit.' : 'Nobody is registered for this course.'}</td></tr>}
            </tbody>
          </table>
        </div>
      )}
      {preview && (
        <Modal wide title={fr ? 'Aperçu : CC → notes (brouillon)' : 'Preview: CA → draft marks'} onClose={() => setPreview(null)}>
          <div className="space-y-3">
            <p className="text-sm text-slate-600">{fr ? `${preview.will_write} note(s) seront écrites en brouillon ; la note d’examen existante est conservée. Les notes déjà soumises, approuvées ou publiées ne sont jamais modifiées.` : `${preview.will_write} mark(s) will be written as drafts; the existing exam score is kept. Marks already submitted, approved or published are never touched.`}</p>
            <div className="overflow-x-auto border border-slate-200 rounded-xl"><table className="w-full text-sm min-w-[560px]">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="text-left px-3 py-2">{fr ? 'Étudiant' : 'Student'}</th><th className="px-3">{fr ? 'CC actuel' : 'Current CA'}</th><th className="px-3">{fr ? 'Nouveau CC' : 'New CA'}</th><th className="px-3">{fr ? 'Examen' : 'Exam'}</th><th className="text-left px-3">{fr ? 'Résultat' : 'Outcome'}</th></tr></thead>
              <tbody className="divide-y divide-slate-100 text-center">
                {preview.students.map(r => (
                  <tr key={r.student_id}><td className="text-left px-3 py-2">{r.name}{r.missing + r.pending > 0 && r.ca !== null && <span className="text-xs text-amber-600"> · {r.missing + r.pending} {fr ? 'manquant(s)' : 'not counted'}</span>}</td>
                    <td>{r.current ? num(r.current.ca_score) : '—'}</td><td className="font-semibold">{r.ca === null ? '—' : num(r.ca)}</td><td>{r.current ? num(r.current.exam_score) : '0'}</td>
                    <td className="text-left px-3">{r.action === 'write' ? <Badge tone="green">{fr ? 'Écrit' : 'Will write'}</Badge> : <span className="text-xs text-slate-500">{REASON[r.reason ?? 'error']?.[fr ? 1 : 0] ?? r.reason}</span>}</td></tr>
                ))}
              </tbody></table></div>
            <div className="flex justify-end gap-2"><button className={btnGhost} onClick={() => setPreview(null)}>{fr ? 'Annuler' : 'Cancel'}</button><button className={btnPrimary} disabled={busy || !preview.will_write} onClick={confirm}>{fr ? `Écrire ${preview.will_write} note(s)` : `Write ${preview.will_write} mark(s)`}</button></div>
          </div>
        </Modal>
      )}
    </div>
  );
}
