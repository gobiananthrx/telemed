import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Check, Calendar, Clock, Video, Home, ArrowLeft,
  Share2, ShieldCheck, UserCheck, AlertCircle
} from 'lucide-react';
import { apiClient } from '../../api/client';
import { TopHeader } from '../../components/TopHeader';
import { BottomNav } from '../../components/BottomNav';

export const BookingConfirmation = () => {
  const { appointmentId } = useParams();
  const navigate = useNavigate();

  const [appointment, setAppointment] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBooking = async () => {
      try {
        const data = await apiClient(`/appointments/${appointmentId}`);
        setAppointment(data);
      } catch (err) {
        console.error('Failed to load booking:', err);
      } finally {
        setLoading(false);
      }
    };

    if (appointmentId) fetchBooking();
  }, [appointmentId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-teal-700 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!appointment) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <p className="text-slate-700 font-semibold mb-3">Appointment details not found</p>
        <Link to="/" className="text-teal-700 font-bold hover:underline">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans antialiased text-slate-800">
      <TopHeader />

      <main className="flex-1 w-full max-w-2xl mx-auto px-4 sm:px-6 py-8 pb-28 md:pb-12 space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-xs transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Dashboard</span>
          </Link>

          <button
            type="button"
            onClick={() => {
              if (navigator.share) {
                navigator.share({
                  title: 'Telemed Appointment Confirmation',
                  text: `Appointment ${appointment.appointment_number} with Dr. ${appointment.doctor?.full_name}`,
                  url: window.location.href,
                });
              }
            }}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-xs transition"
          >
            <Share2 className="w-4 h-4" />
            <span>Share</span>
          </button>
        </div>

        {/* Confirmation Card */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
          {/* Success Header */}
          <div className="text-center pt-2 pb-1 space-y-2">
            <div className="w-16 h-16 rounded-full bg-emerald-50 border-4 border-emerald-100 flex items-center justify-center mx-auto shadow-xs animate-bounce">
              <Check className="w-8 h-8 text-emerald-600 stroke-[3]" />
            </div>

            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-teal-50 text-teal-800 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
              Appointment Confirmed
            </div>

            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">You're All Set!</h1>
            <p className="text-xs text-slate-500">
              Booking Reference:{' '}
              <span className="font-mono font-bold text-teal-800">{appointment.appointment_number}</span>
            </p>
          </div>

          {/* Doctor Snapshot Card */}
          <div className="bg-slate-50 rounded-2xl border border-slate-200/80 p-4 flex items-center gap-4">
            <div className="relative shrink-0">
              <img
                src={appointment.doctor?.avatar_url || "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150&h=150&fit=crop&crop=face"}
                alt={appointment.doctor?.full_name}
                className="w-14 h-14 rounded-2xl object-cover border border-teal-100 bg-white"
              />
              <span className="absolute -bottom-1 -right-1 bg-emerald-500 text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center border-2 border-white">
                <Check className="w-3 h-3 stroke-[3]" />
              </span>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-sm text-slate-900 leading-tight truncate">
                  {appointment.doctor?.full_name}
                </h2>
                <span className="text-xs font-extrabold text-teal-700 bg-teal-100/60 px-2 py-0.5 rounded-md">
                  Paid ₹{appointment.fee}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                {appointment.doctor?.specialty} • {appointment.doctor?.qualification}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                {appointment.doctor?.hospital_name}
              </p>
            </div>
          </div>

          {/* Consultation Schedule Details */}
          <div className="bg-gradient-to-br from-teal-50/70 via-slate-50 to-emerald-50/40 rounded-2xl border border-teal-100 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-teal-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-700 text-white flex items-center justify-center shadow-xs">
                  <Video className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider font-bold text-teal-800">Consultation Mode</p>
                  <p className="text-xs font-bold text-slate-900">Encrypted Two-Way Video + Audio Call</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Date</span>
                <p className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-teal-600" />
                  <span>{appointment.date}</span>
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Time</span>
                <p className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-teal-600" />
                  <span>{appointment.start_time?.slice(0, 5)} – {appointment.end_time?.slice(0, 5)}</span>
                </p>
              </div>
            </div>

            {/* Patient Details */}
            <div className="pt-3 border-t border-teal-100 flex justify-between text-xs text-slate-600">
              <span>Patient: <strong className="text-slate-800">{appointment.patient?.full_name}</strong></span>
              <span>UHID: <strong className="font-mono text-teal-800">{appointment.patient?.uhid}</strong></span>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="space-y-3 pt-2">
            {appointment.room_id ? (
              <Link
                to={`/consultation/${appointment.room_id}`}
                className="w-full bg-teal-700 hover:bg-teal-800 text-white font-bold py-3.5 px-4 rounded-xl shadow-xs text-xs tracking-wide transition flex items-center justify-center gap-2"
              >
                <Video className="w-4 h-4" />
                <span>Enter Consultation Room</span>
              </Link>
            ) : (
              <div className="p-3.5 rounded-xl bg-teal-50 border border-teal-200 text-teal-800 text-xs text-center font-medium">
                ⏱ Your doctor will initiate the consultation room during your scheduled appointment slot.
              </div>
            )}

            <Link
              to="/"
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 px-4 rounded-xl text-xs tracking-wide transition flex items-center justify-center gap-2"
            >
              <Home className="w-4 h-4" />
              <span>Back to Home Dashboard</span>
            </Link>
          </div>

          <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 pt-1">
            <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
            <span>256-bit Secure Clinical Telemedicine Session</span>
          </div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
};
