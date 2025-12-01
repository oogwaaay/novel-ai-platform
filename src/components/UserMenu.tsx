import { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { logout } from '../api/authApi';
import { useNavigate } from 'react-router-dom';

export default function UserMenu() {
  const { user, isAuthenticated } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleLogout = async () => {
    await logout();
    setIsOpen(false);
    navigate('/');
  };

  if (!isAuthenticated || !user) {
    return null;
  }

  const initials = user.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : user.email[0].toUpperCase();

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-full border border-slate-200 p-1.5 hover:bg-slate-50 transition"
        aria-label="User menu"
      >
        {user.avatar ? (
          <img src={user.avatar} alt={user.name || user.email} className="w-8 h-8 rounded-full" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-slate-900 text-white text-xs font-semibold flex items-center justify-center">
            {initials}
          </div>
        )}
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-56 rounded-2xl border border-slate-200 bg-white shadow-lg z-50">
          <div className="p-3 border-b border-slate-100">
            <p className="text-sm font-semibold text-slate-900">{user.name || 'User'}</p>
            <p className="text-xs text-slate-500 mt-0.5">{user.email}</p>
          </div>
          <div className="p-1">
            <button
              onClick={() => {
                navigate('/dashboard');
                setIsOpen(false);
              }}
              className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-lg transition"
            >
              Dashboard
            </button>
            <button
              onClick={() => {
                navigate('/generator');
                setIsOpen(false);
              }}
              className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-lg transition"
            >
              Generator
            </button>
            <button
              onClick={() => {
                navigate('/pricing');
                setIsOpen(false);
              }}
              className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-lg transition"
            >
              Subscription
            </button>
            <div className="h-px bg-slate-100 my-1" />
            <button
              onClick={handleLogout}
              className="w-full text-left px-3 py-2 text-sm text-rose-600 hover:bg-rose-50 rounded-lg transition"
            >
              Log out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}




