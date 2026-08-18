from sklearn.ensemble import IsolationForest
import pickle
import os
from ..models import TelemetryEvent

MODEL_DIR = "ml_models"

if not os.path.exists(MODEL_DIR):
    os.makedirs(MODEL_DIR)

def get_or_train_model(student_id: int, db):
    model_path = os.path.join(MODEL_DIR, f"{student_id}.pkl")
    
    if os.path.exists(model_path):
        with open(model_path, "rb") as f:
            return pickle.load(f)
            
    # Train if we have enough data
    events = db.query(TelemetryEvent).filter(TelemetryEvent.student_id == student_id).limit(200).all()
    if len(events) < 20: # Use low threshold for demo
        return None
        
    X = [[e.friction_score, e.gaze_score, e.scroll_erratic, e.keystrokes] for e in events]
    
    model = IsolationForest(contamination=0.1, random_state=42)
    model.fit(X)
    
    with open(model_path, "wb") as f:
        pickle.dump(model, f)
        
    return model
