// Placeholder shown only while a lazily-loaded page chunk is actually downloading.
export default function PageSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading">
      <div className="skeleton h-8 w-56" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map(i => <div key={i} className="skeleton h-24" />)}
      </div>
      <div className="skeleton h-64" />
    </div>
  );
}
