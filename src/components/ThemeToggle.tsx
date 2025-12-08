import { useState, useEffect } from 'react';

const ThemeToggle = () => {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    // 从localStorage获取主题，默认使用浅色主题
    const savedTheme = localStorage.getItem('theme');
    return (savedTheme as 'light' | 'dark') || 'light';
  });

  // 切换主题
  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    updateTheme(newTheme);
  };

  // 更新主题的CSS变量
  const updateTheme = (currentTheme: 'light' | 'dark') => {
    document.documentElement.setAttribute('data-theme', currentTheme);
    
    // 更新CSS变量
    const root = document.documentElement;
    if (currentTheme === 'dark') {
      root.style.setProperty('--bg-page', '#0f172a');
      root.style.setProperty('--bg-card', 'rgba(30, 41, 59, 0.85)');
      root.style.setProperty('--border-card', 'rgba(51, 65, 85, 0.6)');
      root.style.setProperty('--text-primary', '#f1f5f9');
      root.style.setProperty('--text-secondary', '#cbd5e1');
      root.style.setProperty('--accent', '#f1f5f9');
      root.style.setProperty('--shadow-soft', '0 24px 60px rgba(0, 0, 0, 0.3)');
    } else {
      root.style.setProperty('--bg-page', '#f5f7fb');
      root.style.setProperty('--bg-card', 'rgba(255, 255, 255, 0.85)');
      root.style.setProperty('--border-card', 'rgba(226, 232, 240, 0.6)');
      root.style.setProperty('--text-primary', '#0f172a');
      root.style.setProperty('--text-secondary', '#475569');
      root.style.setProperty('--accent', '#111827');
      root.style.setProperty('--shadow-soft', '0 24px 60px rgba(15, 23, 42, 0.08)');
    }
  };

  // 初始化主题
  useEffect(() => {
    updateTheme(theme);
  }, [theme]);

  return (
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
  );
};

export default ThemeToggle;