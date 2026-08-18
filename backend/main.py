from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
from auth import router as auth_router
from api.telemetry import router as telemetry_router
from api.classroom import router as classroom_router
from api.students import router as students_router
import uvicorn

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="NALE Backend API v2")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(telemetry_router)
app.include_router(classroom_router)
app.include_router(students_router)

@app.get("/")
def read_root():
    return {"status": "NALE Backend v2 is running"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
