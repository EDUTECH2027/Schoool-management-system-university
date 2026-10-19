import { useCallback, useEffect, useRef, useState } from 'react';
import { Download, Film, Loader2, X, ChevronLeft, ChevronRight, Images } from 'lucide-react';
import { mediaUrl } from '../../api/client';
import { useLanguage } from '../../i18n/LanguageContext';
import LazyImage from './LazyImage';
import RefreshButton from './RefreshButton';

export interface GalleryItem {
  id: string;
  kind: 'image' | 'video';
  /** Original file path as stored by the API. */
  url: string;
  caption?: string;
  date?: string;
}

export interface GalleryPage { items: GalleryItem[]; next: string | null }

interface Props {
  title?: string;
  /** Fetch one page. `cursor` is whatever the previous page returned as `next`; `kind` is the active filter. */
  fetchPage: (opts: { cursor?: string; kind?: 'image' | 'video' }) => Promise<GalleryPage>;
  /** Change this to force a reload (e.g. the active thread id). */
  resetKey?: string;
}

/**
 * Shared gallery: thumbnail grid (lazy-loaded), incremental "load more" pagination, full-resolution
 * lightbox only on demand, and a refresh button at the top that reloads from the server while keeping
 * the active filter and the number of pages the user had already loaded.
 */
