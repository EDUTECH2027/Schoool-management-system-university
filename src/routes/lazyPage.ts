import { lazy, type ComponentType } from 'react';

// Page components have heterogeneous props; the loader only needs the component type, so `any` is the honest bound here.
/* eslint-disable @typescript-eslint/no-explicit-any */

type Loader<T> = () => Promise<{ default: T }>;
export type LazyPage<T extends ComponentType<any>> = ReturnType<typeof lazy<T>> & { preload: () => Promise<unknown> };

/** React.lazy + a preload() handle, so a page's chunk can be fetched before the user navigates to it. */
export function lazyPage<T extends ComponentType<any>>(loader: Loader<T>): LazyPage<T> {
  const C = lazy(loader) as LazyPage<T>;
  let started: Promise<unknown> | undefined;
  C.preload = () => (started ??= loader().catch(() => { started = undefined; }));
  return C;
}

/**
 * Warm the chunks of the other pages while the browser is idle (after the landing page is up), one at a time,
 * so later navigation is instant without delaying the first paint. Skipped on data-saver / 2G connections.
 */
export function prefetchWhenIdle(pages: { preload: () => Promise<unknown> }[]) {
  const conn = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  if (conn?.saveData || /(^|-)2g$/.test(conn?.effectiveType ?? '')) return;
  const idle = (cb: () => void) => ('requestIdleCallback' in window ? window.requestIdleCallback(cb, { timeout: 4000 }) : setTimeout(cb, 1500));
  const queue = [...pages];
  const next = () => { const p = queue.shift(); if (!p) return; void p.preload().finally(() => idle(next)); };
  idle(next);
}
