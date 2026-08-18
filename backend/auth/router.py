from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import School, Student, Teacher
from ..schemas import SchoolCreate, SchoolResponse, StudentLogin, StudentCreate, StudentResponse
from .jwt import get_password_hash, verify_password, create_access_token, ACCESS_TOKEN_EXPIRE_MINUTES
import random
import string
from datetime import timedelta

router = APIRouter(prefix="/auth", tags=["auth"])

def generate_school_code():
    return "BPS-" + "".join(random.choices(string.digits, k=4))

@router.post("/school/register", response_model=SchoolResponse)
def register_school(school_in: SchoolCreate, db: Session = Depends(get_db)):
    code = generate_school_code()
    # Ensure unique
    while db.query(School).filter(School.school_code == code).first():
        code = generate_school_code()
        
    db_school = School(name=school_in.name, school_code=code)
    db.add(db_school)
    db.commit()
    db.refresh(db_school)
    return db_school

@router.post("/student/login")
def login_student(login_data: StudentLogin, db: Session = Depends(get_db)):
    school = db.query(School).filter(School.school_code == login_data.school_code).first()
    if not school:
        raise HTTPException(status_code=404, detail="School not found")
        
    student = db.query(Student).filter(
        Student.school_id == school.id,
        Student.student_id_str == login_data.student_id_str
    ).first()
    
    if not student:
        # Auto-create for demo purposes if it doesn't exist
        student = Student(
            school_id=school.id,
            student_id_str=login_data.student_id_str,
            name=f"Student {login_data.student_id_str}",
            grade="6th",
            disorder_profile=login_data.disorder_profile or "default",
            pin_hash=get_password_hash(login_data.pin)
        )
        db.add(student)
        db.commit()
        db.refresh(student)
    else:
        # Verify PIN
        if not verify_password(login_data.pin, student.pin_hash):
            raise HTTPException(status_code=401, detail="Invalid PIN")
            
        # Update disorder profile if provided (e.g. self-selected on first real login)
        if login_data.disorder_profile and student.disorder_profile != login_data.disorder_profile:
            student.disorder_profile = login_data.disorder_profile
            db.commit()

    # Create JWT
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": student.id, "role": "student", "name": student.name}, expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "student": {
            "id": student.id,
            "name": student.name,
            "disorder_profile": student.disorder_profile
        }
    }
