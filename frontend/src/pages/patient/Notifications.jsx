import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Bell, Calendar, Pill, FileText, CheckCheck,
  ChevronRight, Clock, Check
} from 'lucide-react';
import { apiClient } from '../../api/client';
import { TopHeader } from '../../components/TopHeader';
import { BottomNav } from '../../components/BottomNav';

export const Notifications = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    try {
      const data = await apiClient('/notifications');
      setNotifications(data || []);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkRead = async (id, link) => {
    try {
      await apiClient(`/notifications/${id}/read`, { method: 'PATCH' });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    } catch (e) {}

    if (link) {
      navigate(link);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await apiClient('/notifications/read-all', { method: 'POST' });
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (e) {}
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const filteredNotifications = notifications.filter((n) => {
    if (activeFilter === 'ALL') return true;
    if (activeFilter === 'APPOINTMENTS') return n.notification_type === 'APPOINTMENT';
    if (activeFilter === 'MEDICINE') return n.notification_type === 'PRESCRIPTION';
    if (activeFilter === 'CONSULTATION') return n.notification_type === 'CONSULTATION';
    return true;
  });

  const getIcon = (type) => {
    switch (type) {
      case 'APPOINTMENT':
        return <Calendar className="w-5 h-5 text-teal-700" />;
      case 'PRESCRIPTION':
        return <Pill className="w-5 h-5 text-indigo-700" />;
      default:
        return <FileText className="w-5 h-5 text-emerald-700" />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans antialiased text-slate-800">
      <TopHeader unreadCount={unreadCount} />

      <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-28 md:pb-12 space-y-6">
        {/* Header & Filter Bar */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Notification History</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Review your appointment updates, consultation alerts, and prescription notifications.
              </p>
            </div>

            <div className="flex items-center gap-3 self-start sm:self-auto">
              <span className="text-xs font-bold text-teal-700 bg-teal-50 px-3 py-1.5 rounded-xl border border-teal-100">
                {unreadCount} Unread Alerts
              </span>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  className="text-xs text-slate-600 hover:text-slate-900 font-bold px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition flex items-center gap-1"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>Mark all read</span>
                </button>
              )}
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto text-xs">
            {[
              { id: 'ALL', label: 'All Alerts' },
              { id: 'APPOINTMENTS', label: 'Appointments' },
              { id: 'CONSULTATION', label: 'Consultations' },
              { id: 'MEDICINE', label: 'Prescriptions' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setActiveFilter(f.id)}
                className={`px-3.5 py-1.5 rounded-xl font-semibold transition cursor-pointer text-xs ${
                  activeFilter === f.id
                    ? 'bg-teal-700 text-white font-bold shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Notifications List */}
        {loading ? (
          <div className="py-20 flex justify-center">
            <div className="w-8 h-8 border-3 border-teal-700 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="p-12 rounded-2xl bg-white border border-slate-200 text-center space-y-3 shadow-xs">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <Bell className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">No notifications found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              You will receive real-time notifications when appointments are confirmed, consultations begin, or prescriptions are issued.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredNotifications.map((n) => (
              <div
                key={n.id}
                onClick={() => handleMarkRead(n.id, n.link)}
                className={`p-4 sm:p-5 rounded-2xl border transition cursor-pointer flex items-start gap-4 ${
                  !n.is_read
                    ? 'bg-teal-50/40 border-teal-200 shadow-xs'
                    : 'bg-white border-slate-200/80 hover:border-slate-300'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  !n.is_read ? 'bg-teal-100' : 'bg-slate-100'
                }`}>
                  {getIcon(n.notification_type)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className={`text-sm tracking-tight ${!n.is_read ? 'font-bold text-slate-900' : 'font-semibold text-slate-800'}`}>
                      {n.title}
                    </h3>
                    <span className="text-[11px] text-slate-400 shrink-0">
                      {new Date(n.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    {n.message}
                  </p>
                </div>

                {!n.is_read && (
                  <span className="w-2.5 h-2.5 rounded-full bg-teal-600 shrink-0 self-center" />
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      <BottomNav unreadCount={unreadCount} />
    </div>
  );
};
