"""
init_db.py
──────────
Standalone script to create all database tables and seed initial data.
Run this ONCE before starting the server for the first time.

Usage:
    python init_db.py
"""

import sys, os
sys.path.insert(0, os.path.dirname(__file__))

from db.database import engine, SessionLocal
from db.models   import Base
from db.crud     import (create_user, get_user_by_username,
                          create_judge, get_all_judges,
                          create_courtroom, get_all_courtrooms)

def init():
    print("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    print("Tables created successfully.")

    db = SessionLocal()
    try:
        # ── Default superadmin ────────────────────────────────────────────────
        if not get_user_by_username(db, "admin"):
            create_user(db, username="admin",
                        email="admin@courtschedule.ng",
                        full_name="System Administrator",
                        password="Admin@1234",
                        role="superadmin")
            print("Default admin created  →  username: admin | password: Admin@1234")
            print("⚠  Change this password immediately after first login!")
        else:
            print("Admin user already exists, skipping.")

        # ── Judges ────────────────────────────────────────────────────────────
        if not get_all_judges(db):
            judges = [
                ("J001","Justice Adeyemi",   ["Civil","Commercial","Land"]),
                ("J002","Justice Okonkwo",   ["Criminal","Constitutional"]),
                ("J003","Justice Babatunde", ["Family","Labour","Civil"]),
                ("J004","Justice Eze",       ["Commercial","Civil","Land"]),
                ("J005","Justice Nwosu",     ["Criminal","Labour"]),
                ("J006","Justice Aliyu",     ["Constitutional","Criminal","Civil"]),
                ("J007","Justice Afolabi",   ["Family","Labour","Commercial"]),
                ("J008","Justice Danjuma",   ["Land","Civil","Family"]),
            ]
            for code, name, specs in judges:
                create_judge(db, code, name, specs)
            print(f"{len(judges)} judges seeded.")
        else:
            print("Judges already exist, skipping.")

        # ── Courtrooms ────────────────────────────────────────────────────────
        if not get_all_courtrooms(db):
            rooms = [
                ("CR01","Courtroom 1",12,"Main Building"),
                ("CR02","Courtroom 2",8, "Main Building"),
                ("CR03","Courtroom 3",15,"Annex A"),
                ("CR04","Courtroom 4",6, "Annex A"),
                ("CR05","Courtroom 5",10,"Annex B"),
                ("CR06","Courtroom 6",20,"Main Building"),
                ("CR07","Courtroom 7",8, "Annex B"),
                ("CR08","Courtroom 8",12,"Main Building"),
            ]
            for code, name, cap, loc in rooms:
                create_courtroom(db, code, name, cap, loc)
            print(f"{len(rooms)} courtrooms seeded.")
        else:
            print("Courtrooms already exist, skipping.")

        print("\nDatabase initialisation complete.")

    finally:
        db.close()

if __name__ == "__main__":
    init()
