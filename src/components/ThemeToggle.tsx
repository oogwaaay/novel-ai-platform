import { useState, useEffect } from 'react';

type Theme = 'light' | 'dark';
type ViewMode = 'normal' | 'reading';

const ThemeToggle = () => {
  const [theme, setTheme] = useState<Theme>(() => {
    // 从localStorage获取主题，默认使用浅色主题
    const savedTheme = localStorage.getItem('theme');
    return (savedTheme as Theme) || 'light';
  });

  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    // 从localStorage获取视图模式，默认使用普通模式
    const savedMode = localStorage.getItem('viewMode');
    return (savedMode as ViewMode) || 'normal';
  });

  // 切换主题
  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeAndViewMode(newTheme, viewMode);
  };

  // 切换视图模式（普通/阅读）
  const toggleViewMode = () => {
    const newMode = viewMode === 'normal' ? 'reading' : 'normal';
    setViewMode(newMode);
    localStorage.setItem('viewMode', newMode);
    updateThemeAndViewMode(theme, newMode);
  };

  // 更新主题和视图模式
  const updateThemeAndViewMode = (currentTheme: Theme, currentViewMode: ViewMode) => {
    document.documentElement.setAttribute('data-theme', currentTheme);
    document.documentElement.setAttribute('data-view-mode', currentViewMode);
    
    // 使用Tailwind的dark:类，不再需要手动更新CSS变量
    if (currentTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    // Reading mode variables (保留阅读模式的特殊处理)
    const root = document.documentElement;
    if (currentViewMode === 'reading') {
      // Increase line height and font size for better readability
      root.style.setProperty('--line-height', '1.8');
      root.style.setProperty('--font-size', '16px');
    } else {
      // Reset to normal mode variables
      root.style.removeProperty('--line-height');
      root.style.removeProperty('--font-size');
    }
  };

  // 初始化主题和视图模式
  useEffect(() => {
    updateThemeAndViewMode(theme, viewMode);
  }, [theme, viewMode]);

  return (
    <div className="flex items-center gap-2">
      {/* Theme Toggle */}
      <button
        onClick={toggleTheme}
        className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors duration-200"
        aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      >
        {theme === 'light' ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </button>
      
      {/* Reading Mode Toggle */}
      <button
        onClick={toggleViewMode}
        className={`p-2 rounded-full transition-colors duration-200 ${viewMode === 'reading' ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200' : 'hover:bg-slate-100 dark:hover:bg-slate-700'}`}
        aria-label={`Switch to ${viewMode === 'normal' ? 'reading' : 'normal'} mode`}
      >
        {viewMode === 'normal' ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </button>
    </div>
  );
};

export default ThemeToggle;