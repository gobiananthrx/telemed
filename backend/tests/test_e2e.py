import asyncio
import io
import json
import os
import random
import sys
from datetime import date, datetime, timedelta, time

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import httpx
import websockets
from sqlalchemy import select

BASE_URL = "http://localhost:8000"
API_URL = f"{BASE_URL}/api"
WS_URL = "ws://localhost:8000/ws/consultation"

async def run_tests():
    print("=" * 65)
    print("🚀 STARTING TELEMED COMPREHENSIVE END-TO-END VERIFICATION SUITE")
    print("=" * 65)

    async with httpx.AsyncClient(base_url=BASE_URL, timeout=20.0) as client:
        # 1. Health Checks
        print("\n[TEST 1] Testing Service & System Health Checks...")
        res = await client.get("/health")
        assert res.status_code == 200, f"Health check failed: {res.text}"
        data = res.json()
        assert data["status"] == "healthy"
        assert data["video_mode"] == "video-audio"
        assert data["database"] == "postgresql-connected"
        
        res_api = await client.get("/api/health")
        assert res_api.status_code == 200, f"API health check failed: {res_api.text}"
        print("✅ Health checks passed (video_mode=video-audio, postgresql-connected)")

        # 2. Admin Login (Default Admin admin/admin)
        print("\n[TEST 2] Testing Default Admin Direct Login at /admin...")
        res_admin = await client.post("/api/auth/admin-login", json={"identifier": "admin", "password": "admin"})
        assert res_admin.status_code == 200, f"Admin login failed: {res_admin.text}"
        admin_data = res_admin.json()
        admin_token = admin_data["access_token"]
        assert admin_data["role"] == "ADMIN"
        headers_admin = {"Authorization": f"Bearer {admin_token}"}
        print(f"✅ Admin logged in successfully as {admin_data['email']}")

        # 3. Admin Doctor Photo Upload
        print("\n[TEST 3] Testing Admin Doctor Photo Upload (Multipart)...")
        # Generate dummy 1x1 PNG file
        png_bytes = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82"
        files = {"file": ("doctor_avatar.png", png_bytes, "image/png")}
        res_upload = await client.post("/api/admin/upload-photo", files=files, headers=headers_admin)
        assert res_upload.status_code == 200, f"Photo upload failed: {res_upload.text}"
        uploaded_avatar_url = res_upload.json().get("avatar_url")
        assert uploaded_avatar_url.startswith("/uploads/doctors/"), f"Unexpected avatar URL: {uploaded_avatar_url}"
        print(f"✅ Admin uploaded doctor photo successfully: {uploaded_avatar_url}")

        # 4. Admin Creates Doctor with Specialty Validation & Zero Initial Slots
        print("\n[TEST 4] Testing Admin Doctor Creation & Specialty Validation...")
        unique_num = random.randint(10000, 99999)
        doctor_email = f"dr.smith.{unique_num}@telemed.com"
        doctor_password = "DoctorPassword123!"

        # Test invalid specialty rejected
        invalid_doc = {
            "email": f"dr.invalid.{unique_num}@telemed.com",
            "password": doctor_password,
            "full_name": "Dr. Invalid Specialty",
            "qualification": "MBBS",
            "specialty": "Witchcraft & Sorcery",
            "experience_years": 5,
            "hospital_name": "Hospital",
            "consultation_fee": 500.0,
            "bio": "Bio"
        }
        res_invalid_spec = await client.post("/api/admin/doctors", json=invalid_doc, headers=headers_admin)
        assert res_invalid_spec.status_code == 400, "Expected 400 for unapproved specialty"
        print("✅ Invalid medical specialty correctly rejected with HTTP 400")

        # Valid doctor creation
        doc_payload = {
            "email": doctor_email,
            "password": doctor_password,
            "full_name": f"Dr. Robert Smith {unique_num}",
            "qualification": "MBBS, MD (Cardiology)",
            "specialty": "Cardiologist",
            "experience_years": 8,
            "hospital_name": "Apollo Heart Institute",
            "consultation_fee": 700.0,
            "bio": "Senior Consultant Cardiologist specializing in preventive and clinical cardiology.",
            "avatar_url": uploaded_avatar_url
        }
        res_create_doc = await client.post("/api/admin/doctors", json=doc_payload, headers=headers_admin)
        assert res_create_doc.status_code in (200, 201), f"Doctor creation failed: {res_create_doc.text}"
        doctor_obj = res_create_doc.json()
        doctor_id = doctor_obj["id"]
        assert doctor_obj["avatar_url"] == uploaded_avatar_url
        print(f"✅ Admin created doctor: {doctor_obj['full_name']} (ID: {doctor_id})")

        # Verify doctor starts with ZERO slots
        res_initial_slots = await client.get(f"/api/doctors/{doctor_id}/slots?date={(date.today() + timedelta(days=1)).isoformat()}")
        assert res_initial_slots.status_code == 200
        assert len(res_initial_slots.json().get("slots", [])) == 0, "Doctor must start with ZERO initial slots!"
        print("✅ Verified newly created doctor starts with zero initial slots")

        # 5. Strict Role Separation: Doctor/Admin Rejected from Patient Login
        print("\n[TEST 5] Testing Strict Role Separation Guards...")
        # Doctor attempts patient login -> must be rejected with 403
        res_doc_as_pat = await client.post("/api/auth/login", json={"identifier": doctor_email, "password": doctor_password})
        assert res_doc_as_pat.status_code == 403, f"Expected 403 for doctor at patient login, got {res_doc_as_pat.status_code}"
        print("✅ Doctor rejected from patient login with HTTP 403")

        # Admin attempts patient login -> must be rejected with 403
        res_admin_as_pat = await client.post("/api/auth/login", json={"identifier": "admin@telemed.com", "password": "admin"})
        assert res_admin_as_pat.status_code == 403, f"Expected 403 for admin at patient login, got {res_admin_as_pat.status_code}"
        print("✅ Admin rejected from patient login with HTTP 403")

        # Doctor logs in via admin-login -> succeeds
        res_doc_login = await client.post("/api/auth/admin-login", json={"identifier": doctor_email, "password": doctor_password})
        assert res_doc_login.status_code == 200, f"Doctor direct login failed: {res_doc_login.text}"
        doc_data = res_doc_login.json()
        doc_token = doc_data["access_token"]
        assert doc_data["role"] == "DOCTOR"
        headers_doc = {"Authorization": f"Bearer {doc_token}"}
        print(f"✅ Doctor authenticated via /admin (Role: {doc_data['role']})")

        # 6. Patient Registration (City, Blood Group, Confirm Password) & Verification
        print("\n[TEST 6] Testing Patient Registration with City & Blood Group...")
        patient_email = f"patient.{unique_num}@telemed.com"
        patient_password = "PatientPassword123!"

        # Password mismatch rejection test
        mismatch_payload = {
            "email": patient_email,
            "password": patient_password,
            "confirm_password": "WrongPassword123!",
            "full_name": "Test Patient",
            "phone_number": "+919876543210",
            "city": "Bengaluru",
            "blood_group": "O+"
        }
        res_mismatch = await client.post("/api/auth/register", json=mismatch_payload)
        assert res_mismatch.status_code in (400, 422), f"Expected 400 or 422 for password mismatch, got {res_mismatch.status_code}"
        print("✅ Password mismatch validation rejected with HTTP 400/422")

        # Valid registration
        reg_payload = {
            "email": patient_email,
            "password": patient_password,
            "confirm_password": patient_password,
            "full_name": f"Ananya Sharma {unique_num}",
            "phone_number": f"+9198765{unique_num % 100000:05d}",
            "gender": "Female",
            "date_of_birth": "1996-08-20",
            "blood_group": "O+",
            "city": "Bengaluru"
        }
        res_reg = await client.post("/api/auth/register", json=reg_payload)
        assert res_reg.status_code in (200, 201), f"Registration failed: {res_reg.text}"
        reg_json = res_reg.json()
        assert "dev_otp" not in reg_json, "dev_otp must NOT be leaked in registration response!"

        # Retrieve OTP directly from database for testing verification
        from app.database import AsyncSessionLocal
        from app.models.user import VerificationOTP
        async with AsyncSessionLocal() as db_session:
            stmt = select(VerificationOTP).where(
                VerificationOTP.email == patient_email,
                VerificationOTP.purpose == "REGISTRATION",
                VerificationOTP.is_used == False
            ).order_by(VerificationOTP.created_at.desc())
            result = await db_session.execute(stmt)
            otp_record = result.scalars().first()
            assert otp_record is not None, "OTP record not found in database!"
            test_otp = otp_record.otp_code
        print(f"✅ Patient registration initiated. Secure OTP created: {test_otp}")

        # Verify OTP
        res_ver = await client.post("/api/auth/verify-otp", json={
            "email": patient_email,
            "otp_code": test_otp,
            "purpose": "REGISTRATION"
        })
        assert res_ver.status_code in (200, 201), f"OTP verification failed: {res_ver.text}"
        pat_data = res_ver.json()
        pat_token = pat_data["access_token"]
        assert pat_data["role"] == "PATIENT"
        headers_pat = {"Authorization": f"Bearer {pat_token}"}
        print(f"✅ Patient verified! UHID: {pat_data.get('uhid')}")

        # Patient attempts /admin login -> rejected with 403
        res_pat_as_admin = await client.post("/api/auth/admin-login", json={"identifier": patient_email, "password": patient_password})
        assert res_pat_as_admin.status_code == 403, f"Expected 403 for patient at admin login, got {res_pat_as_admin.status_code}"
        print("✅ Patient rejected from /admin login with HTTP 403")

        # Patient profile update (PUT /api/auth/me/profile)
        print("\n[TEST 7] Testing Patient Profile Update (City & Blood Group)...")
        res_prof = await client.put("/api/auth/me/profile", json={
            "city": "Mysuru",
            "blood_group": "AB+"
        }, headers=headers_pat)
        assert res_prof.status_code == 200, f"Profile update failed: {res_prof.text}"
        updated_prof = res_prof.json()
        pat_prof = updated_prof.get("patient_profile", updated_prof)
        assert pat_prof["city"] == "Mysuru"
        assert pat_prof["blood_group"] == "AB+"
        print(f"✅ Patient profile updated: City={pat_prof['city']}, BloodGroup={pat_prof['blood_group']}")

        # 8. Doctor Dynamic Slot Management (POST /api/doctors/me/slots)
        print("\n[TEST 8] Testing Doctor Dynamic Slot Batch Creation...")
        now = datetime.now()
        today_str = now.date().isoformat()
        future_date_str = (now.date() + timedelta(days=3)).isoformat()

        # Slot batch for future date (09:00 to 11:00, 30 min duration -> 4 slots)
        slot_payload_future = {
            "date": future_date_str,
            "start_time": "09:00",
            "end_time": "11:00",
            "duration_minutes": 30
        }
        res_create_slots = await client.post("/api/doctors/me/slots", json=slot_payload_future, headers=headers_doc)
        assert res_create_slots.status_code == 200, f"Slot creation failed: {res_create_slots.text}"
        future_slots = res_create_slots.json() if isinstance(res_create_slots.json(), list) else res_create_slots.json().get("slots", [])
        assert len(future_slots) == 4, f"Expected 4 slots, got {len(future_slots)}"
        print(f"✅ Doctor batch created {len(future_slots)} slots on {future_date_str}")

        # Slot batch for right now (to test live video consultation)
        # Create a slot starting in 1 minute so it is strictly in the future for today and within the 10m buffer
        now_time = datetime.now()
        slot_today_start = (now_time + timedelta(minutes=1)).time().replace(second=0, microsecond=0)
        slot_today_end_dt = datetime.combine(now_time.date(), slot_today_start) + timedelta(minutes=30)
        
        slot_payload_today = {
            "date": today_str,
            "start_time": slot_today_start.strftime("%H:%M"),
            "end_time": slot_today_end_dt.time().strftime("%H:%M"),
            "duration_minutes": 30
        }
        res_today_slots = await client.post("/api/doctors/me/slots", json=slot_payload_today, headers=headers_doc)
        assert res_today_slots.status_code == 200, f"Today slot creation failed: {res_today_slots.text}"
        today_slots = res_today_slots.json() if isinstance(res_today_slots.json(), list) else res_today_slots.json().get("slots", [])
        print(f"✅ Doctor created active consultation slots for today: {[s['start_time'] for s in today_slots]}")

        # Doctor lists own slots
        res_my_slots = await client.get("/api/doctors/me/slots", headers=headers_doc)
        assert res_my_slots.status_code == 200
        my_slots = res_my_slots.json()
        assert len(my_slots) >= 5
        print(f"✅ Doctor retrieved {len(my_slots)} active slots")

        # Test deleting an available slot
        slot_to_delete = future_slots[-1]["id"]
        res_del_slot = await client.delete(f"/api/doctors/me/slots/{slot_to_delete}", headers=headers_doc)
        assert res_del_slot.status_code == 200
        print(f"✅ Doctor successfully deleted available slot #{slot_to_delete}")

        # 9. Patient Books Future Appointment with Slot ID
        print("\n[TEST 9] Testing Patient Booking with Dynamic Slot ID...")
        res_pat_slots = await client.get(f"/api/doctors/{doctor_id}/slots?date={future_date_str}", headers=headers_pat)
        assert res_pat_slots.status_code == 200
        avail_slots = res_pat_slots.json().get("slots", [])
        assert len(avail_slots) == 3, f"Expected 3 remaining slots after delete, got {len(avail_slots)}"
        chosen_future_slot = avail_slots[0]

        book_future = {
            "doctor_id": doctor_id,
            "date": future_date_str,
            "start_time": chosen_future_slot["time"],
            "slot_id": chosen_future_slot["id"],
            "reason": "Cardiovascular evaluation.",
            "consultation_mode": "VIDEO"
        }
        res_future_book = await client.post("/api/appointments", json=book_future, headers=headers_pat)
        assert res_future_book.status_code in (200, 201), f"Booking failed: {res_future_book.text}"
        future_appt = res_future_book.json()
        print(f"✅ Patient booked appointment #{future_appt['appointment_number']} (Linked slot {chosen_future_slot['id']})")

        # Double booking prevention (same slot_id)
        res_double_book = await client.post("/api/appointments", json=book_future, headers=headers_pat)
        assert res_double_book.status_code in (400, 409), f"Expected conflict for already booked slot, got {res_double_book.status_code}"
        print("✅ Double-booking of same slot strictly rejected")

        # Time window guard: starting future consultation rejected
        res_early_start = await client.post(f"/api/consultations/start/{future_appt['id']}", headers=headers_doc)
        assert res_early_start.status_code == 403
        print("✅ Time window guard rejected starting future consultation with HTTP 403")

        # 10. Patient Books Active Consultation Slot for Right Now
        print("\n[TEST 10] Patient Books Current Slot & Doctor Starts Video Consultation...")
        active_slot = today_slots[0]
        book_active = {
            "doctor_id": doctor_id,
            "date": today_str,
            "start_time": active_slot["start_time"][:5],
            "slot_id": active_slot["id"],
            "reason": "Immediate tele-consultation.",
            "consultation_mode": "VIDEO"
        }
        res_active_book = await client.post("/api/appointments", json=book_active, headers=headers_pat)
        assert res_active_book.status_code in (200, 201), f"Active booking failed: {res_active_book.text}"
        active_appt = res_active_book.json()
        active_appt_id = active_appt["id"]
        print(f"✅ Active appointment #{active_appt['appointment_number']} booked for right now")

        # Doctor starts the consultation
        res_start = await client.post(f"/api/consultations/start/{active_appt_id}", headers=headers_doc)
        assert res_start.status_code in (200, 201), f"Consultation start failed: {res_start.text}"
        consultation = res_start.json()
        room_id = consultation["room_id"]
        consultation_id = consultation["id"]
        print(f"✅ Doctor started consultation! Room ID: {room_id} (ID: {consultation_id})")

        # Patient joins consultation
        res_join = await client.post(f"/api/consultations/{room_id}/join", headers=headers_pat)
        assert res_join.status_code == 200
        print("✅ Patient joined consultation record")

        # 11. WebRTC Two-Way Video + Audio Signaling Hub
        print("\n[TEST 11] Testing WebRTC Two-Way Media Signaling & Prohibition of Chat...")
        ws_doc_url = f"{WS_URL}/{room_id}?peer_id=doc_{unique_num}&role=DOCTOR&name=DrSmith&token={doc_token}"
        ws_pat_url = f"{WS_URL}/{room_id}?peer_id=pat_{unique_num}&role=PATIENT&name=Ananya&token={pat_token}"

        async with websockets.connect(ws_doc_url) as ws_doc:
            doc_init = json.loads(await ws_doc.recv())
            assert doc_init["type"] == "room-state"

            async with websockets.connect(ws_pat_url) as ws_pat:
                doc_peer_joined = json.loads(await ws_doc.recv())
                assert doc_peer_joined["type"] == "peer-joined"
                
                pat_init = json.loads(await ws_pat.recv())
                assert pat_init["type"] == "room-state"

                doc_ready = json.loads(await ws_doc.recv())
                pat_ready = json.loads(await ws_pat.recv())
                assert doc_ready["type"] == "ready-for-negotiation"
                assert pat_ready["type"] == "ready-for-negotiation"

                # Offer / Answer negotiation
                offer_sdp = {
                    "type": "offer",
                    "sdp": {"type": "offer", "sdp": "v=0\r\nm=audio 9 UDP/TLS/RTP/SAVPF 111\r\nm=video 9 UDP/TLS/RTP/SAVPF 96\r\n"}
                }
                await ws_doc.send(json.dumps(offer_sdp))
                recv_offer = json.loads(await asyncio.wait_for(ws_pat.recv(), timeout=5.0))
                assert recv_offer["type"] == "offer"

                answer_sdp = {
                    "type": "answer",
                    "sdp": {"type": "answer", "sdp": "v=0\r\nm=audio 9 UDP/TLS/RTP/SAVPF 111\r\nm=video 9 UDP/TLS/RTP/SAVPF 96\r\n"}
                }
                await ws_pat.send(json.dumps(answer_sdp))
                recv_answer = json.loads(await asyncio.wait_for(ws_doc.recv(), timeout=5.0))
                assert recv_answer["type"] == "answer"

                # ICE Candidate
                ice_msg = {
                    "type": "ice-candidate",
                    "candidate": {"candidate": "candidate:1 1 UDP 2130706431 192.168.1.1 50000 typ host", "sdpMid": "0"}
                }
                await ws_doc.send(json.dumps(ice_msg))
                recv_ice = json.loads(await asyncio.wait_for(ws_pat.recv(), timeout=5.0))
                assert recv_ice["type"] == "ice-candidate"

                # Chat message rejected
                await ws_pat.send(json.dumps({"type": "chat-message", "text": "Testing prohibited chat"}))
                err_frame = json.loads(await asyncio.wait_for(ws_pat.recv(), timeout=5.0))
                assert err_frame["type"] == "error"
                print("✅ WebRTC Signaling passed & chat frame was rejected with error frame")

                # End call signal
                await ws_doc.send(json.dumps({"type": "call-ended"}))
                recv_end = json.loads(await asyncio.wait_for(ws_pat.recv(), timeout=5.0))
                assert recv_end["type"] == "call-ended"

        # End consultation via API
        res_end = await client.post(f"/api/consultations/{room_id}/end", json={"clinical_notes": "Vitals stable, normal ECG."}, headers=headers_doc)
        assert res_end.status_code == 200
        print("✅ Consultation session ended successfully")

        # 12. Doctor Issues Prescription (Exactly One per Consultation)
        print("\n[TEST 12] Testing Digital Prescription Generation (One per Consultation)...")
        from app.models.user import User
        from sqlalchemy.orm import selectinload
        async with AsyncSessionLocal() as db_session:
            u_res = await db_session.execute(
                select(User).options(selectinload(User.patient_profile)).where(User.email == patient_email)
            )
            pat_user = u_res.scalar_one()
            patient_profile_id = pat_user.patient_profile.id

        rx_payload = {
            "appointment_id": active_appt_id,
            "consultation_id": consultation_id,
            "patient_id": patient_profile_id,
            "diagnosis": "Sinus rhythm with mild postural dizziness.",
            "notes": "Adequate hydration and oral electrolytes.",
            "medicines": [
                {
                    "medicine_name": "Oral Rehydration Salts",
                    "dosage": "1 Sachet",
                    "frequency": "Twice a day",
                    "duration": "5 Days",
                    "timing": "After Food",
                    "instructions": "Dissolve in 1 liter water."
                }
            ]
        }
        res_rx = await client.post("/api/prescriptions", json=rx_payload, headers=headers_doc)
        assert res_rx.status_code in (200, 201), f"Prescription failed: {res_rx.text}"
        rx_obj = res_rx.json()
        rx_id = rx_obj["id"]
        print(f"✅ Prescription #{rx_obj['rx_number']} issued successfully")

        # Attempt duplicate prescription for same consultation -> must be rejected
        res_duplicate_rx = await client.post("/api/prescriptions", json=rx_payload, headers=headers_doc)
        assert res_duplicate_rx.status_code in (400, 409), f"Expected conflict for duplicate prescription, got {res_duplicate_rx.status_code}"
        print("✅ Duplicate prescription for same consultation strictly rejected")

        # 13. Doctor Access to Assigned Patients & Longitudinal History
        print("\n[TEST 13] Testing Doctor Access to Assigned Patients & Clinical History...")
        # Doctor views assigned patients
        res_doc_patients = await client.get("/api/doctors/me/patients", headers=headers_doc)
        assert res_doc_patients.status_code == 200
        assigned_patients = res_doc_patients.json()
        assert any(p["id"] == patient_profile_id for p in assigned_patients), "Patient must appear in doctor assigned patients"
        print(f"✅ Doctor retrieved {len(assigned_patients)} assigned patients")

        # Doctor views patient history
        res_history = await client.get(f"/api/doctors/me/patients/{patient_profile_id}/history", headers=headers_doc)
        assert res_history.status_code == 200, f"History access failed: {res_history.text}"
        hist_data = res_history.json()
        assert hist_data["patient"]["full_name"] == reg_payload["full_name"]
        assert len(hist_data["consultations"]) >= 1
        assert len(hist_data["prescriptions"]) >= 1
        assert hist_data["prescriptions"][0]["rx_number"] == rx_obj["rx_number"]
        print("✅ Doctor accessed patient longitudinal history (demographics, previous consultations, and prescriptions)")

        # Doctor attempts history access for an unauthorized random patient ID
        res_unauth_hist = await client.get("/api/doctors/me/patients/999999/history", headers=headers_doc)
        assert res_unauth_hist.status_code in (403, 404), f"Expected 403/404 for unassigned patient, got {res_unauth_hist.status_code}"
        print("✅ History access denied for unassigned patient")

        # 14. Admin Doctor Deletion
        print("\n[TEST 14] Testing Admin Doctor Deletion...")
        # Admin creates temporary doctor to delete
        temp_email = f"dr.temp.{unique_num}@telemed.com"
        res_temp_doc = await client.post("/api/admin/doctors", json={
            "email": temp_email,
            "password": "TempPassword123!",
            "full_name": f"Dr. Temp Doctor {unique_num}",
            "qualification": "MBBS",
            "specialty": "Pediatrician",
            "experience_years": 3,
            "hospital_name": "Clinic",
            "consultation_fee": 400.0,
            "bio": "Temporary bio"
        }, headers=headers_admin)
        assert res_temp_doc.status_code in (200, 201)
        temp_doc_id = res_temp_doc.json()["id"]
        print(f"✅ Created temporary doctor ID {temp_doc_id}")

        # Delete doctor
        res_del_doc = await client.delete(f"/api/admin/doctors/{temp_doc_id}", headers=headers_admin)
        assert res_del_doc.status_code == 200, f"Doctor deletion failed: {res_del_doc.text}"
        print(f"✅ Admin deleted doctor ID {temp_doc_id}")

        # Verify doctor is no longer in listing
        res_verify_del = await client.get(f"/api/doctors/{temp_doc_id}")
        assert res_verify_del.status_code == 404
        print("✅ Verified deleted doctor no longer exists in system")

    print("\n" + "=" * 65)
    print("🎉 ALL 14 COMPREHENSIVE END-TO-END VERIFICATION TESTS PASSED 100%!")
    print("=" * 65)

if __name__ == "__main__":
    asyncio.run(run_tests())
