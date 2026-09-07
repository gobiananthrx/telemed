import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal, ArrowLeft } from 'lucide-react';
import { apiClient } from '../../api/client';
import { DoctorCard } from '../../components/DoctorCard';
import { TopHeader } from '../../components/TopHeader';
import { BottomNav } from '../../components/BottomNav';

export const DoctorList = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSpecialty = searchParams.get('specialty') || 'All';
  const initialSearch = searchParams.get('search') || '';

  const [doctors, setDoctors] = useState([]);
  const [specialtyFilter, setSpecialtyFilter] = useState(initialSpecialty);
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [loading, setLoading] = useState(true);

  const categories = ['All', 'Cardiologist', 'General Physician', 'Dermatologist', 'Pediatrician'];

  useEffect(() => {
    const fetchDoctors = async () => {
      setLoading(true);
      try {
        const queryParams = new URLSearchParams();
        if (specialtyFilter && specialtyFilter !== 'All') {
          queryParams.append('specialty', specialtyFilter);
        }
        if (searchTerm.trim()) {
          queryParams.append('search', searchTerm.trim());
        }

        const data = await apiClient(`/doctors?${queryParams.toString()}`);
        setDoctors(data || []);
      } catch (err) {
        console.error('Error loading doctors:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDoctors();
  }, [specialtyFilter, searchTerm]);

  const handleCategoryClick = (cat) => {
    setSpecialtyFilter(cat);
    setSearchParams((prev) => {
      if (cat === 'All') prev.delete('specialty');
      else prev.set('specialty', cat);
      return prev;
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans antialiased text-slate-800">
      <TopHeader />

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-12 space-y-6">
        {/* Page Title & Search Header */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Find Medical Doctors</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Browse verified medical specialists and schedule your two-way video consultation.
              </p>
            </div>
            
            <span className="text-xs font-bold text-teal-700 bg-teal-50 px-3 py-1.5 rounded-xl border border-teal-100 self-start sm:self-auto">
              {doctors.length} Doctors Available
            </span>
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search doctors, specialty, hospital..."
              className="w-full bg-slate-50 rounded-xl pl-10 pr-10 py-3 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600/30 border border-slate-200"
            />
          </div>

          {/* Filter Category Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
            {categories.map((cat) => {
              const active = specialtyFilter === cat;
              return (
                <button
                  key={cat}
                  onClick={() => handleCategoryClick(cat)}
                  className={`px-3.5 py-1.5 rounded-xl font-semibold whitespace-nowrap transition cursor-pointer text-xs ${
                    active
                      ? 'bg-teal-700 text-white font-bold shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>

        {/* Doctor Grid (1 col on mobile, 2 on tablet, 3 on desktop) */}
        {loading ? (
          <div className="py-20 flex justify-center">
            <div className="w-8 h-8 border-3 border-teal-700 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : doctors.length === 0 ? (
          <div className="p-12 rounded-2xl bg-white border border-slate-200 text-center space-y-2 shadow-xs">
            <p className="text-sm font-bold text-slate-800">No doctors found matching your criteria</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Once hospital administrators onboard medical doctors, they will be listed here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {doctors.map((doc) => (
              <DoctorCard key={doc.id} doctor={doc} />
            ))}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
};
