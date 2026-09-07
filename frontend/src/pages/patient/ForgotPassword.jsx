import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, ShieldAlert } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { forgotPassword } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await forgotPassword(email.trim().toLowerCase());
      navigate(`/reset-password?email=${encodeURIComponent(email.trim().toLowerCase())}`);
    } catch (err) {
      setError(err.message || 'Failed to request password reset code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-6 lg:p-8 text-slate-800 antialiased font-sans">
      <main className="w-full max-w-md bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        
        {/* TopBar */}
        <header className="px-6 sm:px-8 pt-8 pb-3 flex items-center justify-between">
          <Link
            to="/signin"
            className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 hover:bg-slate-200 transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-teal-700 flex items-center justify-center text-white font-bold text-xs shadow-xs">
              Rx
            </div>
            <span className="text-base font-bold tracking-tight text-slate-900">Telemed</span>
          </div>
          <div className="w-9" />
        </header>

        {/* Content */}
        <section className="px-6 sm:px-8 py-5">
          <div className="flex justify-center my-3">
            <div className="w-16 h-16 rounded-2xl bg-teal-50 flex items-center justify-center border border-teal-100 text-teal-700 shadow-xs">
              <ShieldAlert className="w-8 h-8" />
            </div>
          </div>

          <div className="text-center mb-6">
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight mb-1.5">Forgot Password?</h1>
            <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
              Enter your registered email address and we will dispatch a 6-digit OTP verification code to reset your password.
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Registered Email Address
              </label>
              <div className="relative rounded-2xl shadow-subtle group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-teal-700 transition">
                  <Mail className="w-5 h-5" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-700/20 font-medium"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !email}
              className="w-full h-12 bg-teal-700 hover:bg-teal-800 disabled:opacity-50 text-white font-bold text-xs tracking-wide rounded-xl shadow-sm transition flex items-center justify-center mt-2 cursor-pointer"
            >
              {loading ? 'Sending Code...' : 'Send Reset Code'}
            </button>
          </form>
        </section>

        {/* Footer */}
        <footer className="py-4 px-6 text-center text-xs text-slate-500 border-t border-slate-100 bg-slate-50/50">
          Remember your password?{' '}
          <Link to="/signin" className="text-teal-700 font-bold hover:underline">
            Back to Sign In
          </Link>
        </footer>
      </main>
    </div>
  );
};
