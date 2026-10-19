import { useState } from 'react';
import type { ReactNode } from 'react';
import { ImageOff } from 'lucide-react';
import { mediaThumb, mediaUrl } from '../../api/client';

interface Props {
  /** Original file path as stored by the API (e.g. /uploads/<school>/students/<id>.jpg). */
  path?: string | null;
  alt?: string;
  /** Displayed width in CSS px — the smallest sufficient thumbnail (and a 2× one for HiDPI) is requested. */
  size?: number;
  /** Reserve the box before the image arrives (e.g. "1 / 1", "4 / 3") to avoid layout shift. */
  ratio?: string;
  className?: string;
  /** Rendered instead of the image when there is no path or the image fails to load. */
  fallback?: ReactNode;
  /** Load straight away (use for the first row above the fold); otherwise lazy. */
  eager?: boolean;
}

/**
 * Thumbnail-first image: lazy-loaded, size-reserved, with a shimmer placeholder and a graceful
 * fallback. Browsing never downloads the full-resolution original — only <img src=original> in a
 * lightbox/link does.
 */
export default function LazyImage({ path, alt = '', size = 256, ratio, className = '', fallback, eager }: Props) {
  const [state, setState] = useState<'loading' | 'ok' | 'error'>('loading');
  const src = path ? mediaThumb(path, size) : '';
  const src2x = path ? mediaThumb(path, size * 2) : '';

  if (!path || state === 'error') {
    return <>{fallback ?? (
      <div className={`flex items-center justify-center bg-slate-100 text-slate-400 ${className}`} style={ratio ? { aspectRatio: ratio } : undefined} role="img" aria-label={alt || 'Image unavailable'}>
        <ImageOff size={Math.min(24, Math.max(12, Math.round(size / 3)))} />
      </div>
    )}</>;
  }
  const isThumb = src !== mediaUrl(path);
  return (
    <div className={`relative overflow-hidden ${className}`} style={ratio ? { aspectRatio: ratio } : undefined}>
      {state === 'loading' && <div className="skeleton absolute inset-0 rounded-none" aria-hidden="true" />}
      <img
        src={src}
        srcSet={isThumb ? `${src} 1x, ${src2x} 2x` : undefined}
        alt={alt}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        onLoad={() => setState('ok')}
        onError={() => setState('error')}
        className={`w-full h-full object-cover transition-opacity duration-200 ${state === 'ok' ? 'opacity-100' : 'opacity-0'}`}
      />
    </div>
  );
}
