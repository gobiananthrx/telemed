import random
import string
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, and_
from sqlalchemy.orm import selectinload

from app.database import get_async_db
from app.models.user import User, UserRole, VerificationOTP, OTPPurpose
from app.models.patient import PatientProfile
from app.schemas.auth import (
    PatientRegister, VerifyOTPRequest, ResendOTPRequest, LoginRequest,
    ForgotPasswordRequest, ResetPasswordRequest, TokenResponse
)
from app.schemas.user import UserResponse, PatientProfileUpdate
from app.core.security import get_password_hash, verify_password, create_access_token
from app.services.email_client import send_otp_email
from app.api.deps import get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])

def generate_otp() -> str:
    return "".join(random.choices(string.digits, k=6))

def generate_uhid() -> str:
    random_digits = "".join(random.choices(string.digits, k=5))
    return f"#TLM-{random_digits}"

@router.post("/register", response_model=dict)
async def register_patient(payload: PatientRegister, db: AsyncSession = Depends(get_async_db)):
    if payload.confirm_password and payload.password != payload.confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match")

    # Check if email exists
    stmt = select(User).options(selectinload(User.patient_profile)).where(User.email == payload.email.lower())
    res = await db.execute(stmt)
    existing_user = res.scalar_one_or_none()

    if existing_user:
        if existing_user.is_verified:
            raise HTTPException(status_code=400, detail="An account with this email already exists")
        # If user exists but not verified, update password and patient profile
        existing_user.hashed_password = get_password_hash(payload.password)
        if existing_user.patient_profile:
            existing_user.patient_profile.full_name = payload.full_name
            existing_user.patient_profile.phone = payload.phone
            existing_user.patient_profile.city = payload.city
            existing_user.patient_profile.blood_group = payload.blood_group
        else:
            patient_profile = PatientProfile(
                user_id=existing_user.id,
                full_name=payload.full_name,
                phone=payload.phone,
                city=payload.city,
                blood_group=payload.blood_group,
                uhid=generate_uhid()
            )
            db.add(patient_profile)
        user = existing_user
    else:
        user = User(
            email=payload.email.lower(),
            username=payload.email.lower(),
            hashed_password=get_password_hash(payload.password),
            role=UserRole.PATIENT,
            is_active=True,
            is_verified=False
        )
        db.add(user)
        await db.flush() # get user.id

        patient_profile = PatientProfile(
            user_id=user.id,
            full_name=payload.full_name,
            phone=payload.phone,
            city=payload.city,
            blood_group=payload.blood_group,
            uhid=generate_uhid()
        )
        db.add(patient_profile)

    # Invalidate previous OTPs
    stmt_otp = select(VerificationOTP).where(
        VerificationOTP.email == payload.email.lower(),
        VerificationOTP.purpose == OTPPurpose.REGISTRATION,
        VerificationOTP.is_used == False
    )
    old_otps = (await db.execute(stmt_otp)).scalars().all()
    for o in old_otps:
        o.is_used = True

    # Generate new OTP
    otp_code = generate_otp()
    otp_entry = VerificationOTP(
        email=payload.email.lower(),
        otp_code=otp_code,
        purpose=OTPPurpose.REGISTRATION,
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=10),
        is_used=False,
        attempts=0
    )
    db.add(otp_entry)
    await db.commit()

    # Dispatch email
    await send_otp_email(
        email=payload.email.lower(),
        otp=otp_code,
        purpose="REGISTRATION",
        name=payload.full_name
    )

    return {
        "success": True,
        "message": "Registration initiated. A 6-digit verification code has been sent to your email.",
        "email": payload.email.lower()
    }

