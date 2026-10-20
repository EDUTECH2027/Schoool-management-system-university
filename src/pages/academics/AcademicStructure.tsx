import { useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { acad, type Faculty, type Department, type Programme } from '../../api/academics';
import { Badge, ErrorBox, Field, Modal, PageHeader, Spinner, Table, Tabs, btnDanger, btnGhost, btnPrimary, input, msg, useFr, useLoad } from '../../composants/academics/ui';
import ConfirmDialog from '../../composants/ui/ConfirmDialog';

type Tab = 'faculties' | 'departments' | 'programmes' | 'cohorts';
type Editing = { kind: 'faculty'; row?: Faculty } | { kind: 'department'; row?: Department } | { kind: 'programme'; row?: Programme } | null;

export default function AcademicStructure() {
  const fr = useFr();
  const [tab, setTab] = useState<Tab>('faculties');
  const [edit, setEdit] = useState<Editing>(null);
  const [del, setDel] = useState<{ kind: Tab; id: string; name: string } | null>(null);
  const [err, setErr] = useState('');
  const fac = useLoad(acad.faculties), dep = useLoad(acad.departments), prg = useLoad(acad.programmes), coh = useLoad(acad.cohorts);
  const reloadAll = () => { void fac.reload(); void dep.reload(); void prg.reload(); void coh.reload(); };

  const remove = async () => {
    if (!del) return;
    try {
      if (del.kind === 'faculties') await acad.delFaculty(del.id); else if (del.kind === 'departments') await acad.delDepartment(del.id); else await acad.delProgramme(del.id);
      setDel(null); setErr(''); reloadAll();
    } catch (e) { setErr(msg(e)); setDel(null); }
  };
  const newKind = tab === 'faculties' ? 'faculty' : tab === 'departments' ? 'department' : 'programme';

  return (
    <div className="space-y-5">
      <PageHeader title={fr ? 'Structure académique' : 'Academic structure'} subtitle={fr ? 'Facultés, départements, filières et promotions' : 'Faculties, departments, programmes and cohorts'} onRefresh={reloadAll}>
        {tab !== 'cohorts' && <button className={btnPrimary} onClick={() => setEdit({ kind: newKind } as Editing)}><Plus size={14} /> {fr ? 'Ajouter' : 'Add'}</button>}
      </PageHeader>
      <ErrorBox message={err || fac.error || dep.error || prg.error || coh.error} />
      <Tabs value={tab} onChange={setTab} tabs={[
        { id: 'faculties', label: fr ? 'Facultés' : 'Faculties' }, { id: 'departments', label: fr ? 'Départements' : 'Departments' },
        { id: 'programmes', label: fr ? 'Filières' : 'Programmes' }, { id: 'cohorts', label: fr ? 'Promotions (classes)' : 'Cohorts (classes)' },
      ]} />

      {tab === 'faculties' && (fac.data ? (
        <Table head={[fr ? 'Code' : 'Code', fr ? 'Nom' : 'Name', fr ? 'Départements' : 'Departments', '']} empty={fac.data.length ? undefined : (fr ? 'Aucune faculté' : 'No faculties yet')}>
          {fac.data.map(f => (
            <tr key={f.id}><td className="px-4 py-3 font-mono text-xs">{f.code}</td><td className="px-4 py-3 font-medium text-slate-800">{f.name}</td><td className="px-4 py-3">{f.department_count}</td>
              <td className="px-4 py-3"><Actions onEdit={() => setEdit({ kind: 'faculty', row: f })} onDelete={() => setDel({ kind: 'faculties', id: f.id, name: f.name })} /></td></tr>
          ))}
        </Table>) : <Spinner />)}

      {tab === 'departments' && (dep.data ? (
        <Table head={[fr ? 'Code' : 'Code', fr ? 'Nom' : 'Name', fr ? 'Faculté' : 'Faculty', fr ? 'Filières' : 'Programmes', fr ? 'Cours' : 'Courses', '']} empty={dep.data.length ? undefined : (fr ? 'Aucun département' : 'No departments yet')}>
          {dep.data.map(d => (
            <tr key={d.id}><td className="px-4 py-3 font-mono text-xs">{d.code}</td><td className="px-4 py-3 font-medium text-slate-800">{d.name}</td><td className="px-4 py-3 text-slate-600">{d.faculty_name}</td><td className="px-4 py-3">{d.programme_count}</td><td className="px-4 py-3">{d.course_count}</td>
              <td className="px-4 py-3"><Actions onEdit={() => setEdit({ kind: 'department', row: d })} onDelete={() => setDel({ kind: 'departments', id: d.id, name: d.name })} /></td></tr>
          ))}
        </Table>) : <Spinner />)}

      {tab === 'programmes' && (prg.data ? (
        <Table min={820} head={[fr ? 'Code' : 'Code', fr ? 'Filière' : 'Programme', fr ? 'Département' : 'Department', fr ? 'Durée' : 'Duration', 'Crédits', fr ? 'Promotions' : 'Cohorts', '']} empty={prg.data.length ? undefined : (fr ? 'Aucune filière' : 'No programmes yet')}>
          {prg.data.map(p => (
            <tr key={p.id}><td className="px-4 py-3 font-mono text-xs">{p.code}</td>
              <td className="px-4 py-3"><p className="font-medium text-slate-800">{p.name}</p>{p.award && <p className="text-xs text-slate-400">{p.award}</p>}</td>
              <td className="px-4 py-3 text-slate-600">{p.department_name}<p className="text-xs text-slate-400">{p.faculty_name}</p></td>
              <td className="px-4 py-3">{p.duration_years} {fr ? 'ans' : 'yrs'}</td><td className="px-4 py-3">{p.credits_required ?? '—'}</td><td className="px-4 py-3">{p.class_count} {!p.is_active && <Badge tone="slate">{fr ? 'inactive' : 'inactive'}</Badge>}</td>
              <td className="px-4 py-3"><Actions onEdit={() => setEdit({ kind: 'programme', row: p })} onDelete={() => setDel({ kind: 'programmes', id: p.id, name: p.name })} /></td></tr>
          ))}
        </Table>) : <Spinner />)}

      {tab === 'cohorts' && (coh.data && prg.data ? (
        <>
          <p className="text-sm text-slate-500">{fr ? 'Chaque classe est une promotion rattachée à une filière : c’est elle qui détermine le cursus et les règles d’inscription.' : 'Each class is a cohort attached to a programme — the programme decides the curriculum and registration rules.'}</p>
          <Table head={[fr ? 'Classe' : 'Class', fr ? 'Niveau' : 'Level', fr ? 'Étudiants' : 'Students', fr ? 'Filière' : 'Programme']}>
            {coh.data.map(c => (
              <tr key={c.id}><td className="px-4 py-3 font-medium text-slate-800">{c.name}</td><td className="px-4 py-3 text-slate-600">{c.level ?? '—'}</td><td className="px-4 py-3">{c.enrolled}</td>
                <td className="px-4 py-3">
                  <select aria-label={`Programme of ${c.name}`} className={`${input} w-full max-w-xs`} value={c.programme_id ?? ''} onChange={async e => { try { await acad.setCohortProgramme(c.id, e.target.value || null); setErr(''); void coh.reload(); } catch (x) { setErr(msg(x)); } }}>
                    <option value="">{fr ? '— aucune —' : '— none —'}</option>
                    {prg.data!.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </td></tr>
            ))}
          </Table>
        </>) : <Spinner />)}

      {edit && <EditModal edit={edit} faculties={fac.data ?? []} departments={dep.data ?? []} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); reloadAll(); }} />}
      {del && <ConfirmDialog title={fr ? 'Supprimer ?' : 'Delete?'} message={fr ? `Supprimer « ${del.name} » ?` : `Delete “${del.name}”?`} confirmLabel={fr ? 'Supprimer' : 'Delete'} onConfirm={remove} onCancel={() => setDel(null)} />}
    </div>
  );
}

