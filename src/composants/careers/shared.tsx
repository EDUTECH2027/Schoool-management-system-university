import { useState } from 'react';
import { Building2, Globe, Mail, MapPin } from 'lucide-react';
import { careers, type AlumniFilter, type AlumniProfile, type JobKind } from '../../api/careers';
import { Badge, ErrorBox, Field, Pager, Spinner, btnPrimary, input, msg, useDebounced, useFr, useLoad } from '../academics/ui';

export const KIND_LABEL: Record<JobKind, [string, string]> = { job: ['Job', 'Emploi'], internship: ['Internship', 'Stage'], volunteering: ['Volunteering', 'Bénévolat'] };
export const kindLabel = (k: JobKind, fr: boolean) => KIND_LABEL[k][fr ? 1 : 0];
const KIND_TONE: Record<JobKind, 'indigo' | 'blue' | 'green'> = { job: 'indigo', internship: 'blue', volunteering: 'green' };
export const KindBadge = ({ kind }: { kind: JobKind }) => <Badge tone={KIND_TONE[kind]}>{kindLabel(kind, useFr())}</Badge>;

const APP: Record<string, [string, string, 'amber' | 'blue' | 'red' | 'green' | 'slate']> = {
  submitted: ['Submitted', 'Envoyée', 'amber'], shortlisted: ['Shortlisted', 'Présélectionnée', 'blue'], rejected: ['Not retained', 'Non retenue', 'red'], hired: ['Hired', 'Acceptée', 'green'], withdrawn: ['Withdrawn', 'Retirée', 'slate'],
};
export function AppStatusBadge({ status }: { status: string }) {
  const fr = useFr(); const [en, f, tone] = APP[status] ?? [status, status, 'slate' as const];
  return <Badge tone={tone}>{fr ? f : en}</Badge>;
}

/** Free text is rendered through React (escaped); only http(s) links are made clickable. */
export const safeHref = (u?: string | null) => (u && /^https?:\/\//i.test(u) ? u : undefined);

export function AlumniDirectory() {
  const fr = useFr();
  const [f, setF] = useState<AlumniFilter>({ q: '', programme_name: '', year: '', employer: '', city: '' });
  const [page, setPage] = useState(1);
  const dq = useDebounced(f.q ?? ''), de = useDebounced(f.employer ?? ''), dc = useDebounced(f.city ?? '');
  const opts = useLoad(() => careers.directoryFilters(), []);
  const d = useLoad(() => careers.directory({ q: dq, employer: de, city: dc, programme_name: f.programme_name, year: f.year, page, limit: 12 }), [dq, de, dc, f.programme_name, f.year, page]);
  const set = (k: keyof AlumniFilter, v: string) => { setPage(1); setF(x => ({ ...x, [k]: v })); };
  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        <input aria-label="Search" className={input} placeholder={fr ? 'Rechercher (nom, poste…)' : 'Search (name, position…)'} value={f.q} onChange={e => set('q', e.target.value)} />
        <select aria-label="Programme" className={input} value={f.programme_name} onChange={e => set('programme_name', e.target.value)}>
          <option value="">{fr ? 'Toutes les filières' : 'All programmes'}</option>{(opts.data?.programmes ?? []).map(p => <option key={p}>{p}</option>)}
        </select>
        <select aria-label="Year" className={input} value={f.year} onChange={e => set('year', e.target.value)}>
          <option value="">{fr ? 'Toutes les promotions' : 'All years'}</option>{(opts.data?.years ?? []).map(y => <option key={y}>{y}</option>)}
        </select>
        <input aria-label="Employer" className={input} placeholder={fr ? 'Employeur' : 'Employer'} value={f.employer} onChange={e => set('employer', e.target.value)} />
        <input aria-label="City" className={input} placeholder={fr ? 'Ville' : 'City'} value={f.city} onChange={e => set('city', e.target.value)} />
      </div>
      <ErrorBox message={d.error} />
      {!d.data ? <Spinner /> : d.data.items.length === 0 ? (
        <p className="bg-white rounded-xl border border-slate-200 px-4 py-10 text-center text-sm text-slate-400">{fr ? 'Aucun ancien visible pour le moment (seuls ceux qui ont accepté d’apparaître sont listés).' : 'No alumni to show yet (only alumni who opted in are listed).'}</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {d.data.items.map(a => (
            <article key={a.id} className="bg-white rounded-xl border border-slate-200 p-4 space-y-1.5">
              <h3 className="font-semibold text-slate-800">{a.name}</h3>
              <p className="text-xs text-slate-500">{[a.programme_name, a.graduation_year].filter(Boolean).join(' · ')}</p>
              {(a.position || a.employer) && <p className="text-sm text-slate-700 flex items-start gap-1.5"><Building2 size={14} className="mt-0.5 shrink-0 text-slate-400" /> {[a.position, a.employer].filter(Boolean).join(' @ ')}</p>}
              {a.city && <p className="text-sm text-slate-500 flex items-center gap-1.5"><MapPin size={14} className="text-slate-400" /> {a.city}</p>}
              {a.bio && <p className="text-sm text-slate-600 whitespace-pre-line break-words line-clamp-4">{a.bio}</p>}
              <div className="flex flex-wrap gap-3 pt-1 text-xs">
                {safeHref(a.linkedin_url) && <a className="text-indigo-600 hover:underline flex items-center gap-1" href={safeHref(a.linkedin_url)} target="_blank" rel="noopener noreferrer"><Globe size={12} /> LinkedIn</a>}
                {a.contact_email && <a className="text-indigo-600 hover:underline flex items-center gap-1 break-all" href={`mailto:${a.contact_email}`}><Mail size={12} /> {a.contact_email}</a>}
              </div>
            </article>
          ))}
        </div>
      )}
      {d.data && <Pager page={page} limit={12} total={d.data.total} onPage={setPage} />}
    </div>
  );
}

