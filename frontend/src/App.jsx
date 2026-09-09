import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedPatientRoute, ProtectedConsultationRoute } from './components/ProtectedRoutes';

// Patient Authentication Pages
import { SignIn } from './pages/patient/SignIn';
import { SignUp } from './pages/patient/SignUp';
import { VerifyOTP } from './pages/patient/VerifyOTP';
import { ForgotPassword } from './pages/patient/ForgotPassword';
import { ResetPassword } from './pages/patient/ResetPassword';

// Patient Portal Pages
import { HomeDashboard } from './pages/patient/HomeDashboard';
import { DoctorList } from './pages/patient/DoctorList';
import { DoctorProfile } from './pages/patient/DoctorProfile';
import { BookAppointment } from './pages/patient/BookAppointment';
import { BookingConfirmation } from './pages/patient/BookingConfirmation';
import { Appointments } from './pages/patient/Appointments';
import { VideoConsultation } from './pages/patient/VideoConsultation';
import { MedicalRecords } from './pages/patient/MedicalRecords';
import { PrescriptionDetail } from './pages/patient/PrescriptionDetail';
import { Notifications } from './pages/patient/Notifications';
import { ProfileSettings } from './pages/patient/ProfileSettings';

// Admin and Doctor Portal
import { AdminPortal } from './pages/admin/AdminPortal';

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Patient Auth Routes */}
          <Route path="/signin" element={<SignIn />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/verify-otp" element={<VerifyOTP />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Admin & Doctor Unified Portal (handles login internally if unauthenticated) */}
          <Route path="/admin" element={<AdminPortal />} />

          {/* Protected Video Consultation (Patients, Doctors, Admins) */}
          <Route element={<ProtectedConsultationRoute />}>
            <Route path="/consultation/:roomId" element={<VideoConsultation />} />
          </Route>

          {/* Protected Patient Routes */}
          <Route element={<ProtectedPatientRoute />}>
            <Route path="/" element={<HomeDashboard />} />
            <Route path="/doctors" element={<DoctorList />} />
            <Route path="/doctors/:id" element={<DoctorProfile />} />
            <Route path="/book-appointment/:doctorId" element={<BookAppointment />} />
            <Route path="/booking-confirmation/:appointmentId" element={<BookingConfirmation />} />
            <Route path="/appointments" element={<Appointments />} />
            <Route path="/records" element={<MedicalRecords />} />
            <Route path="/prescriptions/:id" element={<PrescriptionDetail />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/profile" element={<ProfileSettings />} />
          </Route>

          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
