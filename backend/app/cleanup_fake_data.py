import os
import sys

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database import sync_engine, SyncSessionLocal, Base
from app.models import (
    User, UserRole, PatientProfile, DoctorProfile, DoctorAvailability,
    Appointment, Consultation, MedicalRecord,
    Prescription, PrescriptionMedicine,
    Notification, Feedback, VerificationOTP
)
from app.core.security import get_password_hash

def cleanup_and_reset():
    """
    Cleans up all fake/seed/demo data from PostgreSQL tables.
    Preserves ONLY the default Admin account (admin / admin).
    """
    session = SyncSessionLocal()
    try:
        print("[Cleanup] Deleting all dependent records...")
        session.query(Feedback).delete()
        session.query(PrescriptionMedicine).delete()
        session.query(Prescription).delete()
        session.query(MedicalRecord).delete()
        session.query(Consultation).delete()
        session.query(Appointment).delete()
        session.query(DoctorAvailability).delete()
        session.query(Notification).delete()
        session.query(VerificationOTP).delete()
        session.query(PatientProfile).delete()
        session.query(DoctorProfile).delete()

        # Delete all users EXCEPT the ADMIN user
        print("[Cleanup] Deleting non-admin users...")
        session.query(User).filter(User.role != UserRole.ADMIN).delete()

        # Ensure default admin exists
        admin = session.query(User).filter(
            (User.username == "admin") | (User.email == "admin@telemed.com")
        ).first()

        if not admin:
            print("[Cleanup] Creating default Admin user...")
            admin = User(
                email="admin@telemed.com",
                username="admin",
                hashed_password=get_password_hash("admin"),
                role=UserRole.ADMIN,
                is_active=True,
                is_verified=True
            )
            session.add(admin)
        else:
            # Ensure admin password is reset to 'admin'
            admin.username = "admin"
            admin.email = "admin@telemed.com"
            admin.hashed_password = get_password_hash("admin")
            admin.role = UserRole.ADMIN
            admin.is_active = True
            admin.is_verified = True

        session.commit()
        print("✅ Cleanup complete! Database now has ONLY 1 Admin account (admin / admin).")
        print("Zero patients, zero doctors, zero fake appointments.")
    except Exception as e:
        session.rollback()
        print(f"❌ Error during cleanup: {e}")
        raise e
    finally:
        session.close()

if __name__ == "__main__":
    cleanup_and_reset()
