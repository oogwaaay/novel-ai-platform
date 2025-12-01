// Skeleton loader for better loading experience
export default function SkeletonLoader({ type = 'chapter' }: { type?: 'chapter' | 'outline' | 'editor' }) {
  if (type === 'chapter') {
    return (
      <div className="space-y-4 animate-pulse">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-2xl border border-slate-100 bg-white p-5">
            <div className="flex items-start justify-between gap-4 mb-3">
              <div className="flex-1">
                <div className="h-4 bg-slate-200 rounded w-24 mb-2" />
                <div className="h-6 bg-slate-200 rounded w-3/4" />
              </div>
              <div className="h-4 bg-slate-200 rounded w-16" />
            </div>
            <div className="space-y-2">
              <div className="h-4 bg-slate-100 rounded w-full" />
              <div className="h-4 bg-slate-100 rounded w-5/6" />
              <div className="h-4 bg-slate-100 rounded w-4/5" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (type === 'outline') {
    return (
      <div className="space-y-2 animate-pulse">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="rounded-xl px-3 py-2">
            <div className="h-4 bg-slate-200 rounded w-3/4 mb-1" />
            <div className="h-3 bg-slate-100 rounded w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="animate-pulse space-y-4">
      <div className="h-8 bg-slate-200 rounded w-1/3" />
      <div className="space-y-2">
        <div className="h-4 bg-slate-100 rounded w-full" />
        <div className="h-4 bg-slate-100 rounded w-5/6" />
        <div className="h-4 bg-slate-100 rounded w-4/5" />
      </div>
    </div>
  );
}