@router.post("/verify-otp", response_model=TokenResponse)
async def verify_otp(payload: VerifyOTPRequest, db: AsyncSession = Depends(get_async_db)):
    # Find active OTP
    stmt = (
        select(VerificationOTP)
        .where(
            VerificationOTP.email == payload.email.lower(),
            VerificationOTP.purpose == payload.purpose,
            VerificationOTP.is_used == False
        )
        .order_by(VerificationOTP.created_at.desc())
    )
    res = await db.execute(stmt)
    otp_entry = res.scalars().first()

    if not otp_entry:
        raise HTTPException(status_code=400, detail="No active verification code found. Please request a new one.")

    # Check expiration
    if datetime.now(timezone.utc) > otp_entry.expires_at:
        otp_entry.is_used = True
        await db.commit()
        raise HTTPException(status_code=400, detail="Verification code has expired. Please request a new one.")

    # Check attempts
    if otp_entry.attempts >= 5:
        otp_entry.is_used = True
        await db.commit()
        raise HTTPException(status_code=400, detail="Too many invalid attempts. Please request a new code.")

    if otp_entry.otp_code != payload.otp_code.strip():
        otp_entry.attempts += 1
        await db.commit()
        remaining = 5 - otp_entry.attempts
        raise HTTPException(status_code=400, detail=f"Invalid verification code. {remaining} attempts remaining.")

    # Mark OTP used
    otp_entry.is_used = True

    # Find User
    user_stmt = (
        select(User)
        .options(selectinload(User.patient_profile))
        .where(User.email == payload.email.lower())
    )
    user_res = await db.execute(user_stmt)
    user = user_res.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User account not found")

    user.is_verified = True
    await db.commit()
    await db.refresh(user)

    token = create_access_token(subject=user.id, role=user.role.value)
    name = user.patient_profile.full_name if user.patient_profile else user.email
    uhid = user.patient_profile.uhid if user.patient_profile else None
    patient_id = user.patient_profile.id if user.patient_profile else None

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        role=user.role.value,
        user_id=user.id,
        email=user.email,
        name=name,
        uhid=uhid,
        patient_id=patient_id
    )

@router.post("/resend-otp", response_model=dict)
async def resend_otp(payload: ResendOTPRequest, db: AsyncSession = Depends(get_async_db)):
    stmt = (
        select(VerificationOTP)
        .where(
            VerificationOTP.email == payload.email.lower(),
            VerificationOTP.purpose == payload.purpose,
            VerificationOTP.is_used == False
        )
        .order_by(VerificationOTP.created_at.desc())
    )
    otp_entry = (await db.execute(stmt)).scalars().first()

    # Rate limiting: 60s cooldown
    if otp_entry:
        elapsed = datetime.now(timezone.utc) - otp_entry.last_sent_at
        if elapsed.total_seconds() < 60:
            retry_after = int(60 - elapsed.total_seconds())
            raise HTTPException(status_code=429, detail=f"Please wait {retry_after} seconds before requesting a new code.")
        otp_entry.is_used = True

    # Check user name
    u_stmt = select(User).options(selectinload(User.patient_profile)).where(User.email == payload.email.lower())
    u = (await db.execute(u_stmt)).scalar_one_or_none()
    name = u.patient_profile.full_name if (u and u.patient_profile) else "Patient"

    new_code = generate_otp()
    new_otp = VerificationOTP(
        email=payload.email.lower(),
        otp_code=new_code,
        purpose=payload.purpose,
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=10),
        is_used=False,
        attempts=0
    )
    db.add(new_otp)
    await db.commit()

    await send_otp_email(
        email=payload.email.lower(),
        otp=new_code,
        purpose=payload.purpose.value,
        name=name
    )

    return {"success": True, "message": "Verification code resent successfully"}

@router.post("/login", response_model=TokenResponse)
async def login_patient(payload: LoginRequest, db: AsyncSession = Depends(get_async_db)):
    identifier = payload.identifier.strip().lower()
    
    # Query user by email or username or patient phone
    stmt = (
        select(User)
        .outerjoin(PatientProfile)
        .options(
            selectinload(User.patient_profile),
            selectinload(User.doctor_profile)
        )
        .where(
            or_(
                User.email == identifier,
                User.username == identifier,
                PatientProfile.phone == identifier
            )
        )
    )
    res = await db.execute(stmt)
    user = res.scalar_one_or_none()

    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email/phone or password")

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Your account has been deactivated. Please contact support.")

    # Strict role separation: DOCTOR and ADMIN users MUST NOT be able to login/access the patient side
    if user.role != UserRole.PATIENT:
        raise HTTPException(
            status_code=403,
            detail="Doctors and Administrators must use the administrative portal at /admin to sign in."
        )

    # Only patient logins require email verification
    if not user.is_verified:
        raise HTTPException(
            status_code=403,
            detail="Account not verified. Please verify your email with the OTP sent to you."
        )

    token = create_access_token(subject=user.id, role=user.role.value)
    
    name = (
        user.patient_profile.full_name if user.patient_profile 
        else (user.doctor_profile.full_name if user.doctor_profile else user.email)
    )
    uhid = user.patient_profile.uhid if user.patient_profile else None
    doctor_id = user.doctor_profile.id if user.doctor_profile else None
    patient_id = user.patient_profile.id if user.patient_profile else None

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        role=user.role.value,
        user_id=user.id,
        email=user.email,
        name=name,
        uhid=uhid,
        doctor_id=doctor_id,
        patient_id=patient_id
    )

