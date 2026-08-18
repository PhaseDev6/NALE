from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Student, TelemetryEvent, InterventionLog
from schemas import StudentResponse

router = APIRouter(prefix="/api/student", tags=["student"])

@router.get("/{student_id}/profile", response_model=StudentResponse)
def get_student_profile(student_id: int, db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    return student

@router.get("/{student_id}/history")
def get_student_history(student_id: int, limit: int = 50, db: Session = Depends(get_db)):
    events = db.query(TelemetryEvent).filter(TelemetryEvent.student_id == student_id).order_by(TelemetryEvent.timestamp.desc()).limit(limit).all()

    return [e.__dict__ for e in reversed(events)]

@router.get("/{student_id}/interventions")
def get_student_interventions(student_id: int, limit: int = 10, db: Session = Depends(get_db)):
    logs = db.query(InterventionLog).filter(InterventionLog.student_id == student_id).order_by(InterventionLog.timestamp.desc()).limit(limit).all()
    return [log.__dict__ for log in logs]