export default function MediaGallery({ title, fetchPage, resetKey }: Props) {
  const { lang } = useLanguage();
  const fr = lang === 'fr';
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [next, setNext] = useState<string | null>(null);
  const [kind, setKind] = useState<'image' | 'video' | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [open, setOpen] = useState<number | null>(null);
  const sentinel = useRef<HTMLDivElement>(null);
  const seq = useRef(0);                       // ignore responses from superseded requests

  const loadFirst = useCallback(async (keepCount = 0) => {
    const my = ++seq.current;
    try {
      let acc: GalleryItem[] = [];
      let cursor: string | undefined;
      let last: string | null = null;
      // Refresh keeps pagination: re-fetch pages until we again have what was on screen.
      do {
        const page = await fetchPage({ cursor, kind });
        acc = acc.concat(page.items); last = page.next; cursor = page.next ?? undefined;
      } while (last && acc.length < keepCount);
      if (my !== seq.current) return;
      setItems(acc); setNext(last); setError('');
    } catch (e) {
      if (my !== seq.current) return;
      setError(e instanceof Error ? e.message : 'Failed to load');
      throw e;
    } finally {
      if (my === seq.current) setLoading(false);
    }
  }, [fetchPage, kind]);

  // initial load + whenever the filter / source changes
  useEffect(() => { setLoading(true); setItems([]); loadFirst().catch(() => {}); }, [loadFirst, resetKey]);

  const loadMore = useCallback(async () => {
    if (!next || loadingMore) return;
    setLoadingMore(true);
    const my = seq.current;
    try {
      const page = await fetchPage({ cursor: next, kind });
      if (my !== seq.current) return;
      setItems(prev => prev.concat(page.items.filter(i => !prev.some(p => p.id === i.id))));
      setNext(page.next);
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to load'); }
    finally { setLoadingMore(false); }
  }, [next, loadingMore, fetchPage, kind]);

  // infinite scroll: fetch the next page as the sentinel nears the viewport
  useEffect(() => {
    const el = sentinel.current; if (!el || !next) return;
    const io = new IntersectionObserver(es => { if (es[0].isIntersecting) loadMore(); }, { rootMargin: '300px' });
    io.observe(el);
    return () => io.disconnect();
  }, [next, loadMore]);

  const refresh = () => loadFirst(items.length);

  // keyboard navigation in the lightbox
  useEffect(() => {
    if (open === null) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(null);
      if (e.key === 'ArrowRight') setOpen(i => (i === null ? i : Math.min(items.length - 1, i + 1)));
      if (e.key === 'ArrowLeft') setOpen(i => (i === null ? i : Math.max(0, i - 1)));
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, items.length]);

  const filters: { key: 'image' | 'video' | undefined; label: string }[] = [
    { key: undefined, label: fr ? 'Tout' : 'All' },
    { key: 'image', label: fr ? 'Images' : 'Images' },
    { key: 'video', label: fr ? 'Vidéos' : 'Videos' },
  ];
  const cur = open !== null ? items[open] : null;

  return (
    <div className="space-y-3" data-testid="media-gallery">
      {/* Header: refresh always first, in the same place in every gallery */}
      <div className="flex flex-wrap items-center gap-2">
        <RefreshButton onRefresh={refresh} />
        {title && <h3 className="font-semibold text-slate-800 mr-auto">{title}</h3>}
        <div className="flex gap-1 ml-auto" role="tablist" aria-label="Filter">
          {filters.map(f => (
            <button key={f.label} role="tab" aria-selected={kind === f.key} onClick={() => setKind(f.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium ${kind === f.key ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {error && <p role="alert" className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

      {loading ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2" aria-busy="true">
          {Array.from({ length: 12 }, (_, i) => <div key={i} className="skeleton aspect-square" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center text-center py-12 text-slate-500">
          <Images size={28} className="text-slate-400 mb-2" />
          <p className="font-medium text-slate-700">{fr ? 'Aucun média' : 'No media yet'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
          {items.map((it, idx) => (
            <button key={it.id} onClick={() => setOpen(idx)} aria-label={it.caption || `${it.kind} ${idx + 1}`}
              className="relative rounded-lg overflow-hidden border border-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 group">
              {it.kind === 'image'
                ? <LazyImage path={it.url} size={256} ratio="1 / 1" alt={it.caption ?? ''} className="group-hover:opacity-90" />
                : <div className="aspect-square bg-slate-800 flex items-center justify-center"><Film className="text-slate-300" size={28} /></div>}
            </button>
          ))}
        </div>
      )}

      <div ref={sentinel} className="h-1" />
      {next && (
        <div className="flex justify-center">
          <button onClick={loadMore} disabled={loadingMore}
            className="px-4 py-2 rounded-lg border border-slate-300 text-sm text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-60 flex items-center gap-2">
            {loadingMore && <Loader2 size={14} className="animate-spin" />}{fr ? 'Charger plus' : 'Load more'}
          </button>
        </div>
      )}

      {/* Lightbox: the ONLY place the original (full-resolution) file is requested */}
      {cur && (
        <div data-testid="lightbox" className="fixed inset-0 z-[80] bg-black/90 flex flex-col" role="dialog" aria-modal="true" onClick={() => setOpen(null)}>
          <div className="flex items-center justify-between p-3 text-white" onClick={e => e.stopPropagation()}>
            <p className="text-sm truncate">{cur.caption ?? ''} <span className="text-white/60">{open! + 1} / {items.length}</span></p>
            <div className="flex gap-2">
              <a href={mediaUrl(cur.url)} download target="_blank" rel="noreferrer" aria-label="Download original" className="p-2 rounded-lg hover:bg-white/10"><Download size={18} /></a>
              <button onClick={() => setOpen(null)} aria-label="Close" className="p-2 rounded-lg hover:bg-white/10"><X size={18} /></button>
            </div>
          </div>
          <div className="flex-1 min-h-0 flex items-center justify-center px-12 relative" onClick={e => e.stopPropagation()}>
            {open! > 0 && <button onClick={() => setOpen(open! - 1)} aria-label="Previous" className="absolute left-2 p-2 rounded-full bg-white/10 text-white hover:bg-white/20"><ChevronLeft /></button>}
            {cur.kind === 'image'
              ? <img src={mediaUrl(cur.url)} alt={cur.caption ?? ''} className="max-w-full max-h-full object-contain" />
              : <video src={mediaUrl(cur.url)} controls autoPlay className="max-w-full max-h-full" />}
            {open! < items.length - 1 && <button onClick={() => setOpen(open! + 1)} aria-label="Next" className="absolute right-2 p-2 rounded-full bg-white/10 text-white hover:bg-white/20"><ChevronRight /></button>}
          </div>
        </div>
      )}
    </div>
  );
}
