import { useState } from 'react';
import { Download, Mail, Pencil, Plus, Trash2, Users } from 'lucide-react';
import { careers, type Job } from '../../api/careers';
import JobFormModal from '../../composants/careers/JobFormModal';
import { AppStatusBadge, KindBadge } from '../../composants/careers/shared';
import { Badge, ErrorBox, Modal, PageHeader, Pager, Spinner, Stat, Table, Tabs, btnGhost, btnPrimary, fmtDate, input, msg, useDebounced, useFr, useLoad } from '../../composants/academics/ui';
import { useLanguage } from '../../i18n/LanguageContext';

type Tab = 'postings' | 'alumni' | 'stats';
const pct = (v: number | null) => (v === null ? '—' : `${Math.round(v * 100)}%`);

function Applicants({ job, onClose }: { job: Job; onClose: () => void }) {
  const fr = useFr(); const { lang } = useLanguage();
  const apps = useLoad(() => careers.applicants(job.id), [job.id]);
  const [err, setErr] = useState('');
  const decide = async (id: string, s: 'shortlisted' | 'rejected' | 'hired') => { setErr(''); try { await careers.decide(id, s); apps.reload(); } catch (e) { setErr(msg(e)); } };
  return (
    <Modal title={`${job.title} — ${fr ? 'candidats' : 'applicants'}`} onClose={onClose} wide>
      <ErrorBox message={err || apps.error} />
      {!apps.data ? <Spinner /> : (
        <Table min={560} head={[fr ? 'Étudiant' : 'Student', fr ? 'Filière' : 'Programme', fr ? 'Date' : 'Date', fr ? 'Statut' : 'Status', '']} empty={apps.data.length ? undefined : (fr ? 'Aucune candidature.' : 'No applications yet.')}>
          {apps.data.map(a => (
            <tr key={a.id} className="align-top">
              <td className="px-4 py-3"><p className="font-medium text-slate-800">{a.student_name}</p><p className="text-xs text-slate-500">{a.matricule}</p>{a.cover_note && <p className="mt-1 text-xs text-slate-600 whitespace-pre-line break-words max-w-xs">{a.cover_note}</p>}</td>
              <td className="px-4 py-3 text-slate-600">{a.programme ?? '—'}</td><td className="px-4 py-3 text-slate-500">{fmtDate(a.created_at, lang)}</td>
              <td className="px-4 py-3"><AppStatusBadge status={a.status} /></td>
              <td className="px-4 py-3">{a.status !== 'withdrawn' && (
                <div className="flex flex-wrap gap-1.5 justify-end">
                  <button className="text-xs text-blue-600 hover:underline" onClick={() => decide(a.id, 'shortlisted')}>{fr ? 'Présélectionner' : 'Shortlist'}</button>
                  <button className="text-xs text-emerald-600 hover:underline" onClick={() => decide(a.id, 'hired')}>{fr ? 'Accepter' : 'Hire'}</button>
                  <button className="text-xs text-red-600 hover:underline" onClick={() => decide(a.id, 'rejected')}>{fr ? 'Refuser' : 'Reject'}</button>
                </div>)}</td>
            </tr>
          ))}
        </Table>
      )}
    </Modal>
  );
}

