import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, ArrowRight, ShieldCheck, UserPlus, LogIn } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const SignIn = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(identifier, password);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Failed to sign in. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-6 lg:p-8 font-sans antialiased text-slate-800">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        
        {/* Header with Brand Logo */}
        <header className="pt-8 pb-3 px-6 sm:px-8 text-center">
          <div className="flex flex-col items-center justify-center space-y-1">
            <div className="w-40 h-12 flex items-center justify-center">
              <img src="/logo.svg" alt="Telemed Logo" className="h-10 w-auto object-contain" />
            </div>
            <p className="text-xs font-semibold tracking-wider uppercase text-teal-700/80">
              Telemedicine &amp; Healthcare Platform
            </p>
          </div>

          {/* Segmented Switcher Tabs */}
          <nav aria-label="Authentication modes" className="mt-6 p-1 bg-slate-100 rounded-2xl flex items-center">
            <button
              type="button"
              className="flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all duration-200 bg-white text-teal-800 shadow-xs flex items-center justify-center gap-1.5"
            >
              <LogIn className="w-4 h-4 text-teal-700" />
              <span>Sign In</span>
            </button>
            <Link
              to="/signup"
              className="flex-1 py-2.5 px-3 rounded-xl text-xs font-semibold transition-all duration-200 text-slate-600 hover:text-slate-900 flex items-center justify-center gap-1.5"
            >
              <UserPlus className="w-4 h-4 text-slate-400" />
              <span>Create Account</span>
            </Link>
          </nav>
        </header>

        {/* Main Form Content */}
        <main className="px-6 sm:px-8 pb-6 pt-2">
          <section className="mb-6">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Welcome Back</h1>
            <p className="mt-1 text-xs text-slate-500 font-normal leading-relaxed">
              Sign in to manage your consultations, prescriptions, and health records.
            </p>
          </section>

          {error && (
            <div className="mb-4 p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-medium leading-relaxed">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Field 1: Email or Phone */}
            <div>
              <label className="block text-xs font-bold text-slate-700 tracking-wide uppercase mb-1.5" htmlFor="user-identifier">
                Email Address or Phone Number
              </label>
              <div className="relative rounded-2xl shadow-subtle group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-teal-700 transition-colors">
                  <Mail className="w-5 h-5" />
                </div>
                <input
                  id="user-identifier"
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="block w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-700/20 font-medium transition-all"
                />
              </div>
            </div>

            {/* Field 2: Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700 tracking-wide uppercase" htmlFor="user-password">
                  Password
                </label>
              </div>
              <div className="relative rounded-2xl shadow-subtle group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-teal-700 transition-colors">
                  <Lock className="w-5 h-5" />
                </div>
                <input
                  id="user-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-11 pr-11 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-700/20 font-medium transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label="Toggle password visibility"
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none focus:text-teal-700 transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-5 h-5 text-teal-700" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Auxiliary Actions */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-teal-700 focus:ring-teal-700/30 transition duration-150"
                />
                <span className="text-xs font-semibold text-slate-600">Remember Me</span>
              </label>
              <Link
                to="/forgot-password"
                className="text-xs font-bold text-teal-700 hover:text-teal-800 focus:outline-none focus:underline transition-colors"
              >
                Forgot Password?
              </Link>
            </div>

            {/* Primary CTA */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 bg-teal-700 hover:bg-teal-800 active:scale-[0.99] text-white font-bold text-sm tracking-wide rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 focus:outline-none focus:ring-4 focus:ring-teal-700/30 disabled:opacity-70 cursor-pointer"
              >
                <span>{loading ? 'Signing in...' : 'Sign In'}</span>
                {!loading && <ArrowRight className="w-4 h-4 stroke-[2.5]" />}
              </button>
            </div>
          </form>

          {/* Access Info */}
          <div className="mt-6 p-4 rounded-2xl bg-teal-50/70 border border-teal-100 text-xs text-slate-600 space-y-1">
            <p className="font-bold text-teal-900">Hospital Portal Access:</p>
            <p>
              Doctors and Administrators can sign in directly at{' '}
              <Link to="/admin" className="text-teal-700 font-bold underline">
                /admin
              </Link>.
            </p>
            <p className="text-[11px] text-slate-500 pt-0.5">
              New patients can click <strong>Create Account</strong> above to register with email verification.
            </p>
          </div>
        </main>

        {/* Footer */}
        <footer className="py-4 px-6 sm:px-8 border-t border-slate-100 bg-slate-50/50 flex flex-col items-center justify-center text-center">
          <p className="text-xs text-slate-600 font-medium">
            Don't have an account?{' '}
            <Link to="/signup" className="font-bold text-teal-700 hover:text-teal-800 ml-1 underline-offset-2 hover:underline">
              Sign Up
            </Link>
          </p>
          
          <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
            <span>256-bit HIPAA compliant clinical encryption</span>
          </div>
        </footer>
      </div>
    </div>
  );
};
