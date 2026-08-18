from pydantic import BaseModel
from typing import Optional, List
import datetime

class SchoolCreate(BaseModel):
    name: str
    admin_email: str

class SchoolResponse(BaseModel):
    id: int
    name: str
    school_code: str
    class Config:
        orm_mode = True

class TeacherLogin(BaseModel):
    school_code: str
    email: str
    password: str

class StudentLogin(BaseModel):
    school_code: str
    student_id_str: str
    pin: str
    disorder_profile: Optional[str] = None # For first login

class StudentCreate(BaseModel):
    student_id_str: str
    name: str
    grade: str
    pin: str
    classroom_id: str = "main"

class StudentResponse(BaseModel):
    id: int
    student_id_str: str
    name: str
    grade: str
    disorder_profile: Optional[str]
    classroom_id: str
    class Config:
        orm_mode = True

class TelemetryPayload(BaseModel):
    url: str
    friction_score: float
    gaze_score: float
    scroll_erratic: float
    keystrokes: int
    timestamp: int

    @property
    def feature_vector(self):
        return [self.friction_score, self.gaze_score, self.scroll_erratic, self.keystrokes]

