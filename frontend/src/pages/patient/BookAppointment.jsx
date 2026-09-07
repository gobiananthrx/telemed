import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, CheckCircle, Video, ShieldCheck, Clock,
  Calendar, AlertCircle, Info, ChevronRight
} from 'lucide-react';
import { apiClient } from '../../api/client';
import { TopHeader } from '../../components/TopHeader';
import { BottomNav } from '../../components/BottomNav';

export const BookAppointment = () => {
  const { doctorId } = useParams();
  const navigate = useNavigate();

  const [doctor, setDoctor] = useState(null);
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [slotsData, setSlotsData] = useState({ date: '', slots: [] });
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [reason, setReason] = useState('Routine consultation & clinical evaluation');
  const [consultationMode, setConsultationMode] = useState('VIDEO');
  const [loading, setLoading] = useState(true);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [error, setError] = useState(null);

  // Generate next 14 calendar days
  const upcomingDays = Array.from({ length: 14 }).map((_, idx) => {
    const d = new Date();
    d.setDate(d.getDate() + idx);
    return {
      fullDate: d.toISOString().split('T')[0],
      dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
      dayNumber: d.getDate(),
      monthName: d.toLocaleDateString('en-US', { month: 'short' }),
    };
  });

  // Fetch Doctor Profile
  useEffect(() => {
    const fetchDoc = async () => {
      try {
        const data = await apiClient(`/doctors/${doctorId}`);
        setDoctor(data);
      } catch (err) {
        console.error('Failed to load doctor:', err);
        setError('Doctor details could not be retrieved.');
      } finally {
        setLoading(false);
      }
    };

    if (doctorId) fetchDoc();
  }, [doctorId]);

  // Fetch Available Slots for selected date
  useEffect(() => {
    const fetchSlots = async () => {
      if (!doctorId || !selectedDate) return;
      try {
        const data = await apiClient(`/doctors/${doctorId}/slots?slot_date=${selectedDate}`);
        setSlotsData(data);
        setSelectedSlot(null);
      } catch (err) {
        console.error('Failed to load time slots:', err);
      }
    };

    fetchSlots();
  }, [doctorId, selectedDate]);

  const handleBookAppointment = async () => {
    if (!selectedSlot) {
      setError('Please select an available time slot.');
      return;
    }

    setError(null);
    setBookingLoading(true);

    try {
      const payload = {
        doctor_id: parseInt(doctorId),
        slot_id: selectedSlot.id,
        date: selectedDate,
        start_time: selectedSlot.time,
        consultation_mode: consultationMode,
        reason: reason.trim() || 'General Consultation',
      };

      const booking = await apiClient('/appointments/book', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      navigate(`/booking-confirmation/${booking.id}`);
    } catch (err) {
      setError(err.message || 'Failed to book appointment. Time slot may have just been reserved.');
    } finally {
      setBookingLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-teal-700 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!doctor) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <p className="text-sm font-semibold text-slate-800">Doctor not found</p>
        <Link to="/doctors" className="mt-2 text-xs font-bold text-teal-700 underline">
          Back to Doctors
        </Link>
      </div>
    );
  }

  const morningSlots = slotsData.slots.filter((s) => s.period === 'Morning');
  const afternoonSlots = slotsData.slots.filter((s) => s.period === 'Afternoon');
  const eveningSlots = slotsData.slots.filter((s) => s.period === 'Evening');

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans antialiased text-slate-800">
      <TopHeader />

      <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-28 md:pb-12 space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-xs transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
          <span className="text-xs font-bold text-teal-700 bg-teal-50 px-3 py-1 rounded-full border border-teal-100">
            Step 2 of 3 • Select Slot
          </span>
        </div>

        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="font-semibold">{error}</span>
          </div>
        )}

        {/* 2-Column Responsive Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Doctor Snapshot, Date Picker, Time Slots, Reason */}
          <div className="lg:col-span-7 space-y-6">
            {/* Doctor Snapshot Card */}
            <section className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center space-x-4">
              <div className="relative shrink-0">
                <img
                  src={doctor.avatar_url || "/default-doctor.png"}
                  alt={doctor.full_name}
                  className="w-16 h-16 rounded-2xl object-cover ring-2 ring-teal-500/20 shadow-xs"
                  onError={(e) => {
                    e.target.src = "/default-doctor.png";
                  }}
                />
                <span className="absolute -bottom-1 -right-1 bg-teal-600 text-white p-0.5 rounded-full ring-2 ring-white">
                  <CheckCircle className="w-3.5 h-3.5 fill-current" />
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold text-slate-900 truncate">{doctor.full_name}</h2>
                  <span className="text-sm font-extrabold text-teal-700">₹{doctor.consultation_fee}</span>
                </div>
                <p className="text-xs font-bold text-teal-700 mt-0.5">
                  {doctor.specialty} • {doctor.qualification}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                  {doctor.hospital_name}
                </p>
              </div>
            </section>

            {/* Date Picker Carousel */}
            <section className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Select Date</h3>
                <span className="text-xs font-semibold text-teal-700">
                  {new Date(selectedDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                </span>
              </div>

              <div className="flex space-x-2 overflow-x-auto pb-1 no-scrollbar">
                {upcomingDays.map((day) => {
                  const isSelected = selectedDate === day.fullDate;
                  return (
                    <button
                      key={day.fullDate}
                      type="button"
                      onClick={() => setSelectedDate(day.fullDate)}
                      className={`tap-scale flex flex-col items-center min-w-[60px] py-3 px-2 rounded-2xl transition cursor-pointer border ${
                        isSelected
                          ? 'bg-teal-700 text-white border-teal-700 shadow-sm scale-105'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-teal-400'
                      }`}
                    >
                      <span className={`text-[10px] font-semibold uppercase ${isSelected ? 'text-teal-200' : 'text-slate-400'}`}>
                        {day.dayName}
                      </span>
                      <span className="text-base font-extrabold my-0.5">
                        {day.dayNumber}
                      </span>
                      <span className={`text-[9px] font-medium ${isSelected ? 'text-teal-100' : 'text-slate-400'}`}>
                        {day.monthName}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Time Slot Picker */}
            <section className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Select Time Slot</h3>
                <span className="text-[11px] text-slate-400 font-medium">30 Mins / Session</span>
              </div>

              {slotsData.slots.length === 0 ? (
                <p className="text-xs text-slate-500 py-3">No available slots for this date. Please select another day.</p>
              ) : (
                <>
                  {/* Morning */}
                  {morningSlots.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Morning</span>
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {morningSlots.map((slot) => {
                          const isSelected = selectedSlot?.time === slot.time;
                          return (
                            <button
                              key={slot.time}
                              type="button"
                              disabled={!slot.is_available}
                              onClick={() => setSelectedSlot(slot)}
                              className={`py-2.5 px-3 rounded-xl text-xs font-bold transition ${
                                !slot.is_available
                                  ? 'bg-slate-100 text-slate-300 line-through cursor-not-allowed border border-slate-100'
                                  : isSelected
                                  ? 'bg-teal-700 text-white shadow-sm border border-teal-700 ring-2 ring-teal-700/20'
                                  : 'bg-slate-50 text-slate-800 border border-slate-200 hover:border-teal-600'
                              }`}
                            >
                              {slot.formatted_time}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Afternoon */}
                  {afternoonSlots.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Afternoon</span>
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {afternoonSlots.map((slot) => {
                          const isSelected = selectedSlot?.time === slot.time;
                          return (
                            <button
                              key={slot.time}
                              type="button"
                              disabled={!slot.is_available}
                              onClick={() => setSelectedSlot(slot)}
                              className={`py-2.5 px-3 rounded-xl text-xs font-bold transition ${
                                !slot.is_available
                                  ? 'bg-slate-100 text-slate-300 line-through cursor-not-allowed border border-slate-100'
                                  : isSelected
                                  ? 'bg-teal-700 text-white shadow-sm border border-teal-700 ring-2 ring-teal-700/20'
                                  : 'bg-slate-50 text-slate-800 border border-slate-200 hover:border-teal-600'
                              }`}
                            >
                              {slot.formatted_time}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Evening */}
                  {eveningSlots.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Evening</span>
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {eveningSlots.map((slot) => {
                          const isSelected = selectedSlot?.time === slot.time;
                          return (
                            <button
                              key={slot.time}
                              type="button"
                              disabled={!slot.is_available}
                              onClick={() => setSelectedSlot(slot)}
                              className={`py-2.5 px-3 rounded-xl text-xs font-bold transition ${
                                !slot.is_available
                                  ? 'bg-slate-100 text-slate-300 line-through cursor-not-allowed border border-slate-100'
                                  : isSelected
                                  ? 'bg-teal-700 text-white shadow-sm border border-teal-700 ring-2 ring-teal-700/20'
                                  : 'bg-slate-50 text-slate-800 border border-slate-200 hover:border-teal-600'
                              }`}
                            >
                              {slot.formatted_time}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </section>

            {/* Reason for Consultation */}
            <section className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Reason for Consultation
              </label>
              <textarea
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Describe symptoms or clinical reasons for consultation..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-medium text-slate-800 focus:outline-none focus:border-teal-600 focus:bg-white focus:ring-1 focus:ring-teal-600"
              />
            </section>
          </div>

          {/* Right Column: Mode, Fee Breakdown & CTA */}
          <div className="lg:col-span-5 space-y-6">
            {/* Consultation Mode */}
            <section className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Consultation Mode</h3>
              <div className="p-3.5 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-teal-700 text-white flex items-center justify-center shadow-xs">
                    <Video className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">Encrypted Consultation</div>
                    <div className="text-[11px] text-teal-700 font-medium">Browser WebRTC • Video + Audio</div>
                  </div>
                </div>
                <CheckCircle className="w-5 h-5 text-teal-700" />
              </div>
            </section>

            {/* Price Breakdown */}
            <section className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3 text-xs">
              <h3 className="font-bold text-slate-900 text-sm">Payment Breakdown</h3>
              <div className="space-y-2 pt-1">
                <div className="flex justify-between text-slate-600">
                  <span>Doctor Consultation Fee</span>
                  <span className="font-semibold text-slate-900">₹{doctor.consultation_fee}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Telemed Digital Infrastructure</span>
                  <span className="font-semibold text-emerald-600">FREE</span>
                </div>
                <div className="pt-3 border-t border-slate-100 flex justify-between font-bold text-base text-slate-900">
                  <span>Total Payable</span>
                  <span className="text-teal-700">₹{doctor.consultation_fee}</span>
                </div>
              </div>

              {selectedSlot ? (
                <div className="p-3 bg-teal-50/70 border border-teal-200 rounded-xl text-teal-900 text-xs mt-3">
                  <p className="font-bold">Selected Slot:</p>
                  <p className="mt-0.5">{new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} at {selectedSlot.formatted_time}</p>
                </div>
              ) : (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 p-2.5 rounded-xl">
                  Please pick an available time slot from the schedule.
                </p>
              )}

              {/* Confirm Booking CTA Button */}
              <button
                type="button"
                disabled={!selectedSlot || bookingLoading}
                onClick={handleBookAppointment}
                className="w-full mt-4 bg-teal-700 hover:bg-teal-800 disabled:opacity-50 text-white font-bold py-3.5 px-4 rounded-xl shadow-xs text-xs tracking-wide transition flex items-center justify-center gap-2"
              >
                <span>{bookingLoading ? 'Securing Slot...' : 'Confirm & Book Appointment'}</span>
                <ChevronRight className="w-4 h-4" />
              </button>

              <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 pt-2">
                <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
                <span>Instant Confirmation &amp; Slot Lock Guaranteed</span>
              </div>
            </section>
          </div>

        </div>
      </main>

      <BottomNav />
    </div>
  );
};
