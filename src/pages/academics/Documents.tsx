import { useState } from 'react';
import { Eye, Ban, FilePlus2 } from 'lucide-react';
import { api } from '../../api/client';
import { acad, type OfficialDoc } from '../../api/academics';
import { mapTerm } from '../../api/mappers';
import DocumentSheet, { docTitle } from '../../composants/academics/DocumentSheet';
import { ErrorBox, Field, Modal, PageHeader, Spinner, StatusBadge, Table, btnDanger, btnGhost, btnPrimary, fmtDate, input, msg, useDebounced, useFr, useLoad } from '../../composants/academics/ui';
import { useLanguage } from '../../i18n/LanguageContext';

const TYPES = ['transcript', 'statement_of_results', 'enrolment_certificate', 'registration_summary'];

export default function Documents() {
  const { lang } = useLanguage(); const fr = lang === 'fr';
  const [type, setType] = useState('');
  const list = useLoad(() => acad.docs({ type }), [type]);
  const [issue, setIssue] = useState(false);
  const [view, setView] = useState<OfficialDoc | null>(null);
  const [revoke, setRevoke] = useState<OfficialDoc | null>(null); const [reason, setReason] = useState(''); const [err, setErr] = useState('');
  const open = async (d: OfficialDoc) => { try { setView(await acad.doc(d.id)); } catch (e) { setErr(msg(e)); } };
  return (
    <div className="space-y-5">
      <PageHeader title={fr ? 'Documents officiels' : 'Official documents'} subtitle={fr ? 'Relevés, attestations et récapitulatifs avec code QR de vérification publique' : 'Transcripts, certificates and summaries with a public verification QR code'} onRefresh={() => void list.reload()}>
        <select aria-label="Type" className={input} value={type} onChange={e => setType(e.target.value)}><option value="">{fr ? 'Tous les types' : 'All types'}</option>{TYPES.map(t => <option key={t} value={t}>{docTitle(t, fr)}</option>)}</select>
        <button className={btnPrimary} onClick={() => setIssue(true)}><FilePlus2 size={14} /> {fr ? 'Émettre un document' : 'Issue a document'}</button>
      </PageHeader>
      <ErrorBox message={err || list.error} />
      {!list.data ? <Spinner /> : (
        <Table min={860} head={[fr ? 'Document' : 'Document', fr ? 'Étudiant' : 'Student', 'Code', fr ? 'Émis le' : 'Issued', fr ? 'Statut' : 'Status', '']} empty={list.data.length ? undefined : (fr ? 'Aucun document émis' : 'No documents issued yet')}>
          {list.data.map(d => (
            <tr key={d.id}>
              <td className="px-4 py-3 font-medium text-slate-800">{docTitle(d.type, fr)}</td>
              <td className="px-4 py-3">{d.student}<p className="text-xs text-slate-400">{d.matricule}</p></td>
              <td className="px-4 py-3 font-mono text-xs">{d.code}</td>
              <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{fmtDate(d.issued_at, lang)}<p className="text-xs text-slate-400">{d.issued_by_name}</p></td>
              <td className="px-4 py-3"><StatusBadge status={d.status} />{d.revoked_reason && <p className="text-xs text-slate-400 mt-1 max-w-[12rem]">{d.revoked_reason}</p>}</td>
              <td className="px-4 py-3"><div className="flex gap-1 justify-end"><button aria-label="View" className="p-1.5 text-slate-500 hover:text-indigo-600" onClick={() => void open(d)}><Eye size={15} /></button>{d.status === 'issued' && <button aria-label="Revoke" className="p-1.5 text-slate-500 hover:text-red-600" onClick={() => { setReason(''); setRevoke(d); }}><Ban size={15} /></button>}</div></td>
            </tr>
          ))}
        </Table>
      )}
      {issue && <IssueModal onClose={() => setIssue(false)} onIssued={d => { setIssue(false); setView(d); void list.reload(); }} />}
      {view && <DocumentSheet doc={view} onClose={() => setView(null)} />}
      {revoke && (
        <Modal title={`${fr ? 'Révoquer' : 'Revoke'} · ${revoke.code}`} onClose={() => setRevoke(null)}>
          <p className="text-sm text-slate-500 mb-3">{fr ? 'Le code restera vérifiable mais indiquera que le document n’est plus valide.' : 'The code stays checkable but will show the document is no longer valid.'}</p>
          <Field label={fr ? 'Motif (obligatoire)' : 'Reason (required)'}><input className={`${input} w-full`} value={reason} onChange={e => setReason(e.target.value)} /></Field>
          <div className="flex justify-end gap-2 pt-4"><button className={btnGhost} onClick={() => setRevoke(null)}>{fr ? 'Annuler' : 'Cancel'}</button><button className={btnDanger} disabled={!reason.trim()} onClick={async () => { try { await acad.revokeDoc(revoke.id, reason); void list.reload(); } catch (e) { setErr(msg(e)); } setRevoke(null); }}>{fr ? 'Révoquer' : 'Revoke'}</button></div>
        </Modal>
      )}
    </div>
  );
}

