
from fastapi                  import FastAPI
from fastapi.middleware.cors  import CORSMiddleware

from core.config   import settings
from db.database   import engine
from db.models     import Base

# Import all routers
from api.auth       import router as auth_router
from api.judges     import router as judges_router
from api.courtrooms import router as courtrooms_router
from api.cases      import router as cases_router
from api.timetable  import router as timetable_router

app = FastAPI(
    title       = settings.APP_NAME,
    description = (
        "Intelligent Court Hearing Scheduling System API\n\n"
        "Two-component AI pipeline:\n"
        "- Random Forest regression model (duration prediction)\n"
        "- Rule-based constraint engine (C1 Judge Availability, "
        "C2 Courtroom Availability, C3 Judge Specialisation, C4 Courtroom Capacity)"
    ),
    version     = settings.APP_VERSION,
    docs_url    = "/docs",
    redoc_url   = "/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins     = ["http://localhost:3000", "http://127.0.0.1:3000",
                         "http://localhost:5173"], 
    allow_credentials = True,
    allow_methods     = ["*"],
    allow_headers     = ["*"],
)

app.include_router(auth_router)
app.include_router(judges_router)
app.include_router(courtrooms_router)
app.include_router(cases_router)
app.include_router(timetable_router)


@app.on_event("startup")
def startup():
    # Create all tables if they don't exist
    Base.metadata.create_all(bind=engine)
    print("[startup] Database tables verified.")

    # Seed initial data if database is empty
    _seed_initial_data()


def _seed_initial_data():
    from db.database import SessionLocal
    from db.crud     import (get_all_judges, create_judge,
                              get_all_courtrooms, create_courtroom,
                              get_user_by_username, create_user)
    db = SessionLocal()
    try:
        if not get_user_by_username(db, "admin"):
            create_user(db, username="admin", email="admin@courtschedule.ng",
                        full_name="System Administrator",
                        password="Admin@1234", role="superadmin")
            print("[seed] Default admin user created. Username: admin | Password: Admin@1234")
            print("[seed] ⚠  Change the default password immediately after first login.")

        if not get_all_judges(db):
            JUDGES = [
                ("J001","Justice Adeyemi",   ["Civil","Commercial","Land"]),
                ("J002","Justice Okonkwo",   ["Criminal","Constitutional"]),
                ("J003","Justice Babatunde", ["Family","Labour","Civil"]),
                ("J004","Justice Eze",       ["Commercial","Civil","Land"]),
                ("J005","Justice Nwosu",     ["Criminal","Labour"]),
                ("J006","Justice Aliyu",     ["Constitutional","Criminal","Civil"]),
                ("J007","Justice Afolabi",   ["Family","Labour","Commercial"]),
                ("J008","Justice Danjuma",   ["Land","Civil","Family"]),
            ]
            for code, name, specs in JUDGES:
                create_judge(db, code, name, specs)
            print(f"[seed] {len(JUDGES)} judges seeded.")

        if not get_all_courtrooms(db):
            ROOMS = [
                ("CR01","Courtroom 1",12), ("CR02","Courtroom 2",8),
                ("CR03","Courtroom 3",15), ("CR04","Courtroom 4",6),
                ("CR05","Courtroom 5",10), ("CR06","Courtroom 6",20),
                ("CR07","Courtroom 7",8),  ("CR08","Courtroom 8",12),
            ]
            for code, name, cap in ROOMS:
                create_courtroom(db, code, name, cap)
            print(f"[seed] {len(ROOMS)} courtrooms seeded.")

    finally:
        db.close()


@app.get("/health", tags=["System"])
def health():
    return {
        "status":  "ok",
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
    }


@app.get("/", tags=["System"])
def root():
    return {
        "message": "Intelligent Court Scheduling API is running.",
        "docs":    "http://localhost:8000/docs",
    }
