from fastapi import FastAPI, Depends
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Database Configuration
DATABASE_URL = "mysql+pymysql://fastapi_user:password@localhost/kk_v1"

# Create Engine
engine = create_engine(DATABASE_URL)

# Create Session
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Initialize FastAPI
app = FastAPI()

@app.get("/")
def read_root():
    return {"message": "FastAPI is connected to MySQL"}

# Dependency to get a database session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Check database connection by running "SHOW TABLES"
@app.get("/show-tables")
def show_tables(db=Depends(get_db)):
    result = db.execute(text("SHOW TABLES"))
    tables = [row[0] for row in result.fetchall()]
    return {"tables": tables}