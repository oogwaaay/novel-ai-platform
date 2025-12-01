import { useState, useEffect } from 'react';
import { GlassCard } from './ui/GlassCard';
import { useAuthStore } from '../store/authStore';
import { useProjectStore } from '../store/projectStore';
import { fetchUsage } from '../api/authApi';
import { useCapabilities } from '../hooks/useCapabilities';
import UpgradePrompt from './UpgradePrompt';
import type { UsageStats, SubscriptionLimits } from '../types/subscription';

interface WritingAnalyticsPanelProps {
  className?: string;
}

interface AnalyticsData {
  totalWords: number;
  totalProjects: number;
  totalGenerations: number;
  totalPages: number;
  averageWordsPerProject: number;
  projectsByGenre: Record<string, number>;
  recentActivity: Array<{
    date: string;
    words: number;
    projects: number;
  }>;
}

export default function WritingAnalyticsPanel({ className }: WritingAnalyticsPanelProps) {
  const { isAuthenticated } = useAuthStore();
  const { projects } = useProjectStore();
  const { hasFeature, tier, getRequiredTier } = useCapabilities();
  const [usage, setUsage] = useState<{ usage: UsageStats; limits?: SubscriptionLimits } | null>(null);
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    const loadData = async () => {
      try {
        const usageData = await fetchUsage();
        setUsage({
          usage: usageData.usage as UsageStats,
          limits: usageData.limits
        });
        
        // Calculate analytics from projects
        const totalWords = projects.reduce((sum, p) => {
          const words = p.chapters.length > 0
            ? p.chapters.reduce((s, ch) => s + Math.round((ch.content || '').split(/\s+/).filter(Boolean).length), 0)
            : Math.round((p.content || '').split(/\s+/).filter(Boolean).length);
          return sum + words;
        }, 0);

        const totalPages = Math.ceil(totalWords / 250);
        const totalProjects = projects.length;
        const averageWordsPerProject = totalProjects > 0 ? Math.round(totalWords / totalProjects) : 0;

        // Group by genre
        const projectsByGenre: Record<string, number> = {};
        projects.forEach((p) => {
          const genre = p.genre || 'unknown';
          projectsByGenre[genre] = (projectsByGenre[genre] || 0) + 1;
        });

        // Recent activity (last 7 days)
        const recentActivity: Array<{ date: string; words: number; projects: number }> = [];
        const now = Date.now();
        for (let i = 6; i >= 0; i--) {
          const date = new Date(now - i * 24 * 60 * 60 * 1000);
          const dateStr = date.toISOString().split('T')[0];
          
          const dayProjects = projects.filter((p) => {
            const updatedDate = new Date(p.updatedAt);
            return updatedDate.toISOString().split('T')[0] === dateStr;
          });

          const dayWords = dayProjects.reduce((sum, p) => {
            const words = p.chapters.length > 0
              ? p.chapters.reduce((s, ch) => s + Math.round((ch.content || '').split(/\s+/).filter(Boolean).length), 0)
              : Math.round((p.content || '').split(/\s+/).filter(Boolean).length);
            return sum + words;
          }, 0);

          recentActivity.push({
            date: dateStr,
            words: dayWords,
            projects: dayProjects.length
          });
        }

        setAnalytics({
          totalWords,
          totalProjects,
          totalGenerations: (usageData.usage.generationsUsed || 0),
          totalPages,
          averageWordsPerProject,
          projectsByGenre,
          recentActivity
        });
      } catch (error) {
        console.error('Failed to load analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [isAuthenticated, projects]);

  if (!isAuthenticated) {
    return (
      <GlassCard className={`p-6 ${className || ''}`}>
        <div className="text-center text-slate-500">
          <p className="text-sm">Please log in to view writing analytics</p>
        </div>
      </GlassCard>
    );
  }

  if (!hasFeature('analytics')) {
    return (
      <GlassCard className={`p-6 ${className || ''}`}>
        <UpgradePrompt
          currentTier={(tier as any) ?? 'free'}
          requiredTier={getRequiredTier('analytics')}
          featureName="Writing Analytics"
        />
      </GlassCard>
    );
  }

  if (loading) {
    return (
      <GlassCard className={`p-6 ${className || ''}`}>
        <div className="text-center text-slate-500">
          <p className="text-sm">Loading analytics...</p>
        </div>
      </GlassCard>
    );
  }

  if (!analytics) {
    return (
      <GlassCard className={`p-6 ${className || ''}`}>
        <div className="text-center text-slate-500">
          <p className="text-sm">No analytics data available</p>
        </div>
      </GlassCard>
    );
  }

  const maxActivityWords = Math.max(...analytics.recentActivity.map((a) => a.words), 1);
  const totalRecentWords = analytics.recentActivity.reduce((sum, day) => sum + day.words, 0);
  const averageDailyWords =
    analytics.recentActivity.length > 0 ? Math.round(totalRecentWords / analytics.recentActivity.length) : 0;
  const busiestDay =
    analytics.recentActivity.reduce(
      (top, entry) => (entry.words > top.words ? entry : top),
      analytics.recentActivity[0] ?? { date: '', words: 0, projects: 0 }
    ) ?? { date: '', words: 0, projects: 0 };
  const genreBreakdown = Object.entries(analytics.projectsByGenre).sort(([, a], [, b]) => b - a);
  const busiestDayLabel = busiestDay.date
    ? new Date(busiestDay.date).toLocaleDateString('en-US', { weekday: 'short' })
    : '--';

  return (
    <GlassCard className={`p-6 ${className || ''}`}>
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 mb-1">Writing Analytics</h3>
          <p className="text-sm text-slate-500">Track your writing progress and usage</p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-50 rounded-xl p-4">
            <p className="text-xs text-slate-500 mb-1">Total Words</p>
            <p className="text-2xl font-semibold text-slate-900">
              {analytics.totalWords.toLocaleString()}
            </p>
          </div>
          <div className="bg-slate-50 rounded-xl p-4">
            <p className="text-xs text-slate-500 mb-1">Total Pages</p>
            <p className="text-2xl font-semibold text-slate-900">
              {analytics.totalPages.toLocaleString()}
            </p>
          </div>
          <div className="bg-slate-50 rounded-xl p-4">
            <p className="text-xs text-slate-500 mb-1">Projects</p>
            <p className="text-2xl font-semibold text-slate-900">
              {analytics.totalProjects}
            </p>
          </div>
          <div className="bg-slate-50 rounded-xl p-4">
            <p className="text-xs text-slate-500 mb-1">Generations</p>
            <p className="text-2xl font-semibold text-slate-900">
              {analytics.totalGenerations.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Usage Stats */}
        {usage && (
          <div className="bg-slate-50 rounded-xl p-4">
            <p className="text-sm font-medium text-slate-700 mb-3">This Month</p>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-600">Generations used</span>
                <span className="text-sm font-medium text-slate-900">
                  {usage.usage.generationsUsed || 0} / {usage.limits && usage.limits.maxGenerationsPerMonth === Number.MAX_SAFE_INTEGER ? '∞' : (usage.limits?.maxGenerationsPerMonth || 0)}
                </span>
              </div>
              {usage.limits && usage.limits.maxGenerationsPerMonth !== Number.MAX_SAFE_INTEGER && (
                <div className="w-full bg-slate-200 rounded-full h-2">
                  <div
                    className="bg-slate-900 rounded-full h-2 transition-all"
                    style={{
                      width: `${Math.min(100, ((usage.usage.generationsUsed || 0) / (usage.limits.maxGenerationsPerMonth || 1)) * 100)}%`
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Recent Activity + Genre */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-100 bg-white/80 p-4">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Last 7 days</p>
                <p className="text-2xl font-semibold text-slate-900">{totalRecentWords.toLocaleString()} words</p>
                <p className="text-xs text-slate-500 mt-1">Avg {averageDailyWords.toLocaleString()} / day</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500">Peak day</p>
                <p className="text-sm font-semibold text-slate-900">
                  {busiestDay.words.toLocaleString()} words
                </p>
                <p className="text-xs text-slate-500">{busiestDayLabel}</p>
              </div>
            </div>
            <div className="flex items-end gap-2 h-32">
              {analytics.recentActivity.map((activity, index) => {
                const height = (activity.words / maxActivityWords) * 100;
                const date = new Date(activity.date);
                const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
                return (
                  <div key={index} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full flex flex-col items-center justify-end" style={{ height: '100%' }}>
                      <div
                        className="w-full rounded-t-lg bg-gradient-to-t from-indigo-600 to-indigo-400 transition-all"
                        style={{ height: `${Math.max(6, height)}%` }}
                        title={`${activity.words} words • ${activity.projects} projects`}
                      />
                    </div>
                    <span className="text-[11px] text-slate-500">{dayName}</span>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-white/80 p-4">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400 mb-2">Genre workload</p>
            {genreBreakdown.length === 0 ? (
              <p className="text-sm text-slate-500">No genre metadata available yet.</p>
            ) : (
              <div className="space-y-3">
                {genreBreakdown.map(([genre, count]) => {
                  const percentage = analytics.totalProjects
                    ? Math.round((count / analytics.totalProjects) * 100)
                    : 0;
                  return (
                    <div key={genre}>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-600 capitalize">{genre.replace(/-/g, ' ')}</span>
                        <span className="text-slate-900 font-medium">
                          {count} projects · {percentage}%
                        </span>
                      </div>
                      <div className="mt-1 h-2 rounded-full bg-slate-100">
                        <div
                          className="h-2 rounded-full bg-slate-900 transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Average Words per Project */}
        <div className="bg-slate-50 rounded-xl p-4">
          <p className="text-xs text-slate-500 mb-1">Average Words per Project</p>
          <p className="text-2xl font-semibold text-slate-900">
            {analytics.averageWordsPerProject.toLocaleString()}
          </p>
        </div>
      </div>
    </GlassCard>
  );
}

