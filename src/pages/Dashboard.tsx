import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import jsPDF from 'jspdf';
import { SEO } from '../components/SEO';
import { useProjectStore } from '../store/projectStore';
import type { Project as StoreProject } from '../store/projectStore';
import { getProjects, deleteProject, updateProject, createProject } from '../api/projectApi';
import { useAuthStore } from '../store/authStore';
import type { DraftSnapshot } from '../components/HistoryDrawer';
import { GlassCard } from '../components/ui/GlassCard';
import { WorkspaceView } from '../components/WorkspaceView';
import type { BlockSchema } from '../types/block';
import { getKeyValue, setKeyValue } from '../utils/offlineDb';
import ProjectCreationWizard from '../components/ProjectCreationWizard';
import LoginModal from '../components/LoginModal';
import WritingAnalyticsPanel from '../components/WritingAnalyticsPanel';
import { useCapabilities } from '../hooks/useCapabilities';
import UpgradePrompt from '../components/UpgradePrompt';
import { useSubscription } from '../hooks/useSubscription';
import { migrateLocalStorageToBackend, needsMigration } from '../utils/dataMigration';
import { countWords } from '../utils/wordCount';

const HISTORY_KEY = 'novel-ai-history';

const buildFilenameBase = (idea: string) => {
  const sanitized = idea
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return sanitized || 'ai-novel-draft';
};

type CombinedProject =
  | {
      isBackend: true;
      id: string;
      title: string;
      updatedAt: number;
      wordCount: number;
      project: StoreProject;
    }
  | {
      isBackend: false;
      id: string;
      title: string;
      updatedAt: number;
      wordCount: number;
      snapshot: DraftSnapshot;
    };

