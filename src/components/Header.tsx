import { Link, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import UserMenu from './UserMenu';
import LoginModal from './LoginModal';
import ThemeToggle from './ThemeToggle';
import PointsDisplay from './PointsDisplay';

const navLinks = [
  { to: '/generator', label: 'Generator' },
  { to: '/ai-prompt-generator', label: 'AI Tools' },
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/pricing', label: 'Pricing' },
  { to: '/help', label: 'Help' },
  { to: '/resources', label: 'Resources' }
];

export default function Header() {
  const location = useLocation();
  const { isAuthenticated } = useAuthStore();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  return (
    <>
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-20">
        <nav className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-10">
            <Link to="/" className="flex items-center gap-2">
              {/* 可见的新品牌 Logo 图片 */}
              <img
                src="/brand1090.png"
                alt="Scribely – novel ai-powered writing workspace"
                className="h-16 w-auto sm:h-12"
              />
              {/* 仅供搜索引擎和读屏软件使用的关键词文本（无障碍友好） */}
              <span className="sr-only">
                Scribely – novel ai novel generator · AI-powered writing workspace
              </span>
            </Link>
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-200">
              {navLinks.map((link) => {
                const isActive = location.pathname === link.to;
                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={`transition hover:text-slate-900 dark:hover:text-white ${isActive ? 'text-slate-900 dark:text-white' : ''}`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Theme Toggle */}
            <ThemeToggle />
            
            {/* Points Display */}
            {isAuthenticated && <PointsDisplay />}
            
            {/* Mobile Menu Button */}
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="md:hidden p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              aria-label="Toggle menu"
            >
              <svg 
                className="w-6 h-6" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                {showMobileMenu ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
            
            {/* Desktop Auth Buttons */}
            {isAuthenticated ? (
              <UserMenu />
            ) : (
              <>
                <button
                  onClick={() => setShowLoginModal(true)}
                  className="hidden md:inline-flex px-4 py-2 text-sm font-medium border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-100 transition"
                >
                  Log in
                </button>
                <button
                  onClick={() => setShowLoginModal(true)}
                  className="hidden md:inline-flex px-4 py-2 text-sm font-semibold text-white bg-slate-900 rounded-xl hover:bg-slate-800 transition"
                >
                  Start for free
                </button>
              </>
            )}
          </div>
        </nav>
        
        {/* Mobile Navigation Menu */}
        {showMobileMenu && (
          <div className="md:hidden bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700">
            <div className="max-w-6xl mx-auto px-4 py-4 space-y-4">
              {/* Mobile Navigation Links */}
              <div className="flex flex-col space-y-3">
                {navLinks.map((link) => {
                  const isActive = location.pathname === link.to;
                  return (
                    <Link
                      key={link.to}
                      to={link.to}
                      onClick={() => setShowMobileMenu(false)}
                      className={`block py-3 px-4 rounded-lg transition ${isActive ? 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                    >
                      {link.label}
                    </Link>
                  );
                })}
              </div>
              
              {/* Mobile Auth Buttons */}
              {!isAuthenticated && (
                <div className="flex flex-col space-y-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                  <button
                    onClick={() => {
                      setShowLoginModal(true);
                      setShowMobileMenu(false);
                    }}
                    className="w-full py-3 px-4 text-sm font-medium border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-100 transition"
                  >
                    Log in
                  </button>
                  <button
                    onClick={() => {
                      setShowLoginModal(true);
                      setShowMobileMenu(false);
                    }}
                    className="w-full py-3 px-4 text-sm font-semibold text-white bg-slate-900 rounded-xl hover:bg-slate-800 transition"
                  >
                    Start for free
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </header>
      <LoginModal
        open={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onSuccess={() => setShowLoginModal(false)}
      />
    </>
  );
}

