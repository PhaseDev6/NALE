from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import Student, TelemetryEvent, InterventionLog, School
from auth.jwt import get_password_hash
import random
import math
import datetime

router = APIRouter(prefix="/admin", tags=["admin"])

STUDY_URLS = [
    "https://en.wikipedia.org/wiki/Photosynthesis",
    "https://www.khanacademy.org/math/algebra",
    "https://docs.python.org/3/tutorial/",
    "https://en.wikipedia.org/wiki/World_War_II",
    "https://www.khanacademy.org/science/biology",
    "https://en.wikipedia.org/wiki/Climate_change",
]

INTERVENTION_TYPES = ["increase_font_size", "add_line_spacing", "simplify_layout", "focus_mode", "breathing_prompt"]

MOCK_STUDENTS = [
    {"id": "S001", "name": "Aisha Patel",   "pin": "1111", "disorder": "dyslexia"},
    {"id": "S002", "name": "Rohan Mehta",   "pin": "2222", "disorder": "adhd"},
    {"id": "S003", "name": "Priya Sharma",  "pin": "3333", "disorder": "anxiety"},
    {"id": "S004", "name": "Dev Kumar",     "pin": "4444", "disorder": "default"},
    {"id": "S005", "name": "Kavya Reddy",   "pin": "5555", "disorder": "dyslexia"},
    {"id": "S006", "name": "Arjun Singh",   "pin": "6666", "disorder": "adhd"},
    {"id": "S007", "name": "Meera Nair",    "pin": "7777", "disorder": "default"},
    {"id": "S008", "name": "Vikram Joshi",  "pin": "8888", "disorder": "anxiety"},
]

def friction_for(disorder, day_of_month, hour, noise):
    base = {"dyslexia": 0.55, "adhd": 0.50, "anxiety": 0.45, "default": 0.28}[disorder]
    time_factor = math.sin((hour - 8) * math.pi / 12) * 0.15
    exam_factor = 0.20 if 10 <= day_of_month <= 15 else 0.0
    score = base + time_factor + exam_factor + noise
    return round(max(0.0, min(1.0, score)), 4)

@router.get("/seed")
def seed_mock_data(db: Session = Depends(get_db)):
    school = db.query(School).filter(School.school_code == "BPS-1234").first()
    if not school:
        return {"error": "School BPS-1234 not found. Run the app first to auto-seed it."}

    students_created = 0
    events_created = 0
    interventions_created = 0
    now = datetime.datetime.utcnow()

    for s_data in MOCK_STUDENTS:
        student = db.query(Student).filter(
            Student.school_id == school.id,
            Student.student_id_str == s_data["id"]
        ).first()

        if not student:
            student = Student(
                school_id=school.id,
                student_id_str=s_data["id"],
                name=s_data["name"],
                grade="9th",
                disorder_profile=s_data["disorder"],
                pin_hash=get_password_hash(s_data["pin"]),
                classroom_id="main"
            )
            db.add(student)
            db.flush()
            students_created += 1

        for day_offset in range(30, 0, -1):
            day_date = now - datetime.timedelta(days=day_offset)
            if day_date.weekday() >= 5:
                continue

            num_sessions = random.randint(2, 4)
            session_hours = random.sample(range(8, 16), num_sessions)

            for hour in session_hours:
                num_pings = random.randint(3, 6)
                for _ in range(num_pings):
                    noise = random.gauss(0, 0.07)
                    friction = friction_for(s_data["disorder"], day_date.day, hour, noise)
                    gaze = min(1.0, friction * random.uniform(0.7, 1.2))
                    scroll = min(1.0, friction * (random.uniform(0.8, 1.4) if s_data["disorder"] == "adhd" else random.uniform(0.3, 0.9)))
                    keystrokes = max(0, int(30 - friction * 25 + random.gauss(0, 5)))

                    event_time = day_date.replace(
                        hour=hour,
                        minute=random.randint(0, 59),
                        second=random.randint(0, 59),
                        microsecond=0
                    )
                    ts = int(event_time.timestamp() * 1000)

                    event = TelemetryEvent(
                        student_id=student.id,
                        url=random.choice(STUDY_URLS),
                        friction_score=friction,
                        gaze_score=round(gaze, 4),
                        scroll_erratic=round(scroll, 4),
                        keystrokes=keystrokes,
                        timestamp=ts
                    )
                    db.add(event)
                    events_created += 1

                    if friction > 0.65 and random.random() < 0.4:
                        log = InterventionLog(
                            student_id=student.id,
                            intervention_type=random.choice(INTERVENTION_TYPES),
                            trigger_score=friction,
                            timestamp=ts
                        )
                        db.add(log)
                        interventions_created += 1

    db.commit()
    return {
        "status": "Seeded successfully",
        "students_created": students_created,
        "telemetry_events": events_created,
        "interventions_logged": interventions_created
    }
