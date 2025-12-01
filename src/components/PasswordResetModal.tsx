import { useState, useEffect } from 'react';
import { forgotPassword, resetPassword, type ForgotPasswordRequest, type ResetPasswordRequest } from '../api/authApi';
import { useSearchParams } from 'react-router-dom';

interface PasswordResetModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function PasswordResetModal({ open, onClose, onSuccess }: PasswordResetModalProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [mode, setMode] = useState<'forgot' | 'reset'>(token ? 'reset' : 'forgot');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Check for token in URL on mount
  useEffect(() => {
    if (token) {
      setMode('reset');
    }
  }, [token]);

  if (!open) return null;

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await forgotPassword({ email });
      setSuccess('If an account exists with this email, a password reset link has been sent. Please check your email.');
      setEmail('');
    } catch (err: any) {
      setError(err.message || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    if (!token) {
      setError('Reset token is required');
      setLoading(false);
      return;
    }

    try {
      await resetPassword({ token, password });
      setSuccess('Password reset successfully! You can now log in with your new password.');
      setPassword('');
      setConfirmPassword('');
      // Clear token from URL
      setSearchParams({});
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-xl font-semibold text-slate-900">
            {mode === 'forgot' ? 'Reset Password' : 'Set New Password'}
          </h2>
          <button
            onClick={onClose}
            className="rounded-full border border-slate-200 p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-50"
            aria-label="Close"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form
          onSubmit={mode === 'forgot' ? handleForgotPassword : handleResetPassword}
          className="p-6 space-y-4"
        >
          {error && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
              {error}
            </div>
          )}

          {success && (
            <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-600">
              {success}
            </div>
          )}

          {mode === 'forgot' ? (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  placeholder="you@example.com"
                />
              </div>
              <p className="text-xs text-slate-500">
                Enter your email address and we'll send you a link to reset your password.
              </p>
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed transition"
              >
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    setMode('reset');
                    setError(null);
                    setSuccess(null);
                  }}
                  className="text-sm text-slate-600 hover:text-slate-900"
                >
                  Already have a reset token? Enter it here
                </button>
              </div>
            </>
          ) : (
            <>
              {!token && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Reset Token</label>
                  <input
                    type="text"
                    onChange={(e) => {
                      const newToken = e.target.value;
                      if (newToken) {
                        setSearchParams({ token: newToken });
                      } else {
                        setSearchParams({});
                      }
                    }}
                    required
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200"
                    placeholder="Enter reset token from email"
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">New Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  placeholder="••••••••"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  placeholder="••••••••"
                />
              </div>
              <button
                type="submit"
                disabled={loading || (mode === 'reset' && !token)}
                className="w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed transition"
              >
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    setMode('forgot');
                    setError(null);
                    setSuccess(null);
                    setSearchParams({});
                  }}
                  className="text-sm text-slate-600 hover:text-slate-900"
                >
                  Need a reset link? Request one here
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
}