function Postings() {
  const fr = useFr(); const { lang } = useLanguage();
  const [q, setQ] = useState(''); const [status, setStatus] = useState(''); const [page, setPage] = useState(1);
  const dq = useDebounced(q);
  const jobs = useLoad(() => careers.jobs({ q: dq, status, page, limit: 15 }), [dq, status, page]);
  const [edit, setEdit] = useState<Job | 'new' | null>(null); const [view, setView] = useState<Job | null>(null); const [err, setErr] = useState('');
  const act = async (fn: () => Promise<unknown>) => { setErr(''); try { await fn(); jobs.reload(); } catch (e) { setErr(msg(e)); } };
  const tone = (j: Job) => (j.status === 'open' && j.is_open ? 'green' : j.status === 'draft' ? 'amber' : 'slate');
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <input aria-label="Search" className={`${input} flex-1 min-w-48`} placeholder={fr ? 'Rechercher…' : 'Search…'} value={q} onChange={e => { setQ(e.target.value); setPage(1); }} />
        <select aria-label="Status" className={input} value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}>
          <option value="">{fr ? 'Tous statuts' : 'All statuses'}</option><option value="open">{fr ? 'Ouvertes' : 'Open'}</option><option value="draft">{fr ? 'Brouillons' : 'Drafts'}</option><option value="closed">{fr ? 'Clôturées' : 'Closed'}</option>
        </select>
        <button className={btnPrimary} onClick={() => setEdit('new')}><Plus size={14} /> {fr ? 'Nouvelle offre' : 'New posting'}</button>
      </div>
      <ErrorBox message={err || jobs.error} />
      {!jobs.data ? <Spinner /> : (
        <div className="bg-white rounded-xl border border-slate-200">
          <Table min={720} head={[fr ? 'Offre' : 'Posting', 'Type', fr ? 'Date limite' : 'Deadline', fr ? 'Statut' : 'Status', fr ? 'Candidats' : 'Applicants', '']} empty={jobs.data.items.length ? undefined : (fr ? 'Aucune offre.' : 'No postings.')}>
            {jobs.data.items.map(j => (
              <tr key={j.id}>
                <td className="px-4 py-3"><p className="font-medium text-slate-800 break-words">{j.title}</p><p className="text-xs text-slate-500">{j.company}{j.location ? ` · ${j.location}` : ''}</p></td>
                <td className="px-4 py-3"><KindBadge kind={j.kind} /></td><td className="px-4 py-3 text-slate-500">{fmtDate(j.deadline, lang)}</td>
                <td className="px-4 py-3"><Badge tone={tone(j)}>{j.status === 'open' && !j.is_open ? (fr ? 'Expirée' : 'Expired') : j.status === 'open' ? (fr ? 'Ouverte' : 'Open') : j.status === 'draft' ? (fr ? 'Brouillon' : 'Draft') : (fr ? 'Clôturée' : 'Closed')}</Badge></td>
                <td className="px-4 py-3"><button className="flex items-center gap-1 text-indigo-600 hover:underline" onClick={() => setView(j)}><Users size={14} /> {j.applicant_count ?? 0}</button></td>
                <td className="px-4 py-3"><div className="flex items-center justify-end gap-3">
                  <button aria-label="Edit" title={fr ? 'Modifier' : 'Edit'} className="text-slate-500 hover:text-indigo-600" onClick={() => setEdit(j)}><Pencil size={15} /></button>
                  {j.status === 'closed' ? <button className="text-xs text-emerald-600 hover:underline" onClick={() => act(() => careers.reopenJob(j.id))}>{fr ? 'Rouvrir' : 'Reopen'}</button> : <button className="text-xs text-amber-600 hover:underline" onClick={() => act(() => careers.closeJob(j.id))}>{fr ? 'Clôturer' : 'Close'}</button>}
                  <button aria-label="Delete" title={fr ? 'Supprimer' : 'Delete'} className="text-slate-400 hover:text-red-600" onClick={() => { if (confirm(fr ? 'Supprimer cette offre et ses candidatures ?' : 'Delete this posting and its applications?')) void act(() => careers.deleteJob(j.id)); }}><Trash2 size={15} /></button>
                </div></td>
              </tr>
            ))}
          </Table>
          <Pager page={page} limit={15} total={jobs.data.total} onPage={setPage} />
        </div>
      )}
      {edit && <JobFormModal job={edit === 'new' ? null : edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); jobs.reload(); }} />}
      {view && <Applicants job={view} onClose={() => { setView(null); jobs.reload(); }} />}
    </div>
  );
}

