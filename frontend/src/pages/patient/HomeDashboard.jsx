import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search, Sliders, Calendar, Video, FileText, FolderPlus,
  Clock, Heart, ArrowRight, ShieldCheck, ChevronRight
} from 'lucide-react';
import { apiClient } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { TopHeader } from '../../components/TopHeader';
import { BottomNav } from '../../components/BottomNav';
import { DoctorCard } from '../../components/DoctorCard';

export const HomeDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [upcomingAppt, setUpcomingAppt] = useState(null);
  const [specialties, setSpecialties] = useState([]);
  const [featuredDoctors, setFeaturedDoctors] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const [apptData, specData, docData, notifData] = await Promise.allSettled([
          apiClient('/appointments/upcoming'),
          apiClient('/doctors/specialties'),
          apiClient('/doctors'),
          apiClient('/notifications/unread-count'),
        ]);

        if (apptData.status === 'fulfilled') setUpcomingAppt(apptData.value);
        if (specData.status === 'fulfilled') setSpecialties(specData.value || []);
        if (docData.status === 'fulfilled') setFeaturedDoctors((docData.value || []).slice(0, 4));
        if (notifData.status === 'fulfilled') setUnreadCount(notifData.value?.unread_count || 0);
      } catch (err) {
        console.error('Error loading dashboard:', err);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/doctors?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const defaultSpecialties = [
    { specialty: 'Cardiologist', icon: '❤️' },
    { specialty: 'General Physician', icon: '🩺' },
    { specialty: 'Dermatologist', icon: '🧴' },
    { specialty: 'Pediatrician', icon: '👶' },
  ];

  const displaySpecialties = specialties.length > 0 ? specialties : defaultSpecialties;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans antialiased text-slate-800 selection:bg-teal-100 selection:text-teal-800">
      {/* Top Header Navigation */}
      <TopHeader unreadCount={unreadCount} />

      {/* Main Responsive Body */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left / Main Column */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Search & Filter Bar */}
            <section className="bg-white p-2.5 rounded-2xl border border-slate-200 shadow-xs">
              <form onSubmit={handleSearchSubmit} className="relative flex items-center">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Search className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search doctors, symptoms, clinics..."
                  className="w-full py-3 pl-10 pr-14 bg-slate-50 text-sm text-slate-800 placeholder-slate-400 rounded-xl border border-transparent focus:border-teal-600 focus:bg-white focus:ring-2 focus:ring-teal-600/20 transition font-medium"
                />
                <button
                  type="submit"
                  className="tap-scale absolute right-1.5 p-2 bg-white rounded-lg text-teal-700 border border-slate-200/80 shadow-xs hover:bg-slate-50 transition"
                  aria-label="Search"
                >
                  <Sliders className="w-3.5 h-3.5" />
                </button>
              </form>
            </section>

            {/* Quick Actions Grid */}
            <section>
              <h2 className="text-sm font-bold tracking-tight text-slate-900 mb-3">Quick Actions</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* Action 1: Book Appointment */}
                <Link
                  to="/doctors"
                  className="tap-scale group flex flex-col items-center text-center p-3.5 rounded-2xl bg-white border border-slate-200 hover:border-teal-500 hover:shadow-sm transition"
                >
                  <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center mb-2 shadow-xs group-hover:scale-105 group-hover:bg-teal-600 group-hover:text-white transition">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold text-slate-800">Book Appt.</span>
                  <span className="text-[10px] text-slate-400">Find doctors</span>
                </Link>

                {/* Action 2: Video Call */}
                <Link
                  to={upcomingAppt?.room_id ? `/consultation/${upcomingAppt.room_id}` : '/appointments'}
                  className="tap-scale group flex flex-col items-center text-center p-3.5 rounded-2xl bg-white border border-slate-200 hover:border-cyan-500 hover:shadow-sm transition"
                >
                  <div className="w-12 h-12 rounded-xl bg-cyan-50 text-cyan-700 flex items-center justify-center mb-2 shadow-xs group-hover:scale-105 group-hover:bg-cyan-600 group-hover:text-white transition">
                    <Video className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold text-slate-800">Consultation</span>
                  <span className="text-[10px] text-slate-400">Two-way call</span>
                </Link>

                {/* Action 3: Prescriptions */}
                <Link
                  to="/records"
                  className="tap-scale group flex flex-col items-center text-center p-3.5 rounded-2xl bg-white border border-slate-200 hover:border-indigo-500 hover:shadow-sm transition"
                >
                  <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center mb-2 shadow-xs group-hover:scale-105 group-hover:bg-indigo-600 group-hover:text-white transition">
                    <FileText className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold text-slate-800">Prescriptions</span>
                  <span className="text-[10px] text-slate-400">Digital Rx</span>
                </Link>

                {/* Action 4: Health Records */}
                <Link
                  to="/records"
                  className="tap-scale group flex flex-col items-center text-center p-3.5 rounded-2xl bg-white border border-slate-200 hover:border-emerald-500 hover:shadow-sm transition"
                >
                  <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-2 shadow-xs group-hover:scale-105 group-hover:bg-emerald-600 group-hover:text-white transition">
                    <FolderPlus className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold text-slate-800">Records</span>
                  <span className="text-[10px] text-slate-400">Clinical notes</span>
                </Link>
              </div>
            </section>

            {/* Upcoming Appointment Highlight Card */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-teal-600 animate-pulse" />
                  <h2 className="text-sm font-bold tracking-tight text-slate-900">Upcoming Appointment</h2>
                </div>
                <Link to="/appointments" className="text-xs font-semibold text-teal-700 hover:text-teal-800 tap-scale">
                  View All
                </Link>
              </div>

              {upcomingAppt ? (
                <article className="p-5 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-teal-950 text-white shadow-md relative overflow-hidden">
                  <div className="absolute -right-8 -top-8 w-44 h-44 bg-teal-500/20 rounded-full blur-2xl pointer-events-none" />
                  
                  {/* Doctor Block */}
                  <div className="flex items-start justify-between relative z-10">
                    <div className="flex items-center space-x-3.5">
                      <div className="relative">
                        <img
                          src={upcomingAppt.doctor?.avatar_url || "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150&h=150&fit=crop&crop=face"}
                          alt={upcomingAppt.doctor?.full_name}
                          className="w-14 h-14 rounded-2xl object-cover ring-2 ring-teal-400/40 shadow-md"
                        />
                        <span className="absolute -bottom-1 -right-1 p-0.5 bg-emerald-500 rounded-full ring-2 ring-slate-900 w-3.5 h-3.5" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-white tracking-tight">
                          {upcomingAppt.doctor?.full_name}
                        </h3>
                        <p className="text-xs font-medium text-teal-300">
                          {upcomingAppt.doctor?.specialty} • {upcomingAppt.doctor?.qualification}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {upcomingAppt.doctor?.hospital_name}
                        </p>
                      </div>
                    </div>

                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-teal-500/20 text-teal-300 border border-teal-500/30">
                      {upcomingAppt.status}
                    </span>
                  </div>

                  {/* Schedule & Mode */}
                  <div className="mt-4 pt-3.5 border-t border-slate-700/60 flex items-center justify-between text-xs text-slate-300">
                    <div className="flex items-center space-x-2">
                      <Clock className="w-4 h-4 text-teal-400 shrink-0" />
                      <span className="font-medium text-slate-200">
                        {upcomingAppt.date} • {upcomingAppt.start_time?.slice(0, 5)}
                      </span>
                    </div>
                    <div className="flex items-center space-x-1.5 text-teal-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                      <span className="text-[11px] font-medium">Video Consultation</span>
                    </div>
                  </div>

                  {/* Direct Action Buttons */}
                  <div className="mt-4 grid grid-cols-5 gap-2.5 pt-1">
                    {upcomingAppt.room_id ? (
                      <Link
                        to={`/consultation/${upcomingAppt.room_id}`}
                        className="col-span-3 tap-scale py-2.5 px-3 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs flex items-center justify-center space-x-1.5 shadow-md transition"
                      >
                        <Video className="w-4 h-4" />
                        <span>Join Consultation</span>
                      </Link>
                    ) : (
                      <div className="col-span-3 py-2.5 px-3 rounded-xl bg-slate-800 text-slate-400 font-medium text-xs flex items-center justify-center space-x-1.5">
                        <Clock className="w-4 h-4" />
                        <span>Scheduled: Awaiting Doctor</span>
                      </div>
                    )}
                    <Link
                      to={`/booking-confirmation/${upcomingAppt.id}`}
                      className="col-span-2 tap-scale py-2.5 px-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 border border-slate-700 font-semibold text-xs flex items-center justify-center transition"
                    >
                      <span>Details</span>
                    </Link>
                  </div>
                </article>
              ) : (
                /* Empty state when no upcoming appointments (Section 13) */
                <div className="p-8 rounded-3xl bg-white border border-slate-200 shadow-xs text-center space-y-2.5">
                  <div className="w-12 h-12 rounded-full bg-teal-50 text-teal-700 flex items-center justify-center mx-auto">
                    <Calendar className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">No upcoming consultations</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Find a doctor to book your first consultation and receive clinical guidance.
                  </p>
                  <Link
                    to="/doctors"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 px-4 py-2 rounded-xl shadow-xs transition mt-2"
                  >
                    <span>Find a Doctor</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              )}
            </section>

            {/* Daily Health Tip Card */}
            <section>
              <div className="p-4 rounded-2xl bg-gradient-to-r from-teal-50/80 to-emerald-50/80 border border-teal-200/70 flex items-center space-x-3.5 shadow-subtle">
                <div className="w-12 h-12 rounded-xl bg-teal-600/10 text-teal-700 flex items-center justify-center shrink-0">
                  <Heart className="w-6 h-6 fill-teal-600/30 text-teal-700" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700 bg-teal-200/60 px-2 py-0.5 rounded-full">
                      Daily Tip
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium">Preventive Wellness</span>
                  </div>
                  <p className="text-xs font-medium text-slate-700 mt-1 leading-snug">
                    Stay hydrated &amp; monitor regular vitals — consistent daily hydration supports cardiovascular and metabolic resilience.
                  </p>
                </div>
              </div>
            </section>
          </div>

          {/* Right Column: Specialties & Top Doctors */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Doctors by Specialty */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold tracking-tight text-slate-900">Specialties</h2>
                <Link to="/doctors" className="text-xs font-semibold text-teal-700 hover:text-teal-800 tap-scale">
                  See All
                </Link>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-3">
                {displaySpecialties.map((item, idx) => (
                  <Link
                    key={item.specialty}
                    to={`/doctors?specialty=${encodeURIComponent(item.specialty)}`}
                    className={`tap-scale flex items-center gap-3 p-3 rounded-2xl transition border ${
                      idx === 0
                        ? 'bg-teal-700 text-white border-teal-700 shadow-sm'
                        : 'bg-white border-slate-200 hover:border-teal-400 text-slate-800'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 ${
                      idx === 0 ? 'bg-white/20' : 'bg-slate-100'
                    }`}>
                      {item.icon || '🩺'}
                    </div>
                    <span className="text-xs font-bold leading-tight truncate">
                      {item.specialty}
                    </span>
                  </Link>
                ))}
              </div>
            </section>

            {/* Top Doctors Section */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold tracking-tight text-slate-900">Top Specialists</h2>
                <Link to="/doctors" className="text-xs font-semibold text-teal-700 hover:text-teal-800">
                  View All
                </Link>
              </div>

              {featuredDoctors.length > 0 ? (
                <div className="space-y-3">
                  {featuredDoctors.map((doc) => (
                    <DoctorCard key={doc.id} doctor={doc} />
                  ))}
                </div>
              ) : (
                /* Empty state when no doctors onboarded yet (Section 13) */
                <div className="p-8 rounded-2xl bg-white border border-slate-200 text-center space-y-2 shadow-xs">
                  <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <h3 className="text-xs font-bold text-slate-700">No Doctors Listed Yet</h3>
                  <p className="text-[11px] text-slate-400">
                    Hospital administrators can onboard doctors from the administrative portal.
                  </p>
                </div>
              )}
            </section>
          </div>

        </div>
      </main>

      {/* Bottom Navigation (Mobile Only) */}
      <BottomNav unreadCount={unreadCount} />
    </div>
  );
};
