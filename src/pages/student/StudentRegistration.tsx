import { useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock, Printer, X } from 'lucide-react';
import { acad, type StudentOffering } from '../../api/academics';
import { Badge, ErrorBox, Field, Modal, PageHeader, Spinner, StatusBadge, btnGhost, btnPrimary, dayLabel, fmtDateTime, input, msg, useLoad } from '../../composants/academics/ui';
import { PrintOverlay } from '../../composants/academics/DocumentSheet';
import { useLanguage } from '../../i18n/LanguageContext';

export default function StudentRegistration() {
  const { lang } = useLanguage(); const fr = lang === 'fr';
  const [termId, setTermId] = useState('');
  const ov = useLoad(() => acad.myRegistration(termId || undefined), [termId]);
  const [err, setErr] = useState(''); const [ok, setOk] = useState('');
  const [exc, setExc] = useState<StudentOffering | null>(null); const [reason, setReason] = useState('');
  const [busy, setBusy] = useState('');
  const [q, setQ] = useState('');
  const [print, setPrint] = useState(false);

  const enroll = async (o: StudentOffering, why?: string) => {
    setBusy(o.id); setErr(''); setOk('');
    try {
      const r = await acad.enroll(o.id, why);
      setOk(r.pending_approval ? (fr ? 'Demande de dérogation envoyée : en attente de validation.' : 'Exception request sent — awaiting approval.') : (fr ? 'Inscription confirmée.' : 'Registration confirmed.'));
      setExc(null); setReason(''); void ov.reload();
    } catch (e) { setErr(msg(e)); setExc(null); void ov.reload(); } finally { setBusy(''); }
  };
  const drop = async (id: string) => {
    setBusy(id); setErr(''); setOk('');
    try { await acad.drop(id); setOk(fr ? 'Cours retiré.' : 'Course dropped.'); void ov.reload(); } catch (e) { setErr(msg(e)); } finally { setBusy(''); }
  };

  const d = ov.data;
  const offerings = (d?.offerings ?? []).filter(o => !q || `${o.course} ${o.code}`.toLowerCase().includes(q.toLowerCase()));
  const registered = (d?.registered ?? []).filter(r => r.status !== 'rejected');
  return (
    <div className="space-y-5">
      <PageHeader title={fr ? 'Inscription aux cours' : 'Course registration'} subtitle={d?.student ? `${d.student.programme ?? ''} ${d.student.level ? `· ${d.student.level}` : ''}` : undefined}>
        {d && d.terms.length > 1 && <select aria-label="Semester" className={input} value={d.term?.id ?? ''} onChange={e => setTermId(e.target.value)}>{d.terms.map(t => <option key={t.id} value={t.id}>{t.academic_year} · {t.name}</option>)}</select>}
        {registered.length > 0 && <button className={btnGhost} onClick={() => setPrint(true)}><Printer size={14} /> {fr ? 'Récapitulatif' : 'Summary'}</button>}
      </PageHeader>
      <ErrorBox message={err || ov.error} />
      {ok && <p role="status" className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">{ok}</p>}
      {!d ? <Spinner /> : (
        <>
          <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap gap-x-8 gap-y-2 items-center">
            {d.period ? (
              <>
                <div><p className="text-xs text-slate-500">{fr ? 'Période d’inscription' : 'Registration period'}</p>
                  <p className="text-sm font-medium">{d.period.is_open
                    ? <span className="text-emerald-600">{fr ? 'Ouverte jusqu’au' : 'Open until'} {fmtDateTime(d.period.closes_at, lang)}</span>
                    : <span className="text-red-600">{new Date() < new Date(d.period.opens_at) ? `${fr ? 'Ouvre le' : 'Opens'} ${fmtDateTime(d.period.opens_at, lang)}` : (fr ? 'Fermée' : 'Closed')}</span>}</p></div>
                <div><p className="text-xs text-slate-500">{fr ? 'Crédits' : 'Credits'}</p>
                  <p className="text-sm font-medium">{d.credits.registered}{d.credits.pending > 0 && <span className="text-amber-600"> (+{d.credits.pending} {fr ? 'en attente' : 'pending'})</span>} / {d.credits.max}</p></div>
                {d.credits.below_minimum && <p className="text-xs text-amber-700 flex items-center gap-1"><AlertTriangle size={14} /> {fr ? `Minimum requis : ${d.credits.min} crédits` : `Minimum required: ${d.credits.min} credits`}</p>}
              </>
            ) : <p className="text-sm text-slate-500">{fr ? 'Aucune période d’inscription n’est définie pour votre filière ce semestre.' : 'No registration period is set for your programme this semester.'}</p>}
          </div>

          <section>
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-2">{fr ? 'Mes cours' : 'My courses'} ({registered.length})</h2>
            {registered.length ? (
              <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
                {registered.map(r => (
                  <div key={r.id} className="p-3 flex flex-wrap items-center gap-3">
                    <div className="mr-auto min-w-0">
                      <p className="font-medium text-slate-800">{r.course} <span className="text-xs text-slate-400 font-mono">{r.code} · {r.section}</span></p>
                      <p className="text-xs text-slate-500">{r.lecturer ?? '—'} · {r.credits} cr{r.slots.length ? ` · ${r.slots.map(s => `${dayLabel(s.day, fr).slice(0, 3)} ${s.period}`).join(', ')}` : ''}</p>
                      {r.exception_reason && r.status === 'pending_approval' && <p className="text-xs text-amber-700">{fr ? 'Motif :' : 'Reason:'} {r.exception_reason}</p>}
                    </div>
                    {r.kind !== 'regular' && <Badge tone="amber">{r.kind}</Badge>}<StatusBadge status={r.status} />
                    {d.period?.can_drop && <button aria-label={`Drop ${r.course}`} className="p-1.5 text-slate-400 hover:text-red-600 disabled:opacity-40" disabled={busy === r.id} onClick={() => drop(r.id)}><X size={16} /></button>}
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-slate-400 bg-white rounded-xl border border-slate-200 p-6 text-center">{fr ? 'Vous n’êtes inscrit à aucun cours.' : 'You are not registered for any course yet.'}</p>}
          </section>

          <section>
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mr-auto">{fr ? 'Cours proposés' : 'Available courses'}</h2>
              <input aria-label="Search courses" className={`${input} w-56`} placeholder={fr ? 'Rechercher…' : 'Search…'} value={q} onChange={e => setQ(e.target.value)} />
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              {offerings.map(o => {
                const mine = o.registration && o.registration !== 'rejected';
                const reasons = [...o.blockers, ...o.approvals];
                return (
                  <article key={o.id} className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col gap-2">
                    <div className="flex items-start gap-2">
                      <div className="mr-auto min-w-0"><h3 className="font-semibold text-slate-800">{o.course}</h3><p className="text-xs text-slate-400 font-mono">{o.code} · {fr ? 'Section' : 'Section'} {o.section} · {o.credits} cr</p></div>
                      {!o.in_curriculum && <Badge tone="amber">{fr ? 'hors cursus' : 'off-curriculum'}</Badge>}
                    </div>
                    {o.description && <p className="text-xs text-slate-500 line-clamp-2">{o.description}</p>}
                    <p className="text-xs text-slate-500">{o.lecturer ?? '—'}{o.slots.length ? ` · ${o.slots.map(s => `${dayLabel(s.day, fr).slice(0, 3)} ${s.period}`).join(', ')}` : ''}{o.capacity != null && ` · ${o.seats_taken}/${o.capacity} ${fr ? 'places' : 'seats'}`}</p>
                    {o.prerequisites.length > 0 && <p className="text-xs flex flex-wrap items-center gap-1 text-slate-500">{fr ? 'Prérequis :' : 'Prerequisites:'} {o.prerequisites.map(p => <Badge key={p.id} tone={p.passed ? 'green' : 'red'}>{p.code}{p.passed ? ' ✓' : ''}</Badge>)}</p>}
                    {!mine && reasons.length > 0 && <ul className="text-xs text-amber-700 space-y-0.5">{reasons.map((r, i) => <li key={i} className="flex gap-1"><AlertTriangle size={12} className="mt-0.5 shrink-0" />{r.message}</li>)}</ul>}
                    <div className="mt-auto pt-1">
                      {mine ? (
                        <span className="text-xs text-emerald-600 flex items-center gap-1">{o.registration === 'pending_approval' ? <><Clock size={13} /> {fr ? 'Demande en attente' : 'Request pending'}</> : <><CheckCircle2 size={13} /> {fr ? 'Inscrit' : 'Registered'}</>}</span>
                      ) : o.can_register ? (
                        <button className={btnPrimary} disabled={busy === o.id} onClick={() => enroll(o)}>{fr ? 'S’inscrire' : 'Register'}</button>
                      ) : o.needs_approval ? (
                        <button className={btnGhost} onClick={() => { setReason(''); setExc(o); }}>{fr ? 'Demander une dérogation' : 'Request an exception'}</button>
                      ) : <button className={btnGhost} disabled>{fr ? 'Indisponible' : 'Unavailable'}</button>}
                    </div>
                  </article>
                );
              })}
              {!offerings.length && <p className="col-span-full text-sm text-slate-400 text-center py-8">{fr ? 'Aucun cours ouvert pour ce semestre.' : 'No courses are open this semester.'}</p>}
            </div>
          </section>
        </>
      )}
      {exc && (
        <Modal title={`${fr ? 'Dérogation' : 'Exception request'} · ${exc.course}`} onClose={() => setExc(null)}>
          <ul className="text-sm text-amber-700 mb-3 space-y-1">{exc.approvals.map((a, i) => <li key={i}>• {a.message}</li>)}</ul>
          <Field label={fr ? 'Pourquoi demandez-vous une exception ?' : 'Why are you requesting an exception?'}><textarea rows={3} className={`${input} w-full`} value={reason} onChange={e => setReason(e.target.value)} /></Field>
          <div className="flex justify-end gap-2 pt-4"><button className={btnGhost} onClick={() => setExc(null)}>{fr ? 'Annuler' : 'Cancel'}</button><button className={btnPrimary} disabled={!reason.trim() || busy === exc.id} onClick={() => enroll(exc, reason)}>{fr ? 'Envoyer la demande' : 'Send request'}</button></div>
        </Modal>
      )}
      {print && d && <SummarySheet termId={d.term?.id} onClose={() => setPrint(false)} />}
    </div>
  );
}

function SummarySheet({ termId, onClose }: { termId?: string; onClose: () => void }) {
  const { lang } = useLanguage(); const fr = lang === 'fr';
  const s = useLoad(() => acad.mySummary(termId), [termId]);
  return (
    <PrintOverlay label={fr ? 'Récapitulatif d’inscription' : 'Registration summary'} onClose={onClose}>
      {!s.data ? <Spinner /> : (
        <div>
          <h3 className="font-bold text-slate-800 text-lg">{s.data.school.name}</h3>
          <h4 className="font-semibold mb-1">{fr ? 'Récapitulatif d’inscription' : 'Registration summary'}</h4>
          <p className="text-sm text-slate-600 mb-3">{s.data.student.name} · {s.data.student.matricule} · {s.data.student.programme ?? '—'} · {s.data.term.academic_year} {s.data.term.name}</p>
          <table className="w-full text-sm"><thead><tr className="text-left text-slate-500"><th>Code</th><th>{fr ? 'Cours' : 'Course'}</th><th>{fr ? 'Enseignant' : 'Lecturer'}</th><th>Cr.</th></tr></thead>
            <tbody>{s.data.courses.map(c => <tr key={c.id} className="border-t border-slate-200"><td className="py-1 font-mono text-xs">{c.code}</td><td>{c.course}</td><td>{c.lecturer ?? '—'}</td><td>{c.credits}</td></tr>)}</tbody></table>
          <p className="text-sm font-semibold mt-3">{fr ? 'Total crédits' : 'Total credits'}: {s.data.credits.registered}</p>
          <p className="text-xs text-slate-400 mt-1">{fr ? 'Copie non officielle — générée le' : 'Unofficial copy — generated'} {fmtDateTime(s.data.generated_at, lang)}</p>
        </div>
      )}
    </PrintOverlay>
  );
}