function Alumni() {
  const fr = useFr();
  const [f, setF] = useState({ q: '', year: '', pub: '' }); const [page, setPage] = useState(1);
  const dq = useDebounced(f.q);
  const reg = useLoad(() => careers.register({ q: dq, year: f.year, public: f.pub, page, limit: 20 }), [dq, f.year, f.pub, page]);
  const [msgOk, setMsgOk] = useState(''); const [err, setErr] = useState(''); const [busy, setBusy] = useState('');
  const run = async (key: string, fn: () => Promise<string | void>) => { setBusy(key); setErr(''); setMsgOk(''); try { const m = await fn(); if (m) setMsgOk(m); reg.reload(); } catch (e) { setErr(msg(e)); } finally { setBusy(''); } };
  const d = reg.data;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <input aria-label="Search" className={`${input} flex-1 min-w-48`} placeholder={fr ? 'Nom, employeur, ville…' : 'Name, employer, city…'} value={f.q} onChange={e => { setF({ ...f, q: e.target.value }); setPage(1); }} />
        <input aria-label="Year" className={`${input} w-28`} placeholder={fr ? 'Année' : 'Year'} inputMode="numeric" value={f.year} onChange={e => { setF({ ...f, year: e.target.value.replace(/\D/g, '') }); setPage(1); }} />
        <select aria-label="Visibility" className={input} value={f.pub} onChange={e => { setF({ ...f, pub: e.target.value }); setPage(1); }}>
          <option value="">{fr ? 'Tous' : 'All'}</option><option value="true">{fr ? 'Publics' : 'Public'}</option><option value="false">{fr ? 'Privés' : 'Private'}</option>
        </select>
        <button className={btnGhost} disabled={!!busy} onClick={() => run('csv', async () => { await careers.exportCsv({ q: dq, year: f.year }); })}><Download size={14} /> CSV</button>
        <button className={btnGhost} disabled={!!busy} onClick={() => run('inv', async () => { const r = await careers.invite(); return fr ? `${r.notified} invitation(s) envoyée(s).` : `${r.notified} invitation(s) sent.`; })}><Mail size={14} /> {fr ? 'Inviter à compléter' : 'Invite to complete'}</button>
        <button className={btnGhost} disabled={!!busy} onClick={() => run('bulk', async () => { const r = await careers.bulkCreate(); return fr ? `${r.created} fiche(s) créée(s).` : `${r.created} record(s) created.`; })}>{fr ? 'Créer les fiches des diplômés' : 'Create records for graduates'}</button>
      </div>
      <ErrorBox message={err || reg.error} />
      {msgOk && <p role="status" className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">{msgOk}</p>}
      {d && d.graduated_without_profile > 0 && <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">{fr ? `${d.graduated_without_profile} diplômé(s) n’ont pas encore de fiche.` : `${d.graduated_without_profile} graduate(s) have no alumni record yet.`}</p>}
      {!d ? <Spinner /> : (
        <div className="bg-white rounded-xl border border-slate-200">
          <Table min={760} head={[fr ? 'Ancien' : 'Alumnus', fr ? 'Filière / année' : 'Programme / year', fr ? 'Poste' : 'Position', fr ? 'Ville' : 'City', fr ? 'Annuaire' : 'Directory']} empty={d.items.length ? undefined : (fr ? 'Aucune fiche.' : 'No records.')}>
            {d.items.map(a => (
              <tr key={a.student_id}>
                <td className="px-4 py-3"><p className="font-medium text-slate-800">{a.name}</p><p className="text-xs text-slate-500">{a.matricule}</p></td>
                <td className="px-4 py-3 text-slate-600">{[a.programme_name, a.graduation_year].filter(Boolean).join(' · ') || '—'}</td>
                <td className="px-4 py-3 text-slate-600">{[a.position, a.employer].filter(Boolean).join(' @ ') || '—'}</td>
                <td className="px-4 py-3 text-slate-600">{a.city ?? '—'}</td>
                <td className="px-4 py-3"><Badge tone={a.is_public ? 'green' : 'slate'}>{a.is_public ? (fr ? 'Public' : 'Public') : (fr ? 'Privé' : 'Private')}</Badge></td>
              </tr>
            ))}
          </Table>
          <Pager page={page} limit={20} total={d.total} onPage={setPage} />
        </div>
      )}
    </div>
  );
}

function Stats() {
  const fr = useFr();
  const s = useLoad(() => careers.stats(), []);
  if (!s.data) return s.error ? <ErrorBox message={s.error} /> : <Spinner />;
  const d = s.data;
  const bar = (v: number, max: number) => <div className="h-2 rounded-full bg-slate-100 flex-1"><div className="h-2 rounded-full bg-indigo-500" style={{ width: `${max ? Math.round((v / max) * 100) : 0}%` }} /></div>;
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label={fr ? 'Diplômés' : 'Graduates'} value={String(d.graduated)} sub={`${d.profiles} ${fr ? 'fiches' : 'records'}`} />
        <Stat label={fr ? 'Taux de réponse' : 'Response rate'} value={pct(d.response_rate)} sub={`${d.responded} / ${d.alumni_base}`} />
        <Stat label={fr ? 'En emploi' : 'Employed'} value={pct(d.employed_share)} sub={`${d.employed} / ${d.responded}`} tone="good" />
        <Stat label={fr ? 'Profils publics' : 'Public profiles'} value={String(d.public_profiles)} />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        {([[fr ? 'Par filière' : 'By programme', d.by_programme.map(x => ({ k: x.name, total: x.total, employed: x.employed }))], [fr ? 'Par promotion' : 'By year', d.by_year.map(x => ({ k: String(x.year), total: x.total, employed: x.employed }))]] as const).map(([title, rows]) => (
          <section key={title} className="bg-white rounded-xl border border-slate-200 p-4 space-y-2">
            <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
            {rows.length === 0 && <p className="text-sm text-slate-400">—</p>}
            {rows.map(r => <div key={r.k} className="flex items-center gap-2 text-sm"><span className="w-28 truncate text-slate-600" title={r.k}>{r.k}</span>{bar(r.employed, Math.max(...rows.map(x => x.total)))}<span className="text-xs text-slate-500 w-14 text-right">{r.employed}/{r.total}</span></div>)}
          </section>
        ))}
        <section className="bg-white rounded-xl border border-slate-200 p-4 space-y-2">
          <h3 className="text-sm font-semibold text-slate-700">{fr ? 'Principaux employeurs' : 'Top employers'}</h3>
          {d.top_employers.length === 0 && <p className="text-sm text-slate-400">—</p>}
          {d.top_employers.map(e => <div key={e.name} className="flex items-center gap-2 text-sm"><span className="flex-1 truncate text-slate-600" title={e.name}>{e.name}</span><Badge tone="indigo">{e.count}</Badge></div>)}
        </section>
      </div>
      <p className="text-xs text-slate-400">{fr ? 'Les statistiques reposent sur les fiches renseignées par les anciens ; « en emploi » = employeur renseigné.' : 'Figures are based on self-reported alumni records; "employed" means an employer was entered.'}</p>
    </div>
  );
}

export default function CareersAdmin() {
  const fr = useFr(); const [tab, setTab] = useState<Tab>('postings');
  return (
    <div className="space-y-5">
      <PageHeader title={fr ? 'Carrières & anciens' : 'Careers & alumni'} subtitle={fr ? 'Offres, candidatures, registre des anciens et suivi d’insertion.' : 'Postings, applications, alumni register and graduate tracing.'} />
      <Tabs<Tab> value={tab} onChange={setTab} tabs={[{ id: 'postings', label: fr ? 'Offres & candidats' : 'Postings & applicants' }, { id: 'alumni', label: fr ? 'Registre des anciens' : 'Alumni register' }, { id: 'stats', label: fr ? 'Statistiques' : 'Statistics' }]} />
      {tab === 'postings' && <Postings />}
      {tab === 'alumni' && <Alumni />}
      {tab === 'stats' && <Stats />}
    </div>
  );
}
