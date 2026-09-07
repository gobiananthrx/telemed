import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { MapPin, Bell, Calendar, Home, FileText, User, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const TopHeader = ({ unreadCount = 0 }) => {
  const { user } = useAuth();
  const location = useLocation();
  const firstName = user?.name ? user.name.split(' ')[0] : 'Patient';

  const navLinks = [
    { label: 'Home', to: '/', icon: Home },
    { label: 'Find Doctors', to: '/doctors', icon: Users },
    { label: 'Appointments', to: '/appointments', icon: Calendar },
    { label: 'Medical Records', to: '/records', icon: FileText },
  ];

  return (
    <header className="bg-white/90 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-30 px-4 sm:px-6 lg:px-8 py-3 transition">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Left: Brand & Mobile Greeting */}
        <div className="flex items-center space-x-3.5">
          <Link
            to="/"
            className="w-11 h-11 rounded-2xl bg-teal-700 flex items-center justify-center shadow-subtle p-2 text-white shrink-0 hover:bg-teal-800 transition"
          >
            <svg viewBox="0 0 44 44" fill="none" className="w-full h-full">
              <path
                d="M22 12C20 12 18 13.5 17 15.5C16 13.5 14 12 12 12C8.686 12 6 14.686 6 18C6 24 16 31 22 34C28 31 38 24 38 18C38 14.686 35.314 12 32 12C30 12 28 13.5 27 15.5C26 13.5 24 12 22 12Z"
                fill="#CCFBF1"
                opacity="0.4"
              />
              <path
                d="M14 23H18L20 17L24 29L26 21L28 23H30"
                stroke="#FFFFFF"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-base text-slate-900 tracking-tight">Telemed</span>
              <span className="hidden sm:inline text-xs font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-100">
                Health
              </span>
            </div>
            <div className="flex items-center text-xs text-slate-500 font-medium">
              <MapPin className="w-3.5 h-3.5 text-teal-600 mr-1 shrink-0" />
              <span>Vellore, Tamil Nadu</span>
            </div>
          </div>
        </div>

        {/* Center: Desktop Navigation Bar */}
        <nav className="hidden md:flex items-center space-x-1 lg:space-x-2">
          {navLinks.map((link) => {
            const isActive = location.pathname === link.to || (link.to !== '/' && location.pathname.startsWith(link.to));
            const Icon = link.icon;
            return (
              <Link
                key={link.label}
                to={link.to}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
                  isActive
                    ? 'bg-teal-50 text-teal-800 border border-teal-100/80 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-teal-700' : 'text-slate-400'}`} />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Right: Notification Bell & Profile */}
        <div className="flex items-center space-x-2.5">
          <div className="hidden lg:flex flex-col text-right pr-1">
            <span className="text-xs font-bold text-slate-800">Hello, {firstName}</span>
            <span className="text-[11px] text-teal-700 font-medium">{user?.uhid || 'Patient'}</span>
          </div>

          <Link
            to="/notifications"
            aria-label="Notifications"
            className="tap-scale relative p-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200/80 border border-slate-200/60 text-slate-700 transition"
          >
            <Bell className="w-5 h-5" strokeWidth={2} />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white ring-2 ring-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Link>

          <Link
            to="/profile"
            aria-label="Profile"
            className="w-10 h-10 rounded-2xl bg-teal-50 hover:bg-teal-100 border border-teal-200 flex items-center justify-center text-teal-800 font-extrabold text-xs transition"
          >
            {firstName.charAt(0).toUpperCase()}
          </Link>
        </div>
      </div>
    </header>
  );
};
