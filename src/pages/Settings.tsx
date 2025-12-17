import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { fetchCurrentUser } from '../api/authApi';
import { SEO } from '../components/SEO';
import PointsHistory from '../components/PointsHistory';

export default function Settings() {
  const { user, setUser, token } = useAuthStore();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    avatar: user?.avatar || ''
  });

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        avatar: user.avatar || ''
      });
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    try {
      // Always include /api prefix for user requests
      const API_BASE_URL = `${(import.meta.env.VITE_API_URL as string | undefined) || ''}/api`;
      const response = await fetch(`${API_BASE_URL}/user/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: formData.name,
          avatar: formData.avatar
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update profile');
      }

      // 刷新用户信息
      const updatedUser = await fetchCurrentUser();
      if (updatedUser) {
        setUser(updatedUser);
      }

      setMessage({ type: 'success', text: 'Profile updated successfully' });
    } catch (error: any) {
      console.error('Failed to update profile:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to update profile' });
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <p className="text-slate-600">Please log in to access settings.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <SEO
        title="Account Settings - Scribely"
        description="Manage your account settings, profile information, and preferences on Scribely."
        keywords="account settings, profile, scribely"
        image="https://scribelydesigns.top/brand1090.png"
      />
      <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-8">Account Settings</h1>

      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-6">Profile Information</h2>

        {message && (
          <div
            className={`mb-4 p-3 rounded-lg ${
              message.type === 'success'
                ? 'bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-400 border border-green-200 dark:border-green-800'
                : 'bg-rose-50 dark:bg-rose-900/30 text-rose-800 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
            }`}
          >
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-slate-700 dark:text-white mb-2">
              Name
            </label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent dark:focus:ring-slate-500"
              placeholder="Your name"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-white mb-2">
              Email
            </label>
            <input
              type="email"
              id="email"
              value={formData.email}
              disabled
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-400 cursor-not-allowed rounded-xl bg-slate-50"
            />
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Email cannot be changed</p>
          </div>

          <div>
            <label htmlFor="avatar" className="block text-sm font-medium text-slate-700 dark:text-white mb-2">
              Avatar URL
            </label>
            <input
              type="url"
              id="avatar"
              value={formData.avatar}
              onChange={(e) => setFormData({ ...formData, avatar: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent dark:focus:ring-slate-500"
              placeholder="https://example.com/avatar.jpg"
            />
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Enter a URL to your avatar image</p>
            {formData.avatar && (
              <div className="mt-3">
                <img
                  src={formData.avatar}
                  alt="Avatar preview"
                  className="w-16 h-16 rounded-full border border-slate-200 dark:border-slate-600"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            )}
          </div>

          <div className="flex items-center gap-4 pt-4">
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-2.5 bg-slate-900 dark:bg-slate-700 text-white rounded-xl font-medium hover:bg-slate-800 dark:hover:bg-slate-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              type="button"
              onClick={() => {
                // Cancel: leave settings page and go back to dashboard
                navigate('/dashboard');
              }}
              className="px-6 py-2.5 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-white rounded-xl font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>

      <div className="mt-8 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">Account Information</h2>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-600 dark:text-slate-400">Account Created</span>
            <span className="text-slate-900 dark:text-white font-medium">
              {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600 dark:text-slate-400">Last Login</span>
            <span className="text-slate-900 dark:text-white font-medium">
              {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : 'N/A'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600 dark:text-slate-400">Subscription</span>
            <span className="text-slate-900 dark:text-white font-medium capitalize">
              {user.subscription?.tier || 'Free'}
            </span>
          </div>
        </div>
      </div>

      {/* Points History Section */}
      <div className="mt-8">
        <PointsHistory />
      </div>
    </div>
  );
}

