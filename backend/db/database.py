

from sqlalchemy         import create_engine
from sqlalchemy.orm     import sessionmaker, declarative_base
from core.config        import settings


engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,      
    pool_size=10,
    max_overflow=20,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """
    Yields a database session and ensures it is closed after the request.
    Use as a FastAPI dependency:
        db: Session = Depends(get_db)
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
