import React, { useState } from 'react';
import { X, Lock, Mail, User, Shield, AlertCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'login' | 'register';
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, defaultTab = 'login' }) => {
  const { login, register } = useAuth();
  const [tab, setTab] = useState<'login' | 'register'>(defaultTab);

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      if (tab === 'login') {
        await login({ email, password });
      } else {
        if (!name.trim()) {
          throw new Error('Name is required');
        }
        await register({
          name: name.trim(),
          email: email.trim(),
          password,
          username: username.trim() || undefined,
        });
      }
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Authentication failed';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-surface-raised border border-surface-border-strong shadow-card rounded-none p-6 sm:p-8 animate-scale-up relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-ink-dim hover:text-ink transition-colors p-1"
          aria-label="Close dialog"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="h-6 w-6 corner-ticks flex items-center justify-center text-primary" aria-hidden="true">
              <Shield className="h-3.5 w-3.5" />
            </span>
            <span className="font-mono text-xs uppercase tracking-widest text-ink-dim">TrustGraph Passport</span>
          </div>
          <h2 id="auth-modal-title" className="text-xl font-bold text-ink tracking-tight">
            {tab === 'login' ? 'Sign In to Developer Account' : 'Register Developer Identity'}
          </h2>
          <p className="text-xs text-ink-muted mt-1">
            {tab === 'login'
              ? 'Access your submissions, passports, and verifier dashboard.'
              : 'Create your off-chain profile and bind cryptographic evidence.'}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-surface-border mb-6">
          <button
            type="button"
            onClick={() => {
              setTab('login');
              setError(null);
            }}
            className={`pb-2.5 px-4 text-xs font-mono uppercase tracking-wider transition-colors relative ${
              tab === 'login' ? 'text-primary-bright font-semibold' : 'text-ink-dim hover:text-ink-muted'
            }`}
          >
            Sign In
            {tab === 'login' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('register');
              setError(null);
            }}
            className={`pb-2.5 px-4 text-xs font-mono uppercase tracking-wider transition-colors relative ${
              tab === 'register' ? 'text-primary-bright font-semibold' : 'text-ink-dim hover:text-ink-muted'
            }`}
          >
            Register
            {tab === 'register' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div
            role="alert"
            className="mb-4 p-3 bg-rose-950/30 border border-rose-500/40 text-rose-300 text-xs flex items-start gap-2 animate-fade-in"
          >
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-400" />
            <span className="break-words">{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {tab === 'register' && (
            <>
              <div>
                <label className="block text-xs font-mono text-ink-dim uppercase tracking-wider mb-1.5">
                  Full Name *
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-4 w-4 text-ink-dim" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Satoshi Nakamoto"
                    className="w-full bg-surface-subtle border border-surface-border pl-9 pr-3 py-2 text-xs text-ink placeholder-ink-dim focus:outline-none focus:border-primary transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-ink-dim uppercase tracking-wider mb-1.5">
                  Username (Optional)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs text-ink-dim font-mono">@</span>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="satoshi"
                    className="w-full bg-surface-subtle border border-surface-border pl-8 pr-3 py-2 text-xs text-ink placeholder-ink-dim focus:outline-none focus:border-primary transition-colors font-mono"
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-mono text-ink-dim uppercase tracking-wider mb-1.5">
              Email Address *
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 h-4 w-4 text-ink-dim" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="dev@example.com"
                className="w-full bg-surface-subtle border border-surface-border pl-9 pr-3 py-2 text-xs text-ink placeholder-ink-dim focus:outline-none focus:border-primary transition-colors font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono text-ink-dim uppercase tracking-wider mb-1.5">
              Password *
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 h-4 w-4 text-ink-dim" />
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="w-full bg-surface-subtle border border-surface-border pl-9 pr-3 py-2 text-xs text-ink placeholder-ink-dim focus:outline-none focus:border-primary transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-6 py-2.5 px-4 bg-primary hover:bg-primary-bright text-background font-medium text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <span>{isSubmitting ? 'Processing…' : tab === 'login' ? 'Sign In' : 'Create Account'}</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-surface-border text-center text-[11px] text-ink-dim">
          <span>Protected by JWT HttpOnly Cookies · MongoDB Persistence</span>
        </div>
      </div>
    </div>
  );
};
