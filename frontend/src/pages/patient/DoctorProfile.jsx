import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, Star, Clock, MapPin, CheckCircle, Calendar,
  Award, Users, Bookmark, Share2, ShieldCheck, Heart
} from 'lucide-react';
import { apiClient } from '../../api/client';
import { TopHeader } from '../../components/TopHeader';
import { BottomNav } from '../../components/BottomNav';

export const DoctorProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [doctor, setDoctor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bookmarked, setBookmarked] = useState(false);

  useEffect(() => {
    const fetchDoctorProfile = async () => {
      try {
        const docData = await apiClient(`/doctors/${id}`);
        setDoctor(docData);
      } catch (err) {
        console.error('Error fetching doctor profile:', err);
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchDoctorProfile();
  }, [id]);

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
        <h2 className="text-lg font-bold text-slate-800">Doctor not found</h2>
        <Link to="/doctors" className="mt-4 text-xs font-bold text-teal-700 underline">
          Back to Doctors List
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans antialiased text-slate-800">
      <TopHeader />

      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-28 md:pb-12 space-y-6">
        {/* Back Link */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-xs transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setBookmarked(!bookmarked)}
              aria-label="Bookmark"
              className={`w-9 h-9 rounded-xl flex items-center justify-center bg-white border border-slate-200 shadow-xs transition ${
                bookmarked ? 'text-teal-700 fill-teal-700' : 'text-slate-600 hover:text-teal-700'
              }`}
            >
              <Bookmark className={`w-4 h-4 ${bookmarked ? 'fill-teal-700' : ''}`} />
            </button>
            <button
              type="button"
              onClick={() => {
                if (navigator.share) {
                  navigator.share({ title: doctor.full_name, url: window.location.href });
                }
              }}
              aria-label="Share"
              className="w-9 h-9 rounded-xl flex items-center justify-center bg-white border border-slate-200 shadow-xs transition text-slate-600 hover:text-teal-700"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 2-Column Responsive Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: Doctor Profile Hero, Stats, Bio, Reviews */}
          <div className="lg:col-span-7 space-y-6">
            {/* Hero Card */}
            <section className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs relative overflow-hidden">
              <div className="flex flex-col sm:flex-row items-start gap-5">
                <div className="relative shrink-0">
                  <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden shadow-md ring-2 ring-teal-100 bg-slate-100">
                    <img
                      src={doctor.avatar_url || "/default-doctor.png"}
                      alt={doctor.full_name}
                      className="w-full h-full object-cover object-top"
                      onError={(e) => {
                        e.target.src = "/default-doctor.png";
                      }}
                    />
                  </div>
                  <span className="absolute -bottom-1 -right-1 bg-emerald-500 text-white p-1 rounded-full ring-2 ring-white shadow-xs">
                    <CheckCircle className="w-3.5 h-3.5" />
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <h1 className="text-xl font-bold text-slate-900 tracking-tight leading-tight">
                    {doctor.full_name}
                  </h1>
                  <p className="text-xs font-bold text-teal-700 mt-0.5">
                    {doctor.specialty}
                  </p>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    {doctor.qualification}
                  </p>
                  <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 text-teal-800 text-xs font-semibold border border-teal-100">
                    <span>Fee: ₹{doctor.consultation_fee} / Consultation</span>
                  </div>
                </div>
              </div>

              {/* 3 Metric Badges */}
              <div className="grid grid-cols-3 gap-3 mt-6 pt-5 border-t border-slate-100">
                <div className="bg-slate-50 rounded-2xl p-3 text-center border border-slate-100">
                  <div className="flex items-center justify-center text-teal-700 mb-1">
                    <Award className="w-4 h-4" />
                  </div>
                  <div className="text-xs font-bold text-slate-900">{doctor.experience_years}+ Years</div>
                  <div className="text-[10px] text-slate-400 font-medium">Experience</div>
                </div>

                <div className="bg-slate-50 rounded-2xl p-3 text-center border border-slate-100">
                  <div className="flex items-center justify-center text-teal-700 mb-1">
                    <Users className="w-4 h-4" />
                  </div>
                  <div className="text-xs font-bold text-slate-900">Verified</div>
                  <div className="text-[10px] text-slate-400 font-medium">Practitioner</div>
                </div>

                <div className="bg-slate-50 rounded-2xl p-3 text-center border border-slate-100">
                  <div className="flex items-center justify-center text-teal-700 mb-1">
                    <CheckCircle className="w-4 h-4" />
                  </div>
                  <div className="text-xs font-bold text-slate-900">Available</div>
                  <div className="text-[10px] text-slate-400 font-medium">Video Consult</div>
                </div>
              </div>
            </section>

            {/* About Doctor */}
            <section className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-2">
              <h2 className="text-sm font-bold text-slate-900">About Doctor</h2>
              <p className="text-xs text-slate-600 leading-relaxed">
                {doctor.bio || `${doctor.full_name} is a dedicated ${doctor.specialty} with over ${doctor.experience_years} years of clinical experience. Providing evidence-based, patient-centered care through Telemed's secure clinical infrastructure.`}
              </p>
            </section>
          </div>

          {/* Right Column: Hospital Details & Booking Action */}
          <div className="lg:col-span-5 space-y-6">
            {/* Hospital & Practice Card */}
            <section className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
              <h2 className="text-sm font-bold text-slate-900">Hospital &amp; Clinical Affiliation</h2>
              <div className="flex items-start gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900">{doctor.hospital_name}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Main Clinical Campus, Katpadi Road, {doctor.city || 'Vellore'}
                  </p>
                  <p className="text-[11px] text-teal-700 font-semibold mt-1.5 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Mon – Sat • 09:00 AM – 05:00 PM</span>
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-500">
                <ShieldCheck className="w-4 h-4 text-teal-600 shrink-0" />
                <span>Verified by Telemed Healthcare Credentialing</span>
              </div>
            </section>

            {/* Book Appointment CTA Card */}
            <section className="bg-gradient-to-br from-teal-900 to-slate-900 text-white rounded-3xl p-6 shadow-md space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-teal-300 tracking-wider">Consultation Fee</span>
                  <div className="text-2xl font-extrabold text-white mt-0.5">
                    ₹{doctor.consultation_fee}
                    <span className="text-xs font-normal text-slate-300 ml-1">/ session</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-950/80 px-2.5 py-1 rounded-full border border-emerald-500/30">
                    Two-Way Video + Audio
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                Connect directly with {doctor.full_name} via encrypted high-definition video and audio consultation.
              </p>

              <Link
                to={`/book-appointment/${doctor.id}`}
                className="w-full bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold py-3.5 px-4 rounded-2xl text-xs tracking-wide transition flex items-center justify-center gap-2 shadow-sm"
              >
                <Calendar className="w-4 h-4" />
                <span>Book Appointment</span>
              </Link>
            </section>
          </div>

        </div>
      </main>

      <BottomNav />
    </div>
  );
};
