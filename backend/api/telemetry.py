from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import TelemetryEvent, InterventionLog
from schemas import TelemetryPayload
from auth.jwt import get_current_student
from ml.baseline import get_or_train_model
from ml.interventions import select_intervention
from api.classroom import ws_manager

router = APIRouter(prefix="/api/telemetry", tags=["telemetry"])

@router.post("")
async def ingest_telemetry(payload: TelemetryPayload, student=Depends(get_current_student), db: Session = Depends(get_db)):
    # Persist raw event
    event = TelemetryEvent(**payload.dict(), student_id=student.id)
    db.add(event)
    
    # Get or train ML model
    model = get_or_train_model(student.id, db)
    
    is_anomalous = False
    if model:
        # returns 1 for inliers, -1 for outliers
        is_anomalous = model.predict([payload.feature_vector])[0] == -1
    else:
        # Fallback heuristic if not enough data
        is_anomalous = payload.friction_score > 0.7 or payload.gaze_score > 0.7

    intervention = None
    if is_anomalous:
        intervention = select_intervention(student.disorder_profile, payload.friction_score)
        log = InterventionLog(
            student_id=student.id, 
            intervention_type=intervention, 
            trigger_score=payload.friction_score,
            timestamp=payload.timestamp
        )
        db.add(log)
        
    db.commit()

    # Broadcast to websocket
    await ws_manager.broadcast(student.classroom_id, {
        "student_id": student.id,
        "student_name": student.name,
        "friction_score": payload.friction_score,
        "is_anomalous": bool(is_anomalous),
        "intervention": intervention
    })

    return {"anomalous": bool(is_anomalous), "intervention": intervention}

