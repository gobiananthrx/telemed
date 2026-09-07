import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Calendar, FileText, Bell, User } from 'lucide-react';

export const BottomNav = ({ unreadCount = 0 }) => {
  const location = useLocation();
  const path = location.pathname;

  const navItems = [
    { label: 'Home', icon: Home, to: '/' },
    { label: 'Appts', icon: Calendar, to: '/appointments' },
    { label: 'Records', icon: FileText, to: '/records' },
    { label: 'Alerts', icon: Bell, to: '/notifications', badge: unreadCount },
    { label: 'Profile', icon: User, to: '/profile' },
  ];

  // Do not show bottom nav on video consultation or admin pages
  if (path.startsWith('/consultation') || path.startsWith('/admin')) {
    return null;
  }

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-slate-200/80 px-4 pt-2 pb-5 flex justify-around items-center z-40 shadow-lg">
      {navItems.map((item) => {
        const isActive = path === item.to || (item.to !== '/' && path.startsWith(item.to));
        const Icon = item.icon;

        return (
          <Link
            key={item.label}
            to={item.to}
            className={`tap-scale flex flex-col items-center space-y-1 ${
              isActive ? 'text-teal-700 font-bold' : 'text-slate-400 hover:text-slate-600 font-semibold'
            }`}
          >
            <div className="relative">
              <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
              {isActive && (
                <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-teal-700 rounded-full" />
              )}
              {item.badge > 0 && !isActive && (
                <span className="absolute -top-1 -right-1.5 w-2.5 h-2.5 bg-rose-500 rounded-full ring-2 ring-white" />
              )}
            </div>
            <span className="text-[10px] tracking-tight">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
};