export function ProfileForm() {
  const fr = useFr();
  const me = useLoad(() => careers.myProfile(), []);
  const [draft, setDraft] = useState<Partial<AlumniProfile> | null>(null);
  const [busy, setBusy] = useState(false); const [err, setErr] = useState(''); const [ok, setOk] = useState('');
  const p = { ...(me.data?.profile ?? {}), ...(draft ?? {}) } as AlumniProfile;
  const set = <K extends keyof AlumniProfile>(k: K, v: AlumniProfile[K]) => setDraft(x => ({ ...(x ?? {}), [k]: v }));
  const save = async () => {
    setBusy(true); setErr(''); setOk('');
    try {
      const { id: _id, ...body } = p; void _id;
      await careers.saveProfile({ ...body, graduation_year: body.graduation_year ? Number(body.graduation_year) : null });
      setOk(fr ? 'Profil enregistré.' : 'Profile saved.'); setDraft(null); me.reload();
    } catch (e) { setErr(msg(e)); } finally { setBusy(false); }
  };
  if (!me.data) return me.error ? <ErrorBox message={me.error} /> : <Spinner />;
  const txt = (k: 'programme_name' | 'employer' | 'position' | 'city' | 'linkedin_url' | 'contact_email', label: string, extra?: { type?: string; max?: number }) => (
    <Field label={label}><input className={`${input} w-full`} type={extra?.type ?? 'text'} maxLength={extra?.max ?? 160} value={p[k] ?? ''} onChange={e => set(k, e.target.value)} /></Field>
  );
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 space-y-4 max-w-3xl">
      {me.data.academic_status !== 'graduated' && <p className="text-sm text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">{fr ? 'Vous pouvez préparer votre profil dès maintenant ; il reste privé tant que vous ne l’avez pas rendu public.' : 'You can prepare your profile now; it stays private until you choose to make it public.'}</p>}
      <ErrorBox message={err} />
      {ok && <p role="status" className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">{ok}</p>}
      <div className="grid gap-3 sm:grid-cols-2">
        {txt('programme_name', fr ? 'Filière' : 'Programme')}
        <Field label={fr ? 'Année de diplôme' : 'Graduation year'}><input className={`${input} w-full`} type="number" min={1950} max={2100} value={p.graduation_year ?? ''} onChange={e => set('graduation_year', e.target.value === '' ? null : Number(e.target.value))} /></Field>
        {txt('employer', fr ? 'Employeur actuel' : 'Current employer')}
        {txt('position', fr ? 'Poste' : 'Position')}
        {txt('city', fr ? 'Ville' : 'City', { max: 100 })}
        {txt('contact_email', fr ? 'E-mail de contact (affiché)' : 'Contact e-mail (shown)', { type: 'email' })}
        <div className="sm:col-span-2">{txt('linkedin_url', 'LinkedIn (https://…)', { type: 'url', max: 500 })}</div>
        <div className="sm:col-span-2"><Field label={fr ? 'Présentation' : 'About you'} hint={`${(p.bio ?? '').length}/2000`}><textarea className={`${input} w-full`} rows={4} maxLength={2000} value={p.bio ?? ''} onChange={e => set('bio', e.target.value)} /></Field></div>
      </div>
      <label className="flex items-start gap-2 text-sm text-slate-700 cursor-pointer">
        <input type="checkbox" className="mt-1" checked={p.is_public} onChange={e => set('is_public', e.target.checked)} />
        <span><b>{fr ? 'Apparaître dans l’annuaire des anciens' : 'Show me in the alumni directory'}</b><br /><span className="text-xs text-slate-500">{fr ? 'Votre nom et les informations ci-dessus seront visibles des étudiants, enseignants et du personnel. Jamais votre matricule ni votre téléphone. Désactivable à tout moment.' : 'Your name and the details above become visible to students, lecturers and staff. Never your student number or phone. You can switch this off at any time.'}</span></span>
      </label>
      <div><button className={btnPrimary} disabled={busy} onClick={save}>{busy ? '…' : fr ? 'Enregistrer' : 'Save profile'}</button></div>
    </div>
  );
}
