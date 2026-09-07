import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle, Star, Clock } from 'lucide-react';

export const DoctorCard = ({ doctor }) => {
  return (
    <div className="bg-white rounded-2xl border border-teal-100/90 p-4 shadow-sm hover:border-teal-500 transition relative bg-gradient-to-r from-teal-50/20 to-white">
      {/* Top availability pill */}
      <span className="absolute top-3 right-3 text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md">
        Available Today
      </span>

      <div className="flex items-start gap-3.5">
        {/* Doctor Avatar */}
        <div className="relative shrink-0">
          <img
            src={doctor.avatar_url || "/default-doctor.png"}
            alt={doctor.full_name}
            className="w-16 h-16 rounded-2xl object-cover border border-teal-100 shadow-xs"
            onError={(e) => {
              e.target.src = "/default-doctor.png";
            }}
          />
          <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 absolute bottom-0 right-0 border-2 border-white" />
        </div>

        {/* Doctor Info */}
        <div className="flex-1 pr-12">
          <div className="flex items-center gap-1.5">
            <h2 className="font-bold text-sm text-slate-900 leading-tight">
              {doctor.full_name}
            </h2>
            <CheckCircle className="w-3.5 h-3.5 text-teal-600 shrink-0" />
          </div>

          <p className="text-xs text-slate-500 font-medium mt-0.5">
            {doctor.specialty} • {doctor.qualification}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {doctor.experience_years}+ Years Exp • {doctor.hospital_name}
          </p>

          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs font-extrabold text-teal-700">
              ₹{doctor.consultation_fee}{' '}
              <span className="text-[10px] text-slate-400 font-normal">/ consult</span>
            </span>
          </div>
        </div>
      </div>

      {/* Footer action */}
      <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
        <span className="text-[11px] text-slate-500 font-medium flex items-center">
          <Clock className="w-3.5 h-3.5 text-teal-600 mr-1" />
          Next Slot: <strong className="ml-1 text-slate-800">Available</strong>
        </span>

        <div className="flex items-center gap-2">
          <Link
            to={`/doctors/${doctor.id}`}
            className="text-slate-600 hover:text-slate-900 text-xs font-semibold px-2.5 py-1.5 rounded-xl border border-slate-200 transition"
          >
            Profile
          </Link>
          <Link
            to={`/book-appointment/${doctor.id}`}
            className="bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold px-3.5 py-1.5 rounded-xl shadow-xs transition"
          >
            Book Now
          </Link>
        </div>
      </div>
    </div>
  );
};
