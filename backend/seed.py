from app.database import SessionLocal, engine
from app import models, security
models.Base.metadata.create_all(bind=engine)
def seed():
    db = SessionLocal()
    admin = db.query(models.User).filter(models.User.email == "admin@grampanchayat.in").first()
    if not admin:
        new_admin = models.User(
            email="admin@grampanchayat.in",
            hashed_password=security.get_password_hash("admin123"),
            full_name="Admin",
            role="admin"
        )
        db.add(new_admin)
        db.commit()
        print("Admin user created: admin@grampanchayat.in / admin123")
    else:
        print("Admin user already exists")
    db.close()
if __name__ == "__main__":
    seed()