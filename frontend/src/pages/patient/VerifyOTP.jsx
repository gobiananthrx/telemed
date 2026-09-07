import React, { useState, useRef, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const VerifyOTP = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { verifyOTP, resendOTP } = useAuth();

  const email = searchParams.get('email') || '';

  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [resendCooldown, setResendCooldown] = useState(60);
  const [resendMessage, setResendMessage] = useState(null);

  const inputRefs = useRef([]);

  // Countdown timer for resend
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;

    const newDigits = [...digits];
    newDigits[index] = value.slice(-1);
    setDigits(newDigits);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').trim();
    if (/^\d{6}$/.test(pasted)) {
      setDigits(pasted.split(''));
      inputRefs.current[5]?.focus();
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    const otpCode = digits.join('');
    if (otpCode.length !== 6) {
      setError('Please enter all 6 digits of your verification code.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      await verifyOTP(email, otpCode, 'REGISTRATION');
      navigate('/');
    } catch (err) {
      setError(err.message || 'Verification failed. Please check your code and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setError(null);
    setResendMessage(null);

    try {
      await resendOTP(email, 'REGISTRATION');
      setResendCooldown(60);
      setResendMessage('A new 6-digit verification code has been dispatched to your email.');
    } catch (err) {
      setError(err.message || 'Failed to resend verification code.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-6 lg:p-8 font-sans antialiased text-slate-800">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 sm:px-8 pt-8 pb-6">
          
          {/* Header */}
          <header className="flex items-center justify-between mb-6">
            <Link to="/signup" className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 transition">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-teal-700 flex items-center justify-center text-white font-bold text-xs shadow-xs">
                Rx
              </div>
              <span className="text-base font-bold text-slate-900 tracking-tight">Telemed</span>
            </div>
            <div className="w-9" />
          </header>

          {/* Title */}
          <section className="mb-6">
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Verify Your Email</h1>
            <p className="text-xs leading-relaxed text-slate-500 mt-2">
              Please enter the 6-digit verification code dispatched to{' '}
              <span className="font-semibold text-slate-800">{email || 'your registered email'}</span>.
            </p>
          </section>

          {error && (
            <div className="mb-4 p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {resendMessage && (
            <div className="mb-4 p-3.5 bg-teal-50 border border-teal-200 text-teal-800 rounded-xl text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
              <span>{resendMessage}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleVerify} className="space-y-6">
            <div className="space-y-3">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700">
                Enter 6-Digit Verification Code
              </label>

              {/* 6 Digit Inputs */}
              <div className="flex justify-between gap-2" onPaste={handlePaste}>
                {digits.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => (inputRefs.current[idx] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleChange(idx, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(idx, e)}
                    className={`w-12 h-14 text-center text-xl font-bold rounded-xl focus:outline-none transition-all ${
                      digit
                        ? 'bg-teal-50/50 text-teal-900 border-2 border-teal-700 shadow-xs'
                        : 'bg-white text-slate-900 border border-slate-200 focus:border-teal-700'
                    }`}
                  />
                ))}
              </div>

              {/* Resend Action */}
              <div className="text-center pt-2">
                <p className="text-xs text-slate-500">
                  Didn't receive the code?{' '}
                  {resendCooldown > 0 ? (
                    <span className="text-teal-700 font-semibold ml-1">
                      Resend in {resendCooldown}s
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResend}
                      className="text-teal-700 font-bold hover:underline ml-1 cursor-pointer"
                    >
                      Resend Code
                    </button>
                  )}
                </p>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || digits.join('').length !== 6}
              className="w-full bg-teal-700 hover:bg-teal-800 disabled:opacity-50 text-white font-bold py-3.5 px-4 rounded-xl shadow-sm text-xs tracking-wide transition active:scale-[0.99] cursor-pointer"
            >
              {loading ? 'Verifying...' : 'Verify & Continue'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
