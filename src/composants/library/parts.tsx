import { useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { lib, type LibItem } from '../../api/library';
import { Badge, ErrorBox, Field, Modal, btnGhost, btnPrimary, input, msg, useFr } from '../academics/ui';

export const KINDS = ['book', 'journal', 'thesis', 'digital'] as const;
export const kindLabel = (k: string, fr: boolean) => ({ book: fr ? 'Livre' : 'Book', journal: fr ? 'Revue' : 'Journal', thesis: fr ? 'Mémoire/thèse' : 'Thesis', digital: fr ? 'Numérique' : 'Digital' } as Record<string, string>)[k] ?? k;
export const money = (n: number, cur: string, lang: string) => `${n.toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-GB', { maximumFractionDigits: 2 })} ${cur}`;

export function AvailabilityBadge({ item }: { item: LibItem }) {
  const fr = useFr();
  if (item.kind === 'digital') return <Badge tone="blue">{fr ? 'En ligne' : 'Online'}</Badge>;
  if (!item.is_active) return <Badge tone="slate">{fr ? 'Inactif' : 'Inactive'}</Badge>;
  return item.available > 0
    ? <Badge tone="green">{item.available} {fr ? 'dispo.' : 'available'}</Badge>
    : <Badge tone="amber">{fr ? 'Indisponible' : 'Unavailable'}{item.waiting > 0 ? ` · ${item.waiting} ${fr ? 'en attente' : 'waiting'}` : ''}</Badge>;
}

export function DigitalLink({ url }: { url: string | null }) {
  const fr = useFr();
  return url ? <a href={url} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1 text-indigo-600 hover:underline text-sm"><ExternalLink size={13} /> {fr ? 'Ouvrir' : 'Open'}</a> : null;
}

const empty = { title: '', authors: '', isbn: '', publisher: '', year: '', category: '', kind: 'book', location: '', description: '', copies_total: '1', digital_url: '', is_active: true };

/** Create / edit a catalogue item. */
export function ItemModal({ item, onClose, onSaved }: { item: LibItem | null; onClose: () => void; onSaved: () => void }) {
  const fr = useFr();
  const [f, setF] = useState(item ? { ...empty, ...Object.fromEntries(Object.entries(item).map(([k, v]) => [k, v ?? ''])), copies_total: String(item.copies_total), year: item.year ? String(item.year) : '' } as typeof empty : empty);
  const [err, setErr] = useState(''); const [warn, setWarn] = useState(''); const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof empty, v: string | boolean) => setF(s => ({ ...s, [k]: v }));
  const save = async () => {
    setBusy(true); setErr('');
    try {
      const copies = Number(f.copies_total);
      const r = await lib.saveItem({ title: f.title, authors: f.authors, isbn: f.isbn, publisher: f.publisher, year: f.year ? Number(f.year) : null, category: f.category, kind: f.kind as LibItem['kind'], location: f.location, description: f.description, copies_total: copies, digital_url: f.digital_url, is_active: f.is_active }, item?.id);
      if (r.warnings?.length) { setWarn(r.warnings.map(w => w.message).join(' ')); onSaved(); return; }
      onSaved(); onClose();
    } catch (e) { setErr(msg(e)); } finally { setBusy(false); }
  };
  return (
    <Modal title={item ? (fr ? 'Modifier l’ouvrage' : 'Edit item') : (fr ? 'Nouvel ouvrage' : 'New item')} onClose={onClose} wide>
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2"><Field label={fr ? 'Titre' : 'Title'}><input className={`${input} w-full`} value={f.title} onChange={e => set('title', e.target.value)} /></Field></div>
        <Field label={fr ? 'Auteur(s)' : 'Authors'}><input className={`${input} w-full`} value={f.authors} onChange={e => set('authors', e.target.value)} /></Field>
        <Field label="ISBN"><input className={`${input} w-full`} value={f.isbn} onChange={e => set('isbn', e.target.value)} /></Field>
        <Field label={fr ? 'Éditeur' : 'Publisher'}><input className={`${input} w-full`} value={f.publisher} onChange={e => set('publisher', e.target.value)} /></Field>
        <Field label={fr ? 'Année' : 'Year'}><input className={`${input} w-full`} inputMode="numeric" value={f.year} onChange={e => set('year', e.target.value)} /></Field>
        <Field label={fr ? 'Catégorie' : 'Category'}><input className={`${input} w-full`} value={f.category} onChange={e => set('category', e.target.value)} /></Field>
        <Field label={fr ? 'Type' : 'Kind'}><select className={`${input} w-full`} value={f.kind} onChange={e => set('kind', e.target.value)}>{KINDS.map(k => <option key={k} value={k}>{kindLabel(k, fr)}</option>)}</select></Field>
        <Field label={fr ? 'Emplacement' : 'Location'}><input className={`${input} w-full`} value={f.location} onChange={e => set('location', e.target.value)} /></Field>
        <Field label={fr ? 'Nombre d’exemplaires' : 'Copies'}><input className={`${input} w-full`} type="number" min={0} value={f.copies_total} onChange={e => set('copies_total', e.target.value)} /></Field>
        {f.kind === 'digital' && <div className="sm:col-span-2"><Field label={fr ? 'Lien (https://…)' : 'Link (https://…)'}><input className={`${input} w-full`} value={f.digital_url} onChange={e => set('digital_url', e.target.value)} /></Field></div>}
        <div className="sm:col-span-2"><Field label="Description"><textarea className={`${input} w-full`} rows={2} value={f.description} onChange={e => set('description', e.target.value)} /></Field></div>
        {item && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.is_active} onChange={e => set('is_active', e.target.checked)} /> {fr ? 'Actif (visible au catalogue)' : 'Active (visible in the catalogue)'}</label>}
      </div>
      <div className="mt-3 space-y-2"><ErrorBox message={err} />{warn && <p role="status" className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">{warn}</p>}</div>
      <div className="flex justify-end gap-2 mt-4">
        <button className={btnGhost} onClick={onClose}>{warn ? (fr ? 'Fermer' : 'Close') : (fr ? 'Annuler' : 'Cancel')}</button>
        {!warn && <button className={btnPrimary} disabled={busy || !f.title.trim()} onClick={save}>{fr ? 'Enregistrer' : 'Save'}</button>}
      </div>
    </Modal>
  );
}