function IssueModal({ onClose, onIssued }: { onClose: () => void; onIssued: (d: OfficialDoc) => void }) {
  const fr = useFr();
  const [q, setQ] = useState(''); const dq = useDebounced(q);
  const students = useLoad(() => (dq.length >= 2 ? acad.students(dq) : Promise.resolve([])), [dq]);
  const terms = useLoad(async () => (await api.getTerms()).map(mapTerm)); const years = useLoad(() => api.getYears());
  const [studentId, setStudentId] = useState(''); const [type, setType] = useState('transcript'); const [termId, setTermId] = useState(''); const [yearId, setYearId] = useState('');
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const go = async () => {
    setBusy(true); setErr('');
    try { onIssued(await acad.issueDoc({ student_id: studentId, type, ...(['statement_of_results', 'registration_summary'].includes(type) && (termId ? { term_id: termId } : yearId ? { academic_year_id: yearId } : {})), ...(type === 'enrolment_certificate' && yearId ? { academic_year_id: yearId } : {}) })); }
    catch (e) { setErr(msg(e)); } finally { setBusy(false); }
  };
  return (
    <Modal wide title={fr ? 'Émettre un document officiel' : 'Issue an official document'} onClose={onClose}>
      <div className="space-y-3">
        <Field label={fr ? 'Étudiant' : 'Student'}><input className={`${input} w-full`} placeholder={fr ? 'Nom ou matricule (2 lettres min.)' : 'Name or matricule (min. 2 letters)'} value={q} onChange={e => { setQ(e.target.value); setStudentId(''); }} /></Field>
        {students.data && students.data.length > 0 && !studentId && <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-40 overflow-y-auto">{students.data.slice(0, 20).map(s => <button key={s.id} className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50" onClick={() => { setStudentId(s.id); setQ(`${s.first_name} ${s.last_name}`); }}>{s.first_name} {s.last_name} <span className="text-xs text-slate-400 ml-1">{s.student_number}</span></button>)}</div>}
        <Field label="Type"><select className={`${input} w-full`} value={type} onChange={e => setType(e.target.value)}>{TYPES.map(t => <option key={t} value={t}>{docTitle(t, fr)}</option>)}</select></Field>
        {['statement_of_results', 'registration_summary'].includes(type) && <div className="grid sm:grid-cols-2 gap-3">
          <Field label={fr ? 'Semestre' : 'Semester'}><select className={`${input} w-full`} value={termId} onChange={e => setTermId(e.target.value)}><option value="">—</option>{terms.data?.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></Field>
          {type === 'statement_of_results' && <Field label={fr ? 'ou année académique' : 'or academic year'}><select className={`${input} w-full`} value={yearId} onChange={e => setYearId(e.target.value)}><option value="">—</option>{years.data?.map(y => <option key={y.id} value={y.id}>{y.label}</option>)}</select></Field>}
        </div>}
        <p className="text-xs text-slate-400">{fr ? 'Seuls les résultats publiés figurent sur les documents. Une fois émis, le contenu est figé.' : 'Only published results appear on documents. Once issued, the content is frozen.'}</p>
        <ErrorBox message={err} />
        <div className="flex justify-end gap-2"><button className={btnGhost} onClick={onClose}>{fr ? 'Annuler' : 'Cancel'}</button><button className={btnPrimary} disabled={!studentId || busy} onClick={go}>{fr ? 'Émettre' : 'Issue'}</button></div>
      </div>
    </Modal>
  );
}
