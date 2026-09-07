import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  X, Star, CheckCircle, Clock, ShieldCheck,
  Send, AlertCircle
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { apiClient } from '../../api/client';

export const PostFeedback = () => {
  const { appointmentId } = useParams();
  const navigate = useNavigate();

  const [appointment, setAppointment] = useState(null);
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [selectedTags, setSelectedTags] = useState(['Clear Explanation', 'Polite & Caring']);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const availableTags = [
    'Clear Explanation',
    'Polite & Caring',
    'Punctual',
    'Thorough Review',
    'Great Video Quality',
    'Helpful Prescription',
  ];

  useEffect(() => {
    const fetchAppointment = async () => {
      try {
        const data = await apiClient(`/appointments/${appointmentId}`);
        setAppointment(data);
      } catch (err) {
        console.error('Failed to load appointment for feedback:', err);
      } finally {
        setLoading(false);
      }
    };

    if (appointmentId) fetchAppointment();
  }, [appointmentId]);

  const toggleTag = (tag) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (rating < 1) {
      setError('Please select a star rating between 1 and 5.');
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      await apiClient('/feedback', {
        method: 'POST',
        body: JSON.stringify({
          appointment_id: parseInt(appointmentId),
          rating: rating,
          tags: selectedTags.join(','),
          comment: comment.trim(),
        }),
      });

      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.7 },
        });
      } catch (e) {}

      navigate('/appointments');
    } catch (err) {
      setError(err.message || 'Failed to submit review.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-teal-700 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8 font-sans antialiased text-slate-800">
      <div className="max-w-2xl mx-auto">
        {/* Card Container */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          
          {/* Top Bar */}
          <header className="border-b border-slate-100 px-6 py-4 flex items-center justify-between">
            <button
              type="button"
              onClick={() => navigate('/')}
              aria-label="Close"
              className="p-2 -ml-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-teal-700 flex items-center justify-center text-white font-bold text-xs shadow-xs">
                Rx
              </div>
              <h1 className="text-base font-bold text-slate-900 tracking-tight">Telemed Consultation Feedback</h1>
            </div>
            <div className="w-8" />
          </header>

          {/* Body Content */}
          <div className="p-6 md:p-8 space-y-6">
            
            {/* Visit Completed Banner */}
            <section className="bg-gradient-to-br from-teal-50/80 via-emerald-50/40 to-white p-4 rounded-2xl border border-teal-100 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0 ring-4 ring-emerald-50">
                <CheckCircle className="w-6 h-6 stroke-[2.5]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-teal-700">Visit Concluded</span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                    Video Consultation Completed
                  </span>
                </div>
                <p className="text-sm font-semibold text-slate-800 mt-0.5">
                  Consultation with {appointment?.doctor?.full_name || 'Doctor'}
                </p>
              </div>
            </section>

            {error && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Rating Section */}
            <section className="text-center py-4 space-y-3 bg-slate-50/70 rounded-2xl border border-slate-100 p-6">
              <h2 className="text-lg font-bold text-slate-900">How was your medical consultation?</h2>
              <p className="text-xs text-slate-500">Your feedback helps improve our telemedicine clinical services.</p>

              {/* 5 Stars Selector */}
              <div className="flex items-center justify-center gap-3 pt-2">
                {[1, 2, 3, 4, 5].map((star) => {
                  const filled = (hoverRating || rating) >= star;
                  return (
                    <button
                      key={star}
                      type="button"
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => setRating(star)}
                      aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
                      className="p-1 focus:outline-none transition-transform hover:scale-125 cursor-pointer"
                    >
                      <Star
                        className={`w-9 h-9 transition-colors ${
                          filled ? 'text-amber-400 fill-amber-400 drop-shadow-sm' : 'text-slate-200'
                        }`}
                      />
                    </button>
                  );
                })}
              </div>

              <span className="inline-block text-xs font-bold text-amber-800 bg-amber-50 px-3.5 py-1 rounded-full border border-amber-200">
                {rating === 5 ? 'Excellent Experience' : rating === 4 ? 'Very Good' : rating === 3 ? 'Good' : 'Needs Improvement'}
              </span>
            </section>

            {/* Tag Chips */}
            <section className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                What went especially well?
              </label>
              <div className="flex flex-wrap gap-2">
                {availableTags.map((tag) => {
                  const selected = selectedTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer border ${
                        selected
                          ? 'bg-teal-700 text-white border-teal-700 shadow-sm'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Written Comments */}
            <section className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                Written Comments (Optional)
              </label>
              <textarea
                rows={4}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Share details about your medical consultation experience..."
                className="w-full bg-white border border-slate-200 rounded-2xl p-3.5 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20"
              />
            </section>

            {/* Submit */}
            <div className="pt-2">
              <button
                type="button"
                disabled={submitting}
                onClick={handleSubmit}
                className="w-full bg-teal-700 hover:bg-teal-800 active:scale-[0.99] text-white font-bold py-3.5 px-4 rounded-xl shadow-sm text-xs tracking-wide transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                <Send className="w-4 h-4" />
                <span>{submitting ? 'Submitting...' : 'Submit Feedback'}</span>
              </button>
            </div>

            <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 pt-2">
              <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
              <span>Verified Patient Review</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