@router.post("/admin-login", response_model=TokenResponse)
async def admin_doctor_login(payload: LoginRequest, db: AsyncSession = Depends(get_async_db)):
    """
    Direct login for Doctors and Administrators at /admin.
    DO NOT REQUIRE EMAIL OTP.
    """
    identifier = payload.identifier.strip().lower()
    stmt = (
        select(User)
        .options(
            selectinload(User.doctor_profile),
            selectinload(User.patient_profile)
        )
        .where(or_(User.email == identifier, User.username == identifier))
    )
    res = await db.execute(stmt)
    user = res.scalar_one_or_none()

    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials for administrative portal")

    if user.role not in [UserRole.ADMIN, UserRole.DOCTOR]:
        raise HTTPException(status_code=403, detail="Access denied. This portal is for Doctors and Hospital Administrators only.")

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is deactivated")

    token = create_access_token(subject=user.id, role=user.role.value)
    name = user.doctor_profile.full_name if user.doctor_profile else "Administrator"
    doctor_id = user.doctor_profile.id if user.doctor_profile else None

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        role=user.role.value,
        user_id=user.id,
        email=user.email,
        name=name,
        doctor_id=doctor_id
    )

@router.post("/forgot-password", response_model=dict)
async def forgot_password(payload: ForgotPasswordRequest, db: AsyncSession = Depends(get_async_db)):
    email = payload.email.lower()
    stmt = select(User).options(selectinload(User.patient_profile)).where(User.email == email)
    user = (await db.execute(stmt)).scalar_one_or_none()

    if not user:
        # Avoid account enumeration
        return {"success": True, "message": "If an account exists with this email, a reset code has been sent."}

    # Invalidate previous reset OTPs
    old_stmt = select(VerificationOTP).where(
        VerificationOTP.email == email,
        VerificationOTP.purpose == OTPPurpose.PASSWORD_RESET,
        VerificationOTP.is_used == False
    )
    old_otps = (await db.execute(old_stmt)).scalars().all()
    for o in old_otps:
        o.is_used = True

    new_code = generate_otp()
    otp_entry = VerificationOTP(
        email=email,
        otp_code=new_code,
        purpose=OTPPurpose.PASSWORD_RESET,
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=10),
        is_used=False,
        attempts=0
    )
    db.add(otp_entry)
    await db.commit()

    name = user.patient_profile.full_name if user.patient_profile else "User"
    await send_otp_email(
        email=email,
        otp=new_code,
        purpose="PASSWORD_RESET",
        name=name
    )

    return {
        "success": True,
        "message": "A 6-digit password reset code has been dispatched to your email address."
    }

@router.post("/reset-password", response_model=dict)
async def reset_password(payload: ResetPasswordRequest, db: AsyncSession = Depends(get_async_db)):
    email = payload.email.lower()
    stmt = (
        select(VerificationOTP)
        .where(
            VerificationOTP.email == email,
            VerificationOTP.purpose == OTPPurpose.PASSWORD_RESET,
            VerificationOTP.is_used == False
        )
        .order_by(VerificationOTP.created_at.desc())
    )
    otp_entry = (await db.execute(stmt)).scalars().first()

    if not otp_entry:
        raise HTTPException(status_code=400, detail="Invalid or expired reset session. Please request a new code.")

    if datetime.now(timezone.utc) > otp_entry.expires_at:
        otp_entry.is_used = True
        await db.commit()
        raise HTTPException(status_code=400, detail="Verification code has expired. Please request a new one.")

    if otp_entry.attempts >= 5:
        otp_entry.is_used = True
        await db.commit()
        raise HTTPException(status_code=400, detail="Too many invalid attempts. Please request a new code.")

    if otp_entry.otp_code != payload.otp_code.strip():
        otp_entry.attempts += 1
        await db.commit()
        remaining = 5 - otp_entry.attempts
        raise HTTPException(status_code=400, detail=f"Invalid verification code. {remaining} attempts remaining.")

    otp_entry.is_used = True

    # Update User password
    u_stmt = select(User).where(User.email == email)
    user = (await db.execute(u_stmt)).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.hashed_password = get_password_hash(payload.new_password)
    await db.commit()

    return {"success": True, "message": "Password reset successfully. You can now log in with your new password."}

@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(current_user: User = Depends(get_current_user)):
    return current_user

@router.put("/me/profile", response_model=UserResponse)
async def update_my_profile(
    payload: PatientProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db)
):
    if current_user.role == UserRole.PATIENT and current_user.patient_profile:
        for field, value in payload.model_dump(exclude_unset=True).items():
            if value is not None:
                setattr(current_user.patient_profile, field, value)
        await db.commit()
        await db.refresh(current_user)
    return current_user
