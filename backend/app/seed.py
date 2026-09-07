import os
import sys

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database import sync_engine, SyncSessionLocal, Base
from app.models import User, UserRole
from app.core.security import get_password_hash

def seed_database():
    """
    Initializes database tables and creates the single default ADMIN account.
    Per requirements:
    - NO sample doctors
    - NO sample patients
    - NO fake appointments, prescriptions, or records
    Admin will create doctors dynamically; patients register themselves.
    """
    print("[Seed] Verifying database schema...")
    Base.metadata.create_all(bind=sync_engine)
    session = SyncSessionLocal()

    try:
        # Check or Create Default Admin: admin / admin
        admin_user = session.query(User).filter(
            (User.username == "admin") | (User.email == "admin@telemed.com")
        ).first()

        if not admin_user:
            print("[Seed] Creating Default Admin account (admin / admin)...")
            admin_user = User(
                email="admin@telemed.com",
                username="admin",
                hashed_password=get_password_hash("admin"),
                role=UserRole.ADMIN,
                is_active=True,
                is_verified=True
            )
            session.add(admin_user)
            session.commit()
            print("  ✔ Admin created: username=admin, password=admin")
        else:
            print("  ✔ Admin account already exists.")

        print("\n========================================================")
        print("🎉 Database initialized with Admin account only.")
        print("Default Admin: admin / admin (Role: ADMIN)")
        print("System started with ZERO sample patients or doctors.")
        print("========================================================\n")

    except Exception as e:
        session.rollback()
        print(f"❌ Error seeding database: {e}")
        raise e
    finally:
        session.close()

if __name__ == "__main__":
    seed_database()
