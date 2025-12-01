import type { ProjectActivity } from '../api/projectApi';

interface CollaborationActivityTimelineProps {
  activities: ProjectActivity[];
}

const typeLabels: Record<ProjectActivity['type'], string> = {
  lock_acquired: '获得区段锁',
  lock_released: '释放区段锁',
  lock_denied: '锁定冲突',
  comment_added: '新增评论',
  comment_resolved: '评论已解决'
};

const typeColors: Record<ProjectActivity['type'], string> = {
  lock_acquired: 'text-emerald-600 bg-emerald-50',
  lock_released: 'text-slate-600 bg-slate-50',
  lock_denied: 'text-amber-600 bg-amber-50',
  comment_added: 'text-indigo-600 bg-indigo-50',
  comment_resolved: 'text-emerald-700 bg-emerald-50'
};

const timeFormatter = new Intl.DateTimeFormat(undefined, {
  hour: '2-digit',
  minute: '2-digit'
});

const sectionLabel = (activity: ProjectActivity) => {
  if (!activity.sectionId) return '';
  if (activity.sectionId === 'draft') return '草稿';
  if (activity.sectionId.startsWith('chapter-')) {
    const index = Number(activity.sectionId.split('-')[1]) + 1 || 1;
    return `章节 ${index}`;
  }
  return activity.sectionId;
};

const describeActivity = (activity: ProjectActivity) => {
  switch (activity.type) {
    case 'lock_acquired':
      return `${activity.userName || '成员'} 锁定了 ${sectionLabel(activity) || '当前段落'}`;
    case 'lock_released':
      return `${activity.userName || '成员'} 释放了 ${sectionLabel(activity) || '当前段落'}`;
    case 'lock_denied':
      return `${activity.userName || '成员'} 请求锁时冲突，${activity.text || '请稍后重试'}`;
    case 'comment_added':
      return `${activity.userName || '成员'} 添加了评论`;
    case 'comment_resolved':
      return `${activity.userName || '成员'} 将评论标记为已解决`;
    default:
      return '发生了协作事件';
  }
};

export default function CollaborationActivityTimeline({ activities }: CollaborationActivityTimelineProps) {
  if (activities.length === 0) {
    return null;
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white shadow-sm px-6 py-5 mt-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Activity timeline</p>
          <p className="text-sm text-slate-500">最近的锁定 / 评论事件</p>
        </div>
        <span className="text-xs text-slate-400">{activities.length} 条记录</span>
      </div>
      <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
        {activities.map((activity) => (
          <div
            key={activity.id}
            className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 px-4 py-3"
          >
            <div
              className={`mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold ${typeColors[activity.type]}`}
            >
              {timeFormatter.format(activity.createdAt)}
            </div>
            <div className="flex-1">
              <p className="text-sm text-slate-900 font-medium">{typeLabels[activity.type]}</p>
              <p className="text-sm text-slate-600 mt-1">{describeActivity(activity)}</p>
              {activity.text && activity.type === 'comment_added' && (
                <p className="mt-1 text-xs text-slate-500 italic">
                  “{activity.text.length > 80 ? `${activity.text.slice(0, 80)}…` : activity.text}”
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}


