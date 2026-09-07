import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, Download, Share2, Pill, CheckCircle, ShieldCheck,
  Calendar, Clock, User
} from 'lucide-react';
import { apiClient } from '../../api/client';
import { TopHeader } from '../../components/TopHeader';
import { BottomNav } from '../../components/BottomNav';

export const PrescriptionDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [prescription, setPrescription] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRx = async () => {
      try {
        const data = await apiClient(`/prescriptions/${id}`);
        setPrescription(data);
      } catch (err) {
        console.error('Failed to load prescription:', err);
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchRx();
  }, [id]);

  const handleDownload = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-teal-700 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!prescription) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <p className="text-slate-800 font-semibold mb-3">Prescription not found</p>
        <Link to="/records" className="text-teal-700 font-bold hover:underline">
          Return to Records
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans antialiased text-slate-800 print:bg-white print:py-0">
      <div className="print:hidden">
        <TopHeader />
      </div>

      <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 py-6 pb-28 md:pb-12 space-y-6">
        {/* Navigation & Action Bar */}
        <div className="flex items-center justify-between print:hidden">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-xs transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow-xs transition"
            >
              <Download className="w-4 h-4" />
              <span>Print / Save PDF</span>
            </button>
          </div>
        </div>

        {/* Prescription Sheet Card */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6 print:border-none print:shadow-none print:p-0">
          
          {/* Header Banner */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b border-slate-200">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700 shrink-0">
                <Pill className="w-7 h-7" />
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-100">
                  Verified Digital Prescription
                </span>
                <h1 className="text-lg font-bold text-slate-900 mt-1">
                  Dr. {prescription.doctor?.full_name || 'Medical Doctor'}
                </h1>
                <p className="text-xs font-semibold text-teal-700">
                  {prescription.doctor?.specialty} • {prescription.doctor?.qualification}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {prescription.doctor?.hospital_name}
                </p>
              </div>
            </div>

            <div className="text-left sm:text-right">
              <span className="text-xs font-mono font-bold text-teal-800 bg-slate-100 px-3 py-1 rounded-xl block self-start sm:self-auto">
                {prescription.rx_number}
              </span>
              <span className="text-[11px] text-slate-400 block mt-1">
                Issued on {new Date(prescription.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
            </div>
          </div>

          {/* Patient & Clinical Summary Slip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Patient Information</span>
              <p className="font-bold text-slate-900 mt-1 text-sm">{prescription.patient?.full_name}</p>
              <p className="text-slate-500 font-mono mt-0.5">UHID: {prescription.patient?.uhid}</p>
            </div>

            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Primary Diagnosis</span>
              <p className="font-bold text-teal-900 mt-1 text-sm">{prescription.diagnosis}</p>
              {prescription.follow_up_date && (
                <p className="text-slate-600 mt-0.5">Follow-up: <strong>{prescription.follow_up_date}</strong></p>
              )}
            </div>
          </div>

          {/* Itemized Medicines */}
          <div className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Prescribed Medications ({prescription.medicines?.length || 0})
            </h2>

            <div className="space-y-3">
              {prescription.medicines?.map((med, index) => (
                <div
                  key={med.id || index}
                  className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-sm text-slate-900">{med.medicine_name}</h3>
                      <p className="text-xs text-slate-500 font-medium">Dosage: {med.dosage}</p>
                    </div>
                    <span className="text-xs font-mono font-bold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-xl self-start sm:self-auto border border-teal-100">
                      Duration: {med.duration}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    <span className="text-[11px] font-semibold bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-lg">
                      Frequency: {med.frequency}
                    </span>
                    <span className="text-[11px] font-semibold bg-teal-50 text-teal-800 px-2.5 py-0.5 rounded-lg border border-teal-100">
                      Timing: {med.timing}
                    </span>
                  </div>

                  {med.instructions && (
                    <div className="pt-2 border-t border-slate-100 text-xs text-slate-600 italic">
                      Special Instructions: {med.instructions}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Advice & Clinical Notes */}
          {prescription.notes && (
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Clinical Advice &amp; Lifestyle Guidance</h3>
              <p className="text-xs text-slate-700 leading-relaxed">{prescription.notes}</p>
            </div>
          )}

          {/* Footer Security Badge */}
          <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-400">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-teal-600" />
              <span>Electronically signed &amp; timestamped via Telemed Healthcare Network</span>
            </div>
            <span>Valid for pharmacy fulfillment</span>
          </div>
        </div>
      </main>

      <div className="print:hidden">
        <BottomNav />
      </div>
    </div>
  );
};
