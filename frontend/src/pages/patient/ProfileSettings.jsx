import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  User, Mail, Phone, MapPin, Heart, Shield,
  LogOut, ChevronRight, Bell, Lock, CheckCircle, Edit3, X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { apiClient } from '../../api/client';
import { TopHeader } from '../../components/TopHeader';
import { BottomNav } from '../../components/BottomNav';

export const ProfileSettings = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    full_name: user?.name || '',
    phone: user?.patient_profile?.phone || '',
    city: user?.patient_profile?.city || '',
    blood_group: user?.patient_profile?.blood_group || 'O+',
  });
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const handleLogout = () => {
    logout();
    navigate('/signin');
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    try {
      await apiClient('/auth/me/profile', {
        method: 'PUT',
        body: JSON.stringify(editForm),
      });
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        setShowEditModal(false);
        window.location.reload();
      }, 1000);
    } catch (err) {
      setSaveError(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const patient = user?.patient_profile || {};
  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'PT';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans antialiased text-slate-800">
      <TopHeader />

      <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-28 md:pb-12 space-y-6">
        {/* Page Title */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Patient Profile &amp; Settings</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage your personal healthcare identity, contact information, and security preferences.
          </p>
        </div>

        {/* 2-Column Responsive Layout */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          
          {/* Left Column: Profile Card & Vitals */}
          <div className="md:col-span-5 space-y-6">
            <section className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-5">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-teal-700 text-white font-extrabold text-2xl flex items-center justify-center shadow-md shrink-0">
                  {initials}
                </div>
                <div className="min-w-0">
                  <h2 className="text-base font-bold text-slate-900 truncate">
                    {user?.name || 'Patient'}
                  </h2>
                  <p className="text-xs font-mono font-bold text-teal-700 mt-0.5">
                    UHID: {patient.uhid || 'Assigned on Reg.'}
                  </p>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 mt-1">
                    Verified Patient
                  </span>
                </div>
              </div>

              {/* Patient Vitals Summary */}
              <div className="grid grid-cols-3 gap-2 pt-4 border-t border-slate-100 text-center text-xs">
                <div className="bg-slate-50 p-2.5 rounded-xl">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Blood</span>
                  <p className="font-extrabold text-slate-800 mt-0.5">{patient.blood_group || '—'}</p>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">City</span>
                  <p className="font-extrabold text-slate-800 mt-0.5">{patient.city || '—'}</p>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Role</span>
                  <p className="font-extrabold text-teal-700 mt-0.5">{user?.role || 'PATIENT'}</p>
                </div>
              </div>
            </section>
          </div>

          {/* Right Column: Account Details & Security */}
          <div className="md:col-span-7 space-y-6">
            <section className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden text-xs">
              <div className="px-6 pt-5 pb-2 flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Contact &amp; Personal Info
                </h3>
                <button
                  type="button"
                  onClick={() => setShowEditModal(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-teal-50 text-teal-700 hover:bg-teal-100 font-bold text-xs transition cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>
              </div>

              <div className="divide-y divide-slate-100">
                <div className="px-6 py-3.5 flex items-center justify-between">
                  <div className="flex items-center space-x-3.5">
                    <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-800">Full Name</p>
                      <p className="text-slate-500">{user?.name || '—'}</p>
                    </div>
                  </div>
                </div>

                <div className="px-6 py-3.5 flex items-center justify-between">
                  <div className="flex items-center space-x-3.5">
                    <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center">
                      <Mail className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-800">Email Address</p>
                      <p className="text-slate-500">{user?.email || '—'}</p>
                    </div>
                  </div>
                </div>

                <div className="px-6 py-3.5 flex items-center justify-between">
                  <div className="flex items-center space-x-3.5">
                    <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
                      <Phone className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-800">Phone</p>
                      <p className="text-slate-500">{patient.phone || '—'}</p>
                    </div>
                  </div>
                </div>

                <div className="px-6 py-3.5 flex items-center justify-between">
                  <div className="flex items-center space-x-3.5">
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-800">City</p>
                      <p className="text-slate-500">{patient.city || '—'}</p>
                    </div>
                  </div>
                </div>

                <div className="px-6 py-3.5 flex items-center justify-between">
                  <div className="flex items-center space-x-3.5">
                    <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center">
                      <Heart className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-800">Blood Group</p>
                      <p className="text-slate-500">{patient.blood_group || '—'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Security */}
            <section className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden text-xs">
              <h3 className="px-6 pt-5 pb-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                Security &amp; Encryption
              </h3>

              <div className="divide-y divide-slate-100">
                <Link to="/forgot-password" className="px-6 py-3.5 flex items-center justify-between hover:bg-slate-50 transition">
                  <div className="flex items-center space-x-3.5">
                    <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
                      <Lock className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-800">Reset Password</p>
                      <p className="text-slate-400">Request code via registered email</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </Link>

                <div className="px-6 py-3.5 flex items-center justify-between">
                  <div className="flex items-center space-x-3.5">
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                      <Shield className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-800">Clinical Data Security</p>
                      <p className="text-slate-400">256-bit HIPAA compliant encryption</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    Active
                  </span>
                </div>
              </div>
            </section>

            {/* Logout Action */}
            <button
              type="button"
              onClick={handleLogout}
              className="w-full py-3.5 rounded-2xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs flex items-center justify-center gap-2 transition shadow-xs"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out of Telemed</span>
            </button>
          </div>

        </div>
      </main>

      {/* Edit Profile Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900">Edit Patient Profile</h2>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveProfile} className="p-6 space-y-4">
              {saveSuccess && (
                <div className="p-3 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold">
                  Profile updated successfully!
                </div>
              )}
              {saveError && (
                <div className="p-3 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold">
                  {saveError}
                </div>
              )}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Full Name</label>
                <input
                  type="text"
                  required
                  value={editForm.full_name}
                  onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Phone</label>
                <input
                  type="tel"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">City</label>
                <input
                  type="text"
                  required
                  value={editForm.city}
                  onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Blood Group</label>
                <select
                  value={editForm.blood_group}
                  onChange={(e) => setEditForm({ ...editForm, blood_group: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                >
                  {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bg) => (
                    <option key={bg} value={bg}>{bg}</option>
                  ))}
                </select>
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-xl cursor-pointer"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
};
