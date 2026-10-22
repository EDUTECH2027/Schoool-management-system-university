import { useState } from 'react';
import { careers, type Job, type JobInput, type JobKind } from '../../api/careers';
import { ErrorBox, Field, Modal, btnGhost, btnPrimary, input, msg, useFr } from '../academics/ui';
import { kindLabel } from './shared';

export default function JobFormModal({ job, onClose, onSaved }: { job: Job | null; onClose: () => void; onSaved: () => void }) {
  const fr = useFr();
  const [f, setF] = useState<JobInput>({
    title: job?.title ?? '', company: job?.company ?? '', kind: job?.kind ?? 'job', location: job?.location ?? '', description: job?.description ?? '',
    apply_url: job?.apply_url ?? '', contact_email: job?.contact_email ?? '', deadline: job?.deadline ?? '', status: job?.status ?? 'open',
  });
  const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  const set = <K extends keyof JobInput>(k: K, v: JobInput[K]) => setF(x => ({ ...x, [k]: v }));
  const save = async () => {
    setBusy(true); setErr('');
    try {
      const body = { ...f, deadline: f.deadline || null };
      if (job) await careers.updateJob(job.id, body); else await careers.createJob(body);
      onSaved();
    } catch (e) { setErr(msg(e)); } finally { setBusy(false); }
  };
  return (
    <Modal title={job ? (fr ? 'Modifier l’offre' : 'Edit posting') : (fr ? 'Nouvelle offre' : 'New posting')} onClose={onClose} wide>
      <div className="space-y-3">
        <ErrorBox message={err} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={fr ? 'Intitulé' : 'Title'}><input className={`${input} w-full`} maxLength={160} value={f.title} onChange={e => set('title', e.target.value)} /></Field>
          <Field label={fr ? 'Entreprise / organisation' : 'Company / organisation'}><input className={`${input} w-full`} maxLength={120} value={f.company} onChange={e => set('company', e.target.value)} /></Field>
          <Field label="Type"><select className={`${input} w-full`} value={f.kind} onChange={e => set('kind', e.target.value as JobKind)}>{(['job', 'internship', 'volunteering'] as const).map(k => <option key={k} value={k}>{kindLabel(k, fr)}</option>)}</select></Field>
          <Field label={fr ? 'Lieu' : 'Location'}><input className={`${input} w-full`} maxLength={120} value={f.location} onChange={e => set('location', e.target.value)} /></Field>
          <Field label={fr ? 'Lien de candidature (https://…)' : 'Apply link (https://…)'}><input className={`${input} w-full`} type="url" value={f.apply_url} onChange={e => set('apply_url', e.target.value)} /></Field>
          <Field label={fr ? 'E-mail de contact' : 'Contact e-mail'}><input className={`${input} w-full`} type="email" value={f.contact_email} onChange={e => set('contact_email', e.target.value)} /></Field>
          <Field label={fr ? 'Date limite' : 'Deadline'}><input className={`${input} w-full`} type="date" value={f.deadline ?? ''} onChange={e => set('deadline', e.target.value)} /></Field>
          <Field label={fr ? 'Statut' : 'Status'}>
            <select className={`${input} w-full`} value={f.status} onChange={e => set('status', e.target.value as JobInput['status'])}>
              <option value="open">{fr ? 'Ouverte' : 'Open'}</option><option value="draft">{fr ? 'Brouillon' : 'Draft'}</option><option value="closed">{fr ? 'Clôturée' : 'Closed'}</option>
            </select>
          </Field>
        </div>
        <Field label="Description" hint={`${f.description.length}/5000`}><textarea className={`${input} w-full`} rows={6} maxLength={5000} value={f.description} onChange={e => set('description', e.target.value)} /></Field>
        <div className="flex justify-end gap-2"><button className={btnGhost} onClick={onClose}>{fr ? 'Annuler' : 'Cancel'}</button><button className={btnPrimary} disabled={busy} onClick={save}>{busy ? '…' : fr ? 'Enregistrer' : 'Save'}</button></div>
      </div>
    </Modal>
  );
}
