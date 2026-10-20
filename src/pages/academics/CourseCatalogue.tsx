import { useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';
import { api } from '../../api/client';
import { acad, type Course, type CurriculumItem } from '../../api/academics';
import { Badge, ErrorBox, Field, Modal, PageHeader, Spinner, Table, Tabs, btnGhost, btnPrimary, input, msg, useDebounced, useFr, useLoad } from '../../composants/academics/ui';
import ConfirmDialog from '../../composants/ui/ConfirmDialog';

const SEM = ['first', 'second', 'third'] as const;

export default function CourseCatalogue() {
  const fr = useFr();
  const [tab, setTab] = useState<'courses' | 'curriculum'>('courses');
  const [q, setQ] = useState(''); const dq = useDebounced(q);
  const [edit, setEdit] = useState<Partial<Course> | null>(null);
  const [del, setDel] = useState<Course | null>(null);
  const [err, setErr] = useState('');
  const courses = useLoad(() => acad.courses({ q: dq }), [dq]);
  const all = useLoad(() => acad.courses());
  const deps = useLoad(acad.departments);
  const levels = useLoad(() => api.getGradeLevels());
  const byId = useMemo(() => Object.fromEntries((all.data ?? []).map(c => [c.id, c])), [all.data]);
  const reload = () => { void courses.reload(); void all.reload(); };

  return (
    <div className="space-y-5">
      <PageHeader title={fr ? 'Catalogue des cours' : 'Course catalogue'} subtitle={fr ? 'Cours, crédits, prérequis et cursus par filière' : 'Courses, credits, prerequisites and programme curricula'} onRefresh={reload}>
        {tab === 'courses' && <button className={btnPrimary} onClick={() => setEdit({ semester: 'first', credit_hours: 3, prerequisite_ids: [], is_active: true })}><Plus size={14} /> {fr ? 'Nouveau cours' : 'New course'}</button>}
      </PageHeader>
      <ErrorBox message={err || courses.error} />
      <Tabs value={tab} onChange={setTab} tabs={[{ id: 'courses', label: fr ? 'Cours' : 'Courses' }, { id: 'curriculum', label: fr ? 'Cursus par filière' : 'Programme curriculum' }]} />

      {tab === 'courses' && (
        <>
          <div className="relative max-w-sm"><Search size={15} className="absolute left-3 top-3 text-slate-400" /><input aria-label="Search courses" className={`${input} w-full pl-9`} placeholder={fr ? 'Rechercher un cours…' : 'Search courses…'} value={q} onChange={e => setQ(e.target.value)} /></div>
          {!courses.data ? <Spinner /> : (
            <Table min={860} head={['Code', fr ? 'Cours' : 'Course', 'Crédits', fr ? 'Département' : 'Department', 'Sem.', fr ? 'Prérequis' : 'Prerequisites', '']} empty={courses.data.length ? undefined : (fr ? 'Aucun cours' : 'No courses found')}>
              {courses.data.map(c => (
                <tr key={c.id} className={c.is_active ? '' : 'opacity-60'}>
                  <td className="px-4 py-3 font-mono text-xs">{c.code}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">{c.name} {!c.is_active && <Badge tone="slate">{fr ? 'archivé' : 'archived'}</Badge>}</td>
                  <td className="px-4 py-3">{c.credit_hours}</td>
                  <td className="px-4 py-3 text-slate-600">{deps.data?.find(d => d.id === c.department_id)?.name ?? '—'}</td>
                  <td className="px-4 py-3 capitalize">{c.semester ?? '—'}</td>
                  <td className="px-4 py-3">{c.prerequisite_ids.length ? <div className="flex flex-wrap gap-1">{c.prerequisite_ids.map(id => <Badge key={id} tone="indigo">{byId[id]?.code ?? '?'}</Badge>)}</div> : <span className="text-slate-400">—</span>}</td>
                  <td className="px-4 py-3"><div className="flex gap-1 justify-end"><button aria-label="Edit" className="p-1.5 text-slate-500 hover:text-indigo-600" onClick={() => setEdit(c)}><Pencil size={15} /></button><button aria-label="Delete" className="p-1.5 text-slate-500 hover:text-red-600" onClick={() => setDel(c)}><Trash2 size={15} /></button></div></td>
                </tr>
              ))}
            </Table>
          )}
        </>
      )}
      {tab === 'curriculum' && <Curriculum courses={all.data ?? []} levels={levels.data ?? []} />}

      {edit && <CourseModal course={edit} all={all.data ?? []} departments={deps.data ?? []} levels={levels.data ?? []} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); reload(); }} />}
      {del && <ConfirmDialog title={fr ? 'Supprimer ce cours ?' : 'Delete this course?'} message={del.name} sub={fr ? 'Un cours avec un historique doit être archivé, pas supprimé.' : 'A course with history must be archived, not deleted.'} confirmLabel={fr ? 'Supprimer' : 'Delete'}
        onConfirm={async () => { try { await acad.delCourse(del.id); setErr(''); reload(); } catch (e) { setErr(msg(e)); } setDel(null); }} onCancel={() => setDel(null)} />}
    </div>
  );
}