function Actions({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return <div className="flex gap-1 justify-end"><button aria-label="Edit" className="p-1.5 text-slate-500 hover:text-indigo-600" onClick={onEdit}><Pencil size={15} /></button><button aria-label="Delete" className="p-1.5 text-slate-500 hover:text-red-600" onClick={onDelete}><Trash2 size={15} /></button></div>;
}

function EditModal({ edit, faculties, departments, onClose, onSaved }: { edit: NonNullable<Editing>; faculties: Faculty[]; departments: Department[]; onClose: () => void; onSaved: () => void }) {
  const fr = useFr();
  const row = (edit.row ?? {}) as Partial<Faculty & Department & Programme>;
  const [f, setF] = useState({ name: row.name ?? '', code: row.code ?? '', faculty_id: (row as Department).faculty_id ?? faculties[0]?.id ?? '', department_id: (row as Programme).department_id ?? departments[0]?.id ?? '', award: (row as Programme).award ?? '', duration_years: String((row as Programme).duration_years ?? 3), credits_required: String((row as Programme).credits_required ?? ''), head_name: (row as Department).head_name ?? '', is_active: (row as Programme).is_active ?? true });
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const set = (k: string, v: string | boolean) => setF(s => ({ ...s, [k]: v }));
  const title = { faculty: fr ? 'Faculté' : 'Faculty', department: fr ? 'Département' : 'Department', programme: fr ? 'Filière' : 'Programme' }[edit.kind];

  const save = async () => {
    setBusy(true); setErr('');
    try {
      if (edit.kind === 'faculty') await acad.saveFaculty({ name: f.name, code: f.code }, edit.row?.id);
      else if (edit.kind === 'department') await acad.saveDepartment({ name: f.name, code: f.code, faculty_id: f.faculty_id, head_name: f.head_name || null }, edit.row?.id);
      else await acad.saveProgramme({ name: f.name, code: f.code, department_id: f.department_id, award: f.award || null, duration_years: Number(f.duration_years), credits_required: f.credits_required === '' ? null : Number(f.credits_required), is_active: f.is_active }, edit.row?.id);
      onSaved();
    } catch (e) { setErr(msg(e)); } finally { setBusy(false); }
  };

  return (
    <Modal title={`${edit.row ? (fr ? 'Modifier' : 'Edit') : (fr ? 'Nouveau' : 'New')} · ${title}`} onClose={onClose}>
      <div className="space-y-3">
        <Field label={fr ? 'Nom' : 'Name'}><input className={`${input} w-full`} value={f.name} onChange={e => set('name', e.target.value)} /></Field>
        <Field label="Code"><input className={`${input} w-full uppercase`} value={f.code} onChange={e => set('code', e.target.value)} /></Field>
        {edit.kind === 'department' && <>
          <Field label={fr ? 'Faculté' : 'Faculty'}><select className={`${input} w-full`} value={f.faculty_id} onChange={e => set('faculty_id', e.target.value)}>{faculties.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</select></Field>
          <Field label={fr ? 'Chef de département' : 'Head of department'}><input className={`${input} w-full`} value={f.head_name} onChange={e => set('head_name', e.target.value)} /></Field>
        </>}
        {edit.kind === 'programme' && <>
          <Field label={fr ? 'Département' : 'Department'}><select className={`${input} w-full`} value={f.department_id} onChange={e => set('department_id', e.target.value)}>{departments.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</select></Field>
          <Field label={fr ? 'Diplôme délivré' : 'Award'}><input className={`${input} w-full`} placeholder="BSc, Licence…" value={f.award} onChange={e => set('award', e.target.value)} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={fr ? 'Durée (années)' : 'Duration (years)'}><input type="number" min={1} max={10} className={`${input} w-full`} value={f.duration_years} onChange={e => set('duration_years', e.target.value)} /></Field>
            <Field label={fr ? 'Crédits requis' : 'Credits required'} hint={fr ? 'Pour être diplômable' : 'To be eligible to graduate'}><input type="number" min={0} className={`${input} w-full`} value={f.credits_required} onChange={e => set('credits_required', e.target.value)} /></Field>
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.is_active} onChange={e => set('is_active', e.target.checked)} /> {fr ? 'Filière active' : 'Active programme'}</label>
        </>}
        <ErrorBox message={err} />
        <div className="flex justify-end gap-2 pt-2"><button className={btnGhost} onClick={onClose}>{fr ? 'Annuler' : 'Cancel'}</button><button className={btnPrimary} disabled={busy || !f.name.trim() || !f.code.trim()} onClick={save}>{fr ? 'Enregistrer' : 'Save'}</button></div>
      </div>
    </Modal>
  );
}
void btnDanger;
