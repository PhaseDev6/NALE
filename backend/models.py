from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from database import Base
import datetime

class School(Base):
    __tablename__ = "schools"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    school_code = Column(String, unique=True, index=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class Teacher(Base):
    __tablename__ = "teachers"
    id = Column(Integer, primary_key=True, index=True)
    school_id = Column(Integer, ForeignKey("schools.id"))
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    name = Column(String)

class Student(Base):
    __tablename__ = "students"
    id = Column(Integer, primary_key=True, index=True)
    school_id = Column(Integer, ForeignKey("schools.id"))
    student_id_str = Column(String, index=True)
    name = Column(String)
    grade = Column(String)
    disorder_profile = Column(String)
    pin_hash = Column(String)
    classroom_id = Column(String, default="main")

class TelemetryEvent(Base):
    __tablename__ = "telemetry_events"
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"))
    url = Column(String)
    friction_score = Column(Float)
    gaze_score = Column(Float)
    scroll_erratic = Column(Float)
    keystrokes = Column(Integer)
    timestamp = Column(Integer)

class InterventionLog(Base):
    __tablename__ = "intervention_logs"
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"))
    intervention_type = Column(String)
    trigger_score = Column(Float)
    outcome_score = Column(Float, nullable=True)
    duration_ms = Column(Integer, nullable=True)
    timestamp = Column(Integer)