function CourseModal({ course, all, departments, levels, onClose, onSaved }: { course: Partial<Course>; all: Course[]; departments: { id: string; name: string }[]; levels: { id: string; name: string }[]; onClose: () => void; onSaved: () => void }) {
  const fr = useFr();
  const [f, setF] = useState({ name: course.name ?? '', code: course.code ?? '', credit_hours: String(course.credit_hours ?? 3), department_id: course.department_id ?? '', level_id: course.level_id ?? '', semester: course.semester ?? 'first', description: course.description ?? '', is_active: course.is_active ?? true, prerequisite_ids: course.prerequisite_ids ?? [] });
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const set = (k: string, v: unknown) => setF(s => ({ ...s, [k]: v }));
  const save = async () => {
    setBusy(true); setErr('');
    try { await acad.saveCourse({ ...f, credit_hours: Number(f.credit_hours), department_id: f.department_id || null, level_id: f.level_id || null, semester: f.semester as Course['semester'] }, course.id); onSaved(); }
    catch (e) { setErr(msg(e)); } finally { setBusy(false); }
  };
  const candidates = all.filter(c => c.id !== course.id);
  return (
    <Modal wide title={course.id ? (fr ? 'Modifier le cours' : 'Edit course') : (fr ? 'Nouveau cours' : 'New course')} onClose={onClose}>
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label={fr ? 'Intitulé' : 'Title'}><input className={`${input} w-full`} value={f.name} onChange={e => set('name', e.target.value)} /></Field>
        <Field label="Code"><input className={`${input} w-full`} value={f.code} onChange={e => set('code', e.target.value)} /></Field>
        <Field label={fr ? 'Crédits' : 'Credits'}><input type="number" min={0.5} step={0.5} className={`${input} w-full`} value={f.credit_hours} onChange={e => set('credit_hours', e.target.value)} /></Field>
        <Field label={fr ? 'Semestre habituel' : 'Usual semester'}><select className={`${input} w-full`} value={f.semester} onChange={e => set('semester', e.target.value)}>{SEM.map(s => <option key={s} value={s}>{s}</option>)}</select></Field>
        <Field label={fr ? 'Département' : 'Department'}><select className={`${input} w-full`} value={f.department_id} onChange={e => set('department_id', e.target.value)}><option value="">—</option>{departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></Field>
        <Field label={fr ? 'Niveau' : 'Level'}><select className={`${input} w-full`} value={f.level_id} onChange={e => set('level_id', e.target.value)}><option value="">—</option>{levels.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></Field>
        <div className="sm:col-span-2"><Field label={fr ? 'Description' : 'Description'}><textarea rows={2} className={`${input} w-full`} value={f.description} onChange={e => set('description', e.target.value)} /></Field></div>
        <div className="sm:col-span-2">
          <Field label={fr ? 'Prérequis' : 'Prerequisites'} hint={fr ? 'Cours à valider avant de s’inscrire. Les boucles sont refusées.' : 'Courses that must be passed first. Loops are rejected.'}>
            <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-lg p-2 grid sm:grid-cols-2 gap-1">
              {candidates.map(c => (
                <label key={c.id} className="flex items-center gap-2 text-sm px-1"><input type="checkbox" checked={f.prerequisite_ids.includes(c.id)} onChange={e => set('prerequisite_ids', e.target.checked ? [...f.prerequisite_ids, c.id] : f.prerequisite_ids.filter(x => x !== c.id))} /><span className="font-mono text-xs text-slate-500">{c.code}</span> {c.name}</label>
              ))}
              {!candidates.length && <span className="text-sm text-slate-400">—</span>}
            </div>
          </Field>
        </div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.is_active} onChange={e => set('is_active', e.target.checked)} /> {fr ? 'Cours actif (ouvert aux inscriptions)' : 'Active (open for registration)'}</label>
      </div>
      <div className="mt-3"><ErrorBox message={err} /></div>
      <div className="flex justify-end gap-2 pt-4"><button className={btnGhost} onClick={onClose}>{fr ? 'Annuler' : 'Cancel'}</button><button className={btnPrimary} disabled={busy || !f.name.trim() || !f.code.trim()} onClick={save}>{fr ? 'Enregistrer' : 'Save'}</button></div>
    </Modal>
  );
}

function Curriculum({ courses, levels }: { courses: Course[]; levels: { id: string; name: string }[] }) {
  const fr = useFr();
  const prg = useLoad(acad.programmes);
  const [pid, setPid] = useState('');
  const [items, setItems] = useState<CurriculumItem[] | null>(null);
  const [err, setErr] = useState(''); const [ok, setOk] = useState('');
  const pick = async (id: string) => { setPid(id); setOk(''); setErr(''); setItems(id ? await acad.curriculum(id).catch(e => { setErr(msg(e)); return []; }) : null); };
  const has = new Set((items ?? []).map(i => i.subject_id));
  const save = async () => { try { await acad.saveCurriculum(pid, items!.map(({ subject_id, level_id, semester, kind }) => ({ subject_id, level_id, semester, kind }))); setOk(fr ? 'Cursus enregistré.' : 'Curriculum saved.'); setErr(''); } catch (e) { setErr(msg(e)); } };
  const upd = (id: string, patch: Partial<CurriculumItem>) => setItems(list => list!.map(i => (i.subject_id === id ? { ...i, ...patch } : i)));
  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-500">{fr ? 'Quand une filière a un cursus, les cours hors cursus nécessitent une dérogation. Sans cursus, tout cours est ouvert.' : 'When a programme has a curriculum, courses outside it need an exception. With no curriculum, every course is open.'}</p>
      <select aria-label="Programme" className={`${input} w-full max-w-md`} value={pid} onChange={e => void pick(e.target.value)}><option value="">{fr ? 'Choisir une filière…' : 'Choose a programme…'}</option>{prg.data?.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
      <ErrorBox message={err} />{ok && <p className="text-sm text-emerald-600">{ok}</p>}
      {items && (
        <div className="grid lg:grid-cols-2 gap-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-500 uppercase mb-2">{fr ? 'Dans le cursus' : 'In the curriculum'} ({items.length})</h2>
            <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
              {items.map(i => (
                <div key={i.subject_id} className="p-3 flex flex-wrap items-center gap-2">
                  <div className="mr-auto min-w-0"><p className="text-sm font-medium text-slate-800 truncate">{courses.find(c => c.id === i.subject_id)?.name ?? i.course}</p><p className="text-xs text-slate-400 font-mono">{courses.find(c => c.id === i.subject_id)?.code ?? i.code}</p></div>
                  <select aria-label="Level" className={`${input} !py-1`} value={i.level_id ?? ''} onChange={e => upd(i.subject_id, { level_id: e.target.value || null })}><option value="">{fr ? 'Niveau' : 'Level'}</option>{levels.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</select>
                  <select aria-label="Semester" className={`${input} !py-1`} value={i.semester} onChange={e => upd(i.subject_id, { semester: e.target.value as CurriculumItem['semester'] })}>{SEM.map(s => <option key={s} value={s}>{s}</option>)}</select>
                  <select aria-label="Kind" className={`${input} !py-1`} value={i.kind} onChange={e => upd(i.subject_id, { kind: e.target.value as CurriculumItem['kind'] })}><option value="core">{fr ? 'Obligatoire' : 'Core'}</option><option value="elective">{fr ? 'Optionnel' : 'Elective'}</option></select>
                  <button aria-label="Remove" className="text-slate-400 hover:text-red-600" onClick={() => setItems(l => l!.filter(x => x.subject_id !== i.subject_id))}><Trash2 size={15} /></button>
                </div>
              ))}
              {!items.length && <p className="p-6 text-center text-sm text-slate-400">{fr ? 'Aucun cours' : 'No courses yet'}</p>}
            </div>
            <button className={`${btnPrimary} mt-3`} onClick={save}>{fr ? 'Enregistrer le cursus' : 'Save curriculum'}</button>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-500 uppercase mb-2">{fr ? 'Cours disponibles' : 'Available courses'}</h2>
            <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 max-h-[28rem] overflow-y-auto">
              {courses.filter(c => !has.has(c.id) && c.is_active).map(c => (
                <button key={c.id} className="w-full text-left p-3 flex items-center gap-2 hover:bg-slate-50" onClick={() => setItems(l => [...l!, { subject_id: c.id, level_id: c.level_id, semester: c.semester ?? 'first', kind: 'core' }])}>
                  <Plus size={14} className="text-indigo-600" /><span className="font-mono text-xs text-slate-500">{c.code}</span><span className="text-sm text-slate-800">{c.name}</span><span className="ml-auto text-xs text-slate-400">{c.credit_hours} cr</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
