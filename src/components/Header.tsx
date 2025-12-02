import { Link, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import UserMenu from './UserMenu';
import LoginModal from './LoginModal';

const navLinks = [
  { to: '/generator', label: 'Generator' },
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/pricing', label: 'Pricing' },
  { to: '/help', label: 'Help' },
  { to: '/resources', label: 'Resources' }
];

export default function Header() {
  const location = useLocation();
  const { isAuthenticated } = useAuthStore();
  const [showLoginModal, setShowLoginModal] = useState(false);

  return (
    <>
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <nav className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-10">
            <Link to="/" className="flex items-center gap-2">
              {/* 可见的新品牌 Logo 图片 */}
              <img
                src="/brand1090.png"
                alt="Scribely – novel ai-powered writing workspace"
                className="h-16 w-auto"
              />
              {/* 仅供搜索引擎和读屏软件使用的关键词文本（无障碍友好） */}
              <span className="sr-only">
                Scribely – novel ai novel generator · AI-powered writing workspace
              </span>
            </Link>
            <div className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
              {navLinks.map((link) => {
                const isActive = location.pathname === link.to;
                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={`transition hover:text-slate-900 ${
                      isActive ? 'text-slate-900' : ''
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </div>
          </div>
          <div className="flex items-center gap-3">
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
                  className="px-4 py-2 text-sm font-semibold text-white bg-slate-900 rounded-xl hover:bg-slate-800 transition"
                >
                  Start for free
                </button>
              </>
            )}
          </div>
        </nav>
      </header>
      <LoginModal
        open={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onSuccess={() => setShowLoginModal(false)}
      />
    </>
  );
}