export default function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuthStore();
  const { tier } = useSubscription();
  const { projects, setProjects, setCurrentProject } = useProjectStore();
  const { hasFeature } = useCapabilities();
  const [history, setHistory] = useState<DraftSnapshot[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);
  const [archivedProjects, setArchivedProjects] = useState<Set<string>>(new Set());
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null); // null = all folders, '' = no folder
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [pendingProjectData, setPendingProjectData] = useState<{
    title: string;
    genre: string;
    length: number;
    language: string;
    idea?: string;
  } | null>(null);

  // Load projects from backend if authenticated, otherwise from offline cache
  useEffect(() => {
    const loadProjects = async () => {
      try {
        if (isAuthenticated) {
          try {
            setLoading(true);
            const backendProjects = await getProjects();
            setProjects(backendProjects);
          } catch (error) {
            console.error('Failed to load projects from backend:', error);
            await loadLocalProjects();
          } finally {
            setLoading(false);
          }
        } else {
          await loadLocalProjects();
          setLoading(false);
        }
      } catch (error) {
        console.error('Error loading projects:', error);
        setLoading(false);
      }
    };

    const loadLocalProjects = async () => {
      try {
        const stored = await getKeyValue<DraftSnapshot[]>(HISTORY_KEY, []);
        if (Array.isArray(stored)) {
          const sorted = stored.sort((a: DraftSnapshot, b: DraftSnapshot) => b.timestamp - a.timestamp);
          setHistory(sorted);
        }
      } catch (error) {
        console.error('Error loading local projects:', error);
      }
    };

    loadProjects();
  }, [isAuthenticated, setProjects, location.pathname, location.key]);
  
  // 额外监听：当从其他页面返回时，强制刷新项目列表
  useEffect(() => {
    if (location.pathname === '/dashboard' && isAuthenticated) {
      const refreshProjects = async () => {
        try {
          const backendProjects = await getProjects();
          console.log('[Dashboard] Refreshed projects on navigation:', backendProjects.length);
          setProjects(backendProjects);
        } catch (error) {
          console.error('Failed to refresh projects on navigation:', error);
        }
      };
      refreshProjects();
    }
  }, [location.pathname, isAuthenticated, setProjects]);

  // Check and perform data migration if needed
  const [migrationStatus, setMigrationStatus] = useState<{
    inProgress: boolean;
    completed: number;
    total: number;
    current?: string;
    errors: string[];
  } | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !needsMigration()) {
      return;
    }

    const performMigration = async () => {
      setMigrationStatus({ inProgress: true, completed: 0, total: 0, errors: [] });
      
      const result = await migrateLocalStorageToBackend((progress) => {
        setMigrationStatus({
          inProgress: true,
          completed: progress.completed,
          total: progress.total,
          current: progress.current,
          errors: progress.errors
        });
      });

      if (result.success) {
        // Refresh projects after migration
        try {
          const backendProjects = await getProjects();
          setProjects(backendProjects);
        } catch (error) {
          console.error('Failed to refresh projects after migration:', error);
        }
      }

      setMigrationStatus((prev) => prev ? { ...prev, inProgress: false } : null);
    };

    // Small delay to ensure projects are loaded first
    const timer = setTimeout(performMigration, 1000);
    return () => clearTimeout(timer);
  }, [isAuthenticated, setProjects]);

  // Combine backend projects and local history
  const allProjects: CombinedProject[] = useMemo(() => {
    try {
      const backendProjectsList: CombinedProject[] = (projects || []).map((p) => ({
        id: p.id,
        title: p.title,
        updatedAt: p.updatedAt,
        wordCount: p.chapters && p.chapters.length > 0
          ? p.chapters.reduce((sum, ch) => sum + countWords(ch.content || ''), 0)
          : countWords(p.content || ''),
        isBackend: true as const,
        project: p
      }));

      const localProjectsList: CombinedProject[] = (history || []).map((snapshot) => ({
        id: snapshot.id,
        title: snapshot.label || (snapshot.idea ? snapshot.idea.slice(0, 50) : 'Untitled'),
        updatedAt: snapshot.timestamp,
        wordCount: snapshot.chapters && snapshot.chapters.length > 0
          ? snapshot.chapters.reduce((sum, ch) => sum + countWords(ch.content || ''), 0)
          : countWords(snapshot.content || ''),
        isBackend: false as const,
        snapshot
      }));

      // 去重：如果ID相同，优先保留后端项目
      const combined = [...backendProjectsList, ...localProjectsList];
      const uniqueProjects = combined.reduce((acc, project) => {
        const existing = acc.find(p => p.id === project.id);
        if (!existing) {
          acc.push(project);
        } else if (existing.isBackend === false && project.isBackend === true) {
          // 如果存在的是本地项目而当前是后端项目，则替换
          const index = acc.indexOf(existing);
          acc[index] = project;
        }
        // 如果存在的是后端项目，则保留现有的，不添加新的
        return acc;
      }, [] as CombinedProject[]);

      return uniqueProjects.sort((a, b) => b.updatedAt - a.updatedAt);
    } catch (error) {
      console.error('Error combining projects:', error);
      return [];
    }
  }, [projects, history]);

  // Extract unique folders and tags from projects
  const { folders, tags } = useMemo(() => {
    const folderSet = new Set<string>();
    const tagSet = new Set<string>();
    
    allProjects.forEach((item) => {
      if (item.isBackend && item.project) {
        if (item.project.folder) {
          folderSet.add(item.project.folder);
        }
        if (item.project.tags && item.project.tags.length > 0) {
          item.project.tags.forEach((tag) => tagSet.add(tag));
        }
      }
    });
    
    return {
      folders: Array.from(folderSet).sort(),
      tags: Array.from(tagSet).sort()
    };
  }, [allProjects]);

  const filteredProjects: CombinedProject[] = useMemo(() => {
    let filtered = allProjects;
    
    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((item) => {
        const titleMatch = item.title.toLowerCase().includes(query);
        const tagMatch = item.isBackend && item.project?.tags?.some((tag) => 
          tag.toLowerCase().includes(query)
        );
        return titleMatch || tagMatch;
      });
    }
    
    // Folder filter
    if (selectedFolder !== null) {
      filtered = filtered.filter((item) => {
        if (!item.isBackend || !item.project) return selectedFolder === '';
        const projectFolder = item.project.folder || '';
        return selectedFolder === '' ? !projectFolder : projectFolder === selectedFolder;
      });
    }
    
    // Tag filter
    if (selectedTag !== null) {
      filtered = filtered.filter((item) => {
        if (!item.isBackend || !item.project) return false;
        return item.project.tags?.includes(selectedTag) || false;
      });
    }
    
    return filtered;
  }, [allProjects, searchQuery, selectedFolder, selectedTag]);

  const dashboardBlocks: BlockSchema[] = [
    {
      id: 'dashboard-hero',
      type: 'dashboard-hero',
      props: {
        title: 'Projects',
        description: 'Every draft, outline, and synced project lives here.',
        primary: {
          label: 'New project',
          onClick: () => setShowWizard(true)
        }
      }
    }
  ];

  if (allProjects.length > 0) {
    dashboardBlocks.push({
      id: 'dashboard-search',
      type: 'search-bar',
      props: {
        value: searchQuery,
        onChange: (value: string) => setSearchQuery(value),
        placeholder: 'Search projects...'
      }
    });
    
    // Add folder and tag filters if available
    if (folders.length > 0 || tags.length > 0) {
      dashboardBlocks.push({
        id: 'dashboard-filters',
        type: 'project-filters',
        props: {
          folders,
          tags,
          selectedFolder,
          selectedTag,
          onFolderChange: (folder: string | null) => setSelectedFolder(folder),
          onTagChange: (tag: string | null) => setSelectedTag(tag)
        }
      });
    }
  }

  const projectItems = filteredProjects
    .filter((item) => !archivedProjects.has(item.id))
    .map((item) => {
      if (item.isBackend && item.project) {
        return {
          kind: 'backend' as const,
          key: item.id,
          project: item.project,
          onDelete: () => handleDelete(item),
          onRename: (_id: string, newTitle: string) => handleRename(item, newTitle),
          onOpen: () => handleLoad(item),
          onArchive: () => handleArchive(item),
          onExportMarkdown: () => handleExportMarkdown(item),
          onExportPdf: () => handleExportPdf(item),
          onUpdateFolder: (_projectId: string, folder: string | undefined) => handleUpdateFolder(item, folder),
          onUpdateTags: (_projectId: string, tags: string[]) => handleUpdateTags(item, tags),
          availableFolders: folders,
          isArchived: archivedProjects.has(item.id)
        };
      }

    const pageCount = Math.ceil(item.wordCount / 250);
    return {
      kind: 'snapshot' as const,
      key: item.id,
      title: item.title,
      updatedAt: item.updatedAt,
      pageCount,
      wordCount: item.wordCount,
      onOpen: () => handleLoad(item),
      onExportMarkdown: () => handleExportMarkdown(item),
      onExportPdf: () => handleExportPdf(item),
      onDelete: () => handleDelete(item),
      onRename: (newTitle: string) => {
        if (!item.isBackend && item.snapshot) {
          handleRename(item, newTitle);
        }
      },
      onArchive: () => handleArchive(item)
    };
  });

  const projectGridBlock: BlockSchema | null = projectItems.length
    ? {
        id: 'dashboard-projects',
        type: 'project-grid',
        props: { items: projectItems }
      }
    : null;

  const emptyStateBlock: BlockSchema = {
    id: 'dashboard-empty',
    type: 'empty-state',
    props: {
      title: allProjects.length === 0 ? 'No projects yet' : 'No projects found',
      description:
        allProjects.length === 0
          ? 'Start a new project to see it appear here.'
          : 'Try a different search or create a new project.',
      primary: {
        label: 'Create project',
        onClick: () => navigate('/generator')
      }
    }
  };

  const handleLoad = async (item: CombinedProject) => {
    if (item.isBackend && item.project) {
      // Load from backend project
      setCurrentProject(item.project);
      navigate(`/generator?project=${item.project.id}`);
    } else if (!item.isBackend && item.snapshot) {
      // Load from local storage
      sessionStorage.setItem('importedContent', JSON.stringify({
        text: item.snapshot.content,
        title: item.snapshot.label,
        chapters: item.snapshot.chapters
      }));
      navigate('/generator?entry=import&mode=draft&imported=true');
    }
  };

  const handleDelete = async (item: CombinedProject) => {
    if (item.isBackend && isAuthenticated) {
      try {
        await deleteProject(item.id);
        setProjects(projects.filter((p) => p.id !== item.id));
      } catch (error) {
        console.error('Failed to delete project:', error);
      }
    } else if (!item.isBackend && item.snapshot) {
      const filtered = history.filter((snapshot) => snapshot.id !== item.id);
      setHistory(filtered);
      await setKeyValue(HISTORY_KEY, filtered);
    }
  };

  const handleRename = async (item: CombinedProject, newTitle: string) => {
    if (!newTitle.trim()) return;

    if (item.isBackend && isAuthenticated) {
      try {
        const updated = await updateProject(item.id, { title: newTitle.trim() });
        setProjects(projects.map((p) => (p.id === item.id ? updated : p)));
      } catch (error) {
        console.error('Failed to rename project:', error);
      }
    } else if (!item.isBackend && item.snapshot) {
      const updated = history.map((snapshot) =>
        snapshot.id === item.id ? { ...snapshot, label: newTitle.trim() } : snapshot
      );
      setHistory(updated);
      await setKeyValue(HISTORY_KEY, updated);
    }
  };

  const handleUpdateFolder = async (item: CombinedProject, folder: string | undefined) => {
    if (item.isBackend && isAuthenticated) {
      try {
        const updated = await updateProject(item.id, { folder: folder || undefined });
        setProjects(projects.map((p) => (p.id === item.id ? updated : p)));
      } catch (error) {
        console.error('Failed to update folder:', error);
      }
    }
  };

  const handleUpdateTags = async (item: CombinedProject, tags: string[]) => {
    if (item.isBackend && isAuthenticated) {
      try {
        const updated = await updateProject(item.id, { tags: tags.length > 0 ? tags : undefined });
        setProjects(projects.map((p) => (p.id === item.id ? updated : p)));
      } catch (error) {
        console.error('Failed to update tags:', error);
      }
    }
  };

  const handleExportMarkdown = (item: CombinedProject) => {
    let title: string;
    let markdown: string;

    if (item.isBackend && item.project) {
      title = item.project.title;
      markdown = `# ${title}\n\n`;
      if (item.project.chapters && item.project.chapters.length > 0) {
        item.project.chapters.forEach((chapter) => {
          markdown += `## ${chapter.title}\n\n${chapter.content}\n\n`;
        });
      } else {
        markdown += item.project.content;
      }
    } else if (!item.isBackend && item.snapshot) {
      title = item.snapshot.label || item.snapshot.idea.slice(0, 50);
      markdown = `# ${title}\n\n`;
      if (item.snapshot.chapters && item.snapshot.chapters.length > 0) {
        item.snapshot.chapters.forEach((chapter: { title: string; content: string }) => {
          markdown += `## ${chapter.title}\n\n${chapter.content}\n\n`;
        });
      } else {
        markdown += item.snapshot.content;
      }
    } else {
      return;
    }

    const filename = buildFilenameBase(title);
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportPdf = (item: CombinedProject) => {
    let title: string;
    let content: string;

    if (item.isBackend && item.project) {
      title = item.project.title;
      if (item.project.chapters && item.project.chapters.length > 0) {
        content = item.project.chapters.map((ch) => `${ch.title}\n\n${ch.content}`).join('\n\n');
      } else {
        content = item.project.content;
      }
    } else if (!item.isBackend && item.snapshot) {
      title = item.snapshot.label || item.snapshot.idea.slice(0, 50);
      if (item.snapshot.chapters && item.snapshot.chapters.length > 0) {
        content = item.snapshot.chapters.map((ch) => `${ch.title}\n\n${ch.content}`).join('\n\n');
      } else {
        content = item.snapshot.content;
      }
    } else {
      return;
    }

    const filename = buildFilenameBase(title);
    const plainText = content
      .replace(/^#+\s*/gm, '')
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/`/g, '');

    const doc = new jsPDF({ unit: 'pt', format: 'letter' });
    doc.setFontSize(16);
    doc.text(title, 40, 40);
    
    const lines = doc.splitTextToSize(plainText, 520);
    let cursorY = 70;

    lines.forEach((line: string) => {
      if (cursorY > 760) {
        doc.addPage();
        cursorY = 60;
      }
      doc.setFontSize(11);
      doc.text(line, 40, cursorY);
      cursorY += 16;
    });

    doc.save(`${filename}.pdf`);
  };

  const handleArchive = (item: CombinedProject) => {
    const newArchived = new Set(archivedProjects);
    if (newArchived.has(item.id)) {
      newArchived.delete(item.id);
    } else {
      newArchived.add(item.id);
    }
    setArchivedProjects(newArchived);
    // Persist archived state
    if (isAuthenticated) {
      // TODO: Save to backend
    } else {
      // Save to localStorage
      const archivedIds = Array.from(newArchived);
      localStorage.setItem('archived-projects', JSON.stringify(archivedIds));
    }
  };

  const handleCreateProject = async (data: {
    title: string;
    genre: string;
    length: number;
    language: string;
    idea?: string;
  }) => {
    console.log('[Dashboard] handleCreateProject called with:', data);
    console.log('[Dashboard] isAuthenticated:', isAuthenticated);
    
    if (isAuthenticated) {
      try {
        console.log('[Dashboard] Calling createProject API...');
        const newProject = await createProject(data);
        console.log('[Dashboard] Project created successfully:', newProject);
        
        // 更新本地状态 - 确保项目列表包含新项目
        setCurrentProject(newProject);
        
        // 刷新项目列表以确保新项目显示
        try {
          const backendProjects = await getProjects();
          console.log('[Dashboard] Refreshed projects after creation:', backendProjects.length);
          setProjects(backendProjects);
        } catch (error) {
          console.error('[Dashboard] Failed to refresh projects:', error);
          // 如果刷新失败，至少添加到当前列表
          const updatedProjects = [...projects, newProject];
          console.log('[Dashboard] Added project to local list:', updatedProjects.length);
          setProjects(updatedProjects);
        }
        
        // 跳转时携带 new=true 参数和 idea（如果提供）
        const params = new URLSearchParams({
          project: newProject.id,
          new: 'true'
        });
        if (data.idea) {
          params.set('idea', data.idea);
        }
        
        const generatorUrl = `/generator?${params.toString()}`;
        console.log('[Dashboard] Navigating to:', generatorUrl);
        navigate(generatorUrl);
      } catch (error) {
        console.error('[Dashboard] Failed to create project:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        alert(`项目创建失败: ${errorMessage}。请检查控制台获取详细信息。`);
        throw error; // Re-throw to let ProjectCreationWizard handle it
      }
    } else {
      // 如果未登录，保存数据并显示登录模态框
      console.log('[Dashboard] User not authenticated, showing login modal');
      setPendingProjectData(data);
      setShowLoginModal(true);
    }
  };

  // 登录成功后的处理函数
  const handleLoginSuccess = async () => {
    setShowLoginModal(false);
    
    // 如果有待创建的项目数据，登录后自动创建
    if (pendingProjectData) {
      const data = pendingProjectData;
      setPendingProjectData(null);
      
      try {
        console.log('[Dashboard] Creating project after login:', data);
        const newProject = await createProject(data);
        setCurrentProject(newProject);
        
        // 刷新项目列表
        try {
          const backendProjects = await getProjects();
          setProjects(backendProjects);
        } catch (error) {
          console.error('[Dashboard] Failed to refresh projects after login:', error);
          setProjects([...projects, newProject]);
        }
        
        // 跳转到 Generator
        const params = new URLSearchParams({
          project: newProject.id,
          new: 'true'
        });
        if (data.idea) {
          params.set('idea', data.idea);
        }
        navigate(`/generator?${params.toString()}`);
      } catch (error) {
        console.error('[Dashboard] Failed to create project after login:', error);
        alert(`项目创建失败: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  };

  // Load archived projects on mount
  useEffect(() => {
    if (isAuthenticated) {
      // TODO: Load from backend
    } else {
      const stored = localStorage.getItem('archived-projects');
      if (stored) {
        try {
          const archivedIds = JSON.parse(stored);
          setArchivedProjects(new Set(archivedIds));
        } catch (error) {
          console.error('Failed to load archived projects:', error);
        }
      }
    }
  }, [isAuthenticated]);

  return (
    <div className="min-h-screen py-12">
      <SEO
        title="Dashboard - Your Projects | Scribely"
        description="Manage your AI-generated novels and projects with Scribely. View, edit, and organize all your writing projects in one place."
        keywords="novel ai dashboard, writing projects, ai novel management, project dashboard"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          name: 'Dashboard - Scribely',
          description: 'Manage your AI-generated novels and projects with Scribely, your novel ai workspace',
          url: 'https://scribelydesigns.top/dashboard'
        }}
      />
      <div className="max-w-6xl mx-auto px-4">
        {/* Migration progress indicator */}
        {migrationStatus?.inProgress && (
          <div className="mb-6 rounded-2xl border border-indigo-200 bg-indigo-50 p-4">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                <svg className="w-5 h-5 text-indigo-600 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-indigo-900">Migrating your projects...</p>
                {migrationStatus.current && (
                  <p className="text-xs text-indigo-700 mt-1">{migrationStatus.current}</p>
                )}
                {migrationStatus.total > 0 && (
                  <div className="mt-2">
                    <div className="h-2 bg-indigo-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-600 transition-all"
                        style={{ width: `${(migrationStatus.completed / migrationStatus.total) * 100}%` }}
                      />
                    </div>
                    <p className="text-xs text-indigo-600 mt-1">
                      {migrationStatus.completed} / {migrationStatus.total} projects
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <WorkspaceView
          blocks={allProjects.length > 0 ? dashboardBlocks : [dashboardBlocks[0]]}
          className="space-y-8 mb-12"
        />

        {loading ? (
          <GlassCard className="p-16 text-center">
            <p className="text-slate-400 text-sm">Loading projects...</p>
          </GlassCard>
        ) : projectGridBlock ? (
          <WorkspaceView blocks={[projectGridBlock]} className="space-y-8" />
        ) : (
          <WorkspaceView blocks={[emptyStateBlock]} className="space-y-8" />
        )}

        {/* Writing Analytics Panel - Only show for Pro/Unlimited users */}
        {isAuthenticated && hasFeature('analytics') && (
          <div className="mt-12">
            <WritingAnalyticsPanel />
          </div>
        )}

        {/* Upsell for analytics + version history */}
        {isAuthenticated && (!hasFeature('analytics') || !hasFeature('versionHistory')) && (
          <GlassCard className="mt-12 p-6 border border-slate-200">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Pro workspace</p>
                <h3 className="text-xl font-semibold text-slate-900">Track every draft and unlock deep insights</h3>
                <ul className="mt-3 text-sm text-slate-600 space-y-1.5">
                  {!hasFeature('versionHistory') && (
                    <li>• Version history & branching — restore any snapshot, compare scenes, merge drafts.</li>
                  )}
                  {!hasFeature('analytics') && (
                    <li>• Writing analytics — monitor word count trends, genre workload, and monthly usage.</li>
                  )}
                  <li>• Priority export & backup — keep manuscripts synced across devices.</li>
                </ul>
              </div>
              <UpgradePrompt
                currentTier={(tier as any) ?? 'free'}
                requiredTier={!hasFeature('analytics') ? 'pro' : 'starter'}
                featureName={!hasFeature('analytics') ? 'Writing Analytics' : 'Version History'}
                variant="banner"
              />
            </div>
          </GlassCard>
        )}
      </div>

      <ProjectCreationWizard
        isOpen={showWizard}
        onClose={() => setShowWizard(false)}
        onCreate={handleCreateProject}
      />
      
      <LoginModal
        open={showLoginModal}
        onClose={() => {
          setShowLoginModal(false);
          setPendingProjectData(null);
        }}
        onSuccess={handleLoginSuccess}
      />
    </div>
  );
}
