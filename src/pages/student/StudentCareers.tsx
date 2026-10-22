import { useState } from 'react';
import { Building2, CalendarClock, ExternalLink, Mail, MapPin } from 'lucide-react';
import { careers, type Job } from '../../api/careers';
import { AlumniDirectory, AppStatusBadge, KindBadge, ProfileForm, kindLabel, safeHref } from '../../composants/careers/shared';
import { ErrorBox, Field, Modal, PageHeader, Pager, Spinner, Table, Tabs, btnGhost, btnPrimary, fmtDate, input, msg, useDebounced, useFr, useLoad } from '../../composants/academics/ui';
import { useLanguage } from '../../i18n/LanguageContext';

type Tab = 'jobs' | 'applications' | 'profile' | 'directory';

function Jobs({ onApplied }: { onApplied: () => void }) {
  const fr = useFr(); const { lang } = useLanguage();
  const [q, setQ] = useState(''); const [kind, setKind] = useState(''); const [page, setPage] = useState(1);
  const dq = useDebounced(q);
  const jobs = useLoad(() => careers.jobs({ q: dq, kind, page, limit: 10 }), [dq, kind, page]);
  const [sel, setSel] = useState<Job | null>(null); const [note, setNote] = useState(''); const [busy, setBusy] = useState(false); const [err, setErr] = useState(''); const [ok, setOk] = useState('');
  const apply = async () => {
    if (!sel) return;
    setBusy(true); setErr('');
    try { await careers.apply(sel.id, note); setOk(fr ? 'Candidature envoyée.' : 'Application sent.'); setSel(null); setNote(''); jobs.reload(); onApplied(); }
    catch (e) { setErr(msg(e)); } finally { setBusy(false); }
  };
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <input aria-label="Search" className={`${input} flex-1 min-w-[12rem]`} placeholder={fr ? 'Rechercher une offre, une entreprise…' : 'Search roles, companies…'} value={q} onChange={e => { setQ(e.target.value); setPage(1); }} />
        <select aria-label="Type" className={input} value={kind} onChange={e => { setKind(e.target.value); setPage(1); }}>
          <option value="">{fr ? 'Tous types' : 'All types'}</option>
          {(['job', 'internship', 'volunteering'] as const).map(k => <option key={k} value={k}>{kindLabel(k, fr)}</option>)}
        </select>
      </div>
      <ErrorBox message={jobs.error} />
      {ok && <p role="status" className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">{ok}</p>}
      {!jobs.data ? <Spinner /> : jobs.data.items.length === 0 ? (
        <p className="bg-white rounded-xl border border-slate-200 px-4 py-10 text-center text-sm text-slate-400">{fr ? 'Aucune offre ouverte pour le moment.' : 'No open postings right now.'}</p>
      ) : (
        <div className="space-y-3">
          {jobs.data.items.map(j => (
            <article key={j.id} className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col sm:flex-row sm:items-start gap-3">
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold text-slate-800 break-words">{j.title}</h3><KindBadge kind={j.kind} /></div>
                <p className="text-sm text-slate-600 flex flex-wrap items-center gap-x-4 gap-y-1">
                  <span className="flex items-center gap-1"><Building2 size={14} className="text-slate-400" /> {j.company}</span>
                  {j.location && <span className="flex items-center gap-1"><MapPin size={14} className="text-slate-400" /> {j.location}</span>}
                  {j.deadline && <span className="flex items-center gap-1"><CalendarClock size={14} className="text-slate-400" /> {fr ? 'Avant le' : 'Deadline'} {fmtDate(j.deadline, lang)}</span>}
                </p>
                <p className="text-sm text-slate-500 whitespace-pre-line break-words line-clamp-3">{j.description}</p>
              </div>
              <div className="flex sm:flex-col items-center sm:items-end gap-2 shrink-0">
                {j.my_application && j.my_application !== 'withdrawn' ? <AppStatusBadge status={j.my_application} /> : <button className={btnPrimary} onClick={() => { setSel(j); setErr(''); setOk(''); }}>{fr ? 'Postuler' : 'Apply'}</button>}
                <button className={btnGhost} onClick={() => setSel(j)}>{fr ? 'Détails' : 'Details'}</button>
              </div>
            </article>
          ))}
          <Pager page={page} limit={10} total={jobs.data.total} onPage={setPage} />
        </div>
      )}
      {sel && (
        <Modal title={sel.title} onClose={() => setSel(null)} wide>
          <div className="space-y-3 text-sm">
            <p className="text-slate-600">{sel.company}{sel.location ? ` · ${sel.location}` : ''} · {kindLabel(sel.kind, fr)}</p>
            <p className="whitespace-pre-line break-words text-slate-700">{sel.description}</p>
            <div className="flex flex-wrap gap-4">
              {safeHref(sel.apply_url) && <a className="text-indigo-600 hover:underline flex items-center gap-1" href={safeHref(sel.apply_url)} target="_blank" rel="noopener noreferrer"><ExternalLink size={14} /> {fr ? 'Page de l’offre' : 'Posting page'}</a>}
              {sel.contact_email && <a className="text-indigo-600 hover:underline flex items-center gap-1 break-all" href={`mailto:${sel.contact_email}`}><Mail size={14} /> {sel.contact_email}</a>}
            </div>
            <ErrorBox message={err} />
            {sel.my_application && sel.my_application !== 'withdrawn' ? <p className="text-slate-500">{fr ? 'Vous avez déjà postulé.' : 'You have already applied.'}</p> : (
              <>
                <Field label={fr ? 'Lettre de motivation (facultatif)' : 'Cover note (optional)'} hint={`${note.length}/2000`}><textarea className={`${input} w-full`} rows={4} maxLength={2000} value={note} onChange={e => setNote(e.target.value)} /></Field>
                <div className="flex justify-end gap-2"><button className={btnGhost} onClick={() => setSel(null)}>{fr ? 'Fermer' : 'Close'}</button><button className={btnPrimary} disabled={busy} onClick={apply}>{busy ? '…' : fr ? 'Envoyer ma candidature' : 'Send application'}</button></div>
              </>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}

function Applications({ refreshKey }: { refreshKey: number }) {
  const fr = useFr(); const { lang } = useLanguage();
  const apps = useLoad(() => careers.myApplications(), [refreshKey]);
  const [err, setErr] = useState('');
  const withdraw = async (id: string) => { setErr(''); try { await careers.withdraw(id); apps.reload(); } catch (e) { setErr(msg(e)); } };
  if (!apps.data) return apps.error ? <ErrorBox message={apps.error} /> : <Spinner />;
  return (
    <div className="space-y-3">
      <ErrorBox message={err} />
      <Table head={[fr ? 'Offre' : 'Posting', fr ? 'Entreprise' : 'Company', 'Type', fr ? 'Envoyée le' : 'Sent', fr ? 'Statut' : 'Status', '']} empty={apps.data.length ? undefined : (fr ? 'Vous n’avez encore postulé à aucune offre.' : 'You have not applied to anything yet.')}>
        {apps.data.map(a => (
          <tr key={a.id}>
            <td className="px-4 py-3 font-medium text-slate-800 break-words">{a.job.title}</td><td className="px-4 py-3 text-slate-600">{a.job.company}</td>
            <td className="px-4 py-3"><KindBadge kind={a.job.kind} /></td><td className="px-4 py-3 text-slate-500">{fmtDate(a.created_at, lang)}</td>
            <td className="px-4 py-3"><AppStatusBadge status={a.status} /></td>
            <td className="px-4 py-3 text-right">{['submitted', 'shortlisted'].includes(a.status) && <button className="text-xs text-red-600 hover:underline" onClick={() => withdraw(a.id)}>{fr ? 'Retirer' : 'Withdraw'}</button>}</td>
          </tr>
        ))}
      </Table>
    </div>
  );
}

export default function StudentCareers() {
  const fr = useFr();
  const [tab, setTab] = useState<Tab>('jobs'); const [tick, setTick] = useState(0);
  return (
    <div className="space-y-5">
      <PageHeader title={fr ? 'Carrières & anciens' : 'Careers & alumni'} subtitle={fr ? 'Offres d’emploi, de stage, de bénévolat et réseau des anciens.' : 'Jobs, internships, volunteering and the alumni network.'} />
      <Tabs<Tab> value={tab} onChange={setTab} tabs={[
        { id: 'jobs', label: fr ? 'Offres' : 'Jobs' }, { id: 'applications', label: fr ? 'Mes candidatures' : 'My applications' },
        { id: 'profile', label: fr ? 'Mon profil ancien' : 'My alumni profile' }, { id: 'directory', label: fr ? 'Annuaire des anciens' : 'Alumni directory' },
      ]} />
      {tab === 'jobs' && <Jobs onApplied={() => setTick(t => t + 1)} />}
      {tab === 'applications' && <Applications refreshKey={tick} />}
      {tab === 'profile' && <ProfileForm />}
      {tab === 'directory' && <AlumniDirectory />}
    </div>
  );
}
