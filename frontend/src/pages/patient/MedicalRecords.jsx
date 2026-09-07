import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Pill, Calendar, ChevronRight, FolderOpen, ArrowRight } from 'lucide-react';
import { apiClient } from '../../api/client';
import { TopHeader } from '../../components/TopHeader';
import { BottomNav } from '../../components/BottomNav';

export const MedicalRecords = () => {
  const [activeTab, setActiveTab] = useState('PRESCRIPTIONS');
  const [prescriptions, setPrescriptions] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [rxData, recData] = await Promise.all([
          apiClient('/prescriptions'),
          apiClient('/medical-records'),
        ]);
        setPrescriptions(rxData || []);
        setRecords(recData || []);
      } catch (err) {
        console.error('Failed to load medical records:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans antialiased text-slate-800">
      <TopHeader />

      <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-28 md:pb-12 space-y-6">
        {/* Header & Tabs */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Health Records &amp; Prescriptions</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Access your digital prescriptions and clinical evaluation summaries.
              </p>
            </div>
          </div>

          {/* Segmented Switcher Tabs */}
          <div className="flex items-center p-1 bg-slate-100 rounded-xl text-xs font-semibold max-w-md">
            <button
              type="button"
              onClick={() => setActiveTab('PRESCRIPTIONS')}
              className={`flex-1 py-2 rounded-lg transition text-xs flex items-center justify-center gap-2 ${
                activeTab === 'PRESCRIPTIONS'
                  ? 'bg-white text-teal-800 font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Pill className="w-3.5 h-3.5" />
              <span>Prescriptions ({prescriptions.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('RECORDS')}
              className={`flex-1 py-2 rounded-lg transition text-xs flex items-center justify-center gap-2 ${
                activeTab === 'RECORDS'
                  ? 'bg-white text-teal-800 font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Clinical Notes ({records.length})</span>
            </button>
          </div>
        </div>

        {/* Content List */}
        {loading ? (
          <div className="py-20 flex justify-center">
            <div className="w-8 h-8 border-3 border-teal-700 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : activeTab === 'PRESCRIPTIONS' ? (
          prescriptions.length === 0 ? (
            <div className="p-12 rounded-2xl bg-white border border-slate-200 text-center space-y-3 shadow-xs">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <Pill className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">No prescriptions yet</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Your digital prescriptions issued by doctors following video consultations will appear here.
              </p>
              <Link
                to="/doctors"
                className="inline-flex items-center gap-1.5 bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-xs transition mt-2"
              >
                <span>Find a Doctor</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {prescriptions.map((rx) => (
                <div
                  key={rx.id}
                  className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-teal-400 transition space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
                          <Pill className="w-5 h-5" />
                        </div>
                        <div>
                          <span className="text-xs font-mono font-bold text-teal-700">{rx.rx_number}</span>
                          <h3 className="font-bold text-sm text-slate-900">{rx.diagnosis}</h3>
                          <p className="text-xs text-slate-500 font-medium">
                            Dr. {rx.doctor?.full_name || 'Medical Doctor'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Medicines preview */}
                    <div className="space-y-1.5 pt-2 border-t border-slate-100">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Prescribed Medicines ({rx.medicines?.length || 0})
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {rx.medicines?.map((med) => (
                          <span
                            key={med.id}
                            className="px-2.5 py-0.5 rounded-lg text-[11px] font-semibold bg-slate-50 text-slate-700 border border-slate-200"
                          >
                            {med.medicine_name} • {med.dosage}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{new Date(rx.created_at).toLocaleDateString()}</span>
                    </span>

                    <Link
                      to={`/prescriptions/${rx.id}`}
                      className="bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs px-3.5 py-1.5 rounded-xl shadow-xs transition flex items-center gap-1"
                    >
                      <span>View Full Rx</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : records.length === 0 ? (
          <div className="p-12 rounded-2xl bg-white border border-slate-200 text-center space-y-3 shadow-xs">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <FolderOpen className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">No clinical notes recorded</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Clinical notes documented by attending physicians will appear here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {records.map((rec) => (
              <div
                key={rec.id}
                className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md mb-1">
                      {rec.record_type}
                    </span>
                    <h3 className="font-bold text-sm text-slate-900">{rec.title}</h3>
                    <p className="text-xs text-slate-500 font-medium">Attending: {rec.doctor_name || 'Medical Doctor'}</p>
                  </div>
                  <span className="text-[11px] text-slate-400">{new Date(rec.created_at).toLocaleDateString()}</span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-700 leading-relaxed">
                  {rec.clinical_notes}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
};
