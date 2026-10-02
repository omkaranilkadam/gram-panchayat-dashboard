"""
Seed script — creates admin user, 18 realistic complaints, timeline notes,
and default panchayat settings.  Run with:  python seed.py
"""
from datetime import datetime, timedelta
import random

from app.database import SessionLocal, engine, Base
from app.models import User, Complaint, ComplaintNote, PanchayatSettings
from app.security import get_password_hash


def seed_db():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    # ── Admin user ──────────────────────────────────────────
    admin = db.query(User).filter(User.username == "admin@grampanchayat.in").first()
    if not admin:
        admin = User(
            username="admin@grampanchayat.in",
            hashed_password=get_password_hash("admin123"),
            full_name="Sarpanch Rajendra Patil",
            role="admin",
        )
        db.add(admin)
        db.commit()
        db.refresh(admin)
        print("✓ Admin user created  (admin@grampanchayat.in / admin123)")
    else:
        print("• Admin user already exists")

    # ── Skip if complaints already seeded ───────────────────
    if db.query(Complaint).count() > 0:
        print("• Complaints already seeded — skipping")
        db.close()
        return

    # ── Complaint seed data ─────────────────────────────────
    now = datetime.utcnow()
    complaints_data = [
        {
            "title": "Large Pothole on Main Market Road",
            "description": "Main market road near the bus stand has developed large potholes making it dangerous for two-wheelers and pedestrians. Multiple accidents reported in the last week. Urgent repair needed before monsoon worsens the damage.",
            "category": "road",
            "priority": "critical",
            "status": "pending",
            "ward": "Ward 1",
            "complainant_name": "Ramesh Patil",
            "complainant_phone": "9876543210",
            "latitude": 21.1462,
            "longitude": 79.0890,
            "created_at": now - timedelta(days=2),
        },
        {
            "title": "Broken Streetlight Near Primary School",
            "description": "The streetlight on the road adjacent to Zilla Parishad Primary School has been non-functional for 15 days. Children walking to school in early morning are at risk. MSEDCL complaint filed but no response.",
            "category": "electricity",
            "priority": "high",
            "status": "in_progress",
            "ward": "Ward 3",
            "complainant_name": "Sunita Deshmukh",
            "complainant_phone": "9123456789",
            "latitude": 21.1475,
            "longitude": 79.0870,
            "created_at": now - timedelta(days=10),
        },
        {
            "title": "Water Pipeline Leak Near Hanuman Temple",
            "description": "Major water pipeline leak causing water logging and wastage. Approximately 5000 litres wasted daily. Road has become slippery and muddy. Senior citizens cannot walk safely.",
            "category": "water",
            "priority": "critical",
            "status": "pending",
            "ward": "Ward 2",
            "complainant_name": "Ganesh Wagh",
            "complainant_phone": "8765432109",
            "latitude": 21.1445,
            "longitude": 79.0865,
            "created_at": now - timedelta(days=1),
        },
        {
            "title": "Garbage Dumping Near Gram Panchayat Office",
            "description": "Residents are dumping garbage in the empty plot next to the Gram Panchayat office. Foul smell and mosquito breeding reported. Need regular garbage collection service and dustbins.",
            "category": "sanitation",
            "priority": "high",
            "status": "pending",
            "ward": "Ward 1",
            "complainant_name": "Priya Jadhav",
            "complainant_phone": "7654321098",
            "latitude": 21.1458,
            "longitude": 79.0882,
            "created_at": now - timedelta(days=5),
        },
        {
            "title": "Drainage Blocked in Ambedkar Nagar",
            "description": "Storm water drain is completely blocked with construction debris and garbage. During rain, water enters houses. 12 families severely affected. Health hazard due to stagnant water.",
            "category": "drainage",
            "priority": "critical",
            "status": "in_progress",
            "ward": "Ward 4",
            "complainant_name": "Ashok Kamble",
            "complainant_phone": "6543210987",
            "latitude": 21.1440,
            "longitude": 79.0900,
            "created_at": now - timedelta(days=15),
        },
        {
            "title": "Broken Hand Pump in Shivaji Nagar",
            "description": "The community hand pump is broken and rusted. This is the only water source for 20+ families in the area. Women and children have to walk 2 km for water daily.",
            "category": "water",
            "priority": "critical",
            "status": "resolved",
            "ward": "Ward 5",
            "complainant_name": "Manisha Gaikwad",
            "complainant_phone": "9988776655",
            "latitude": 21.1490,
            "longitude": 79.0850,
            "created_at": now - timedelta(days=45),
        },
        {
            "title": "Stray Cattle on Highway Road",
            "description": "Large number of stray cattle roaming on the state highway passing through the village. Multiple near-miss accidents with trucks and buses. Need cattle pound facility.",
            "category": "animal_control",
            "priority": "high",
            "status": "pending",
            "ward": "Ward 2",
            "complainant_name": "Vishnu Mane",
            "complainant_phone": "8877665544",
            "latitude": 21.1430,
            "longitude": 79.0910,
            "created_at": now - timedelta(days=7),
        },
        {
            "title": "Illegal Encroachment on Village Playground",
            "description": "A local shop owner has extended his shop structure onto the village playground. Children have no space to play. Panchayat notice was ignored. Legal action needed.",
            "category": "encroachment",
            "priority": "medium",
            "status": "pending",
            "ward": "Ward 3",
            "complainant_name": "Suresh Tayade",
            "complainant_phone": "7766554433",
            "latitude": 21.1470,
            "longitude": 79.0875,
            "created_at": now - timedelta(days=30),
        },
        {
            "title": "Community Hall Roof Damaged by Storm",
            "description": "The asbestos roof sheets of the community hall are broken due to last month's storm. Rain water leaking inside. Hall is used for village meetings, weddings, and gram sabha.",
            "category": "public_property",
            "priority": "medium",
            "status": "in_progress",
            "ward": "Ward 1",
            "complainant_name": "Rajesh Kulkarni",
            "complainant_phone": "9665544332",
            "latitude": 21.1455,
            "longitude": 79.0895,
            "created_at": now - timedelta(days=20),
        },
        {
            "title": "Open Electric Wires Near Bus Stop",
            "description": "High-tension electric wires hanging dangerously low near the village bus stop. Extremely dangerous during monsoon season. MSEDCL notified but no action taken for 3 weeks.",
            "category": "electricity",
            "priority": "critical",
            "status": "resolved",
            "ward": "Ward 2",
            "complainant_name": "Anil Bhosale",
            "complainant_phone": "8554433221",
            "latitude": 21.1448,
            "longitude": 79.0878,
            "created_at": now - timedelta(days=60),
        },
        {
            "title": "Missing Road Signs at Village Crossroad",
            "description": "The main crossroad near the milk dairy lacks any road signs, speed breakers, or signals. Frequent accidents between tractors and two-wheelers. Two serious injuries last month.",
            "category": "road",
            "priority": "high",
            "status": "pending",
            "ward": "Ward 4",
            "complainant_name": "Deepak Shinde",
            "complainant_phone": "7443322110",
            "latitude": 21.1435,
            "longitude": 79.0905,
            "created_at": now - timedelta(days=12),
        },
        {
            "title": "Contaminated Water in Public Well",
            "description": "Water from the public well near the graveyard has turned yellowish and has foul smell. Lab testing urgently needed. Several villagers using this water have fallen sick with diarrhoea.",
            "category": "water",
            "priority": "critical",
            "status": "in_progress",
            "ward": "Ward 5",
            "complainant_name": "Savita More",
            "complainant_phone": "9332211009",
            "latitude": 21.1500,
            "longitude": 79.0860,
            "created_at": now - timedelta(days=8),
        },
        {
            "title": "Fallen Tree on Power Line — Ward 3 Blackout",
            "description": "Large banyan tree branch fell on power line during yesterday's storm. Entire Ward 3 without electricity for 2 days. Need urgent tree removal and line repair.",
            "category": "electricity",
            "priority": "critical",
            "status": "resolved",
            "ward": "Ward 3",
            "complainant_name": "Mahadeo Pawar",
            "complainant_phone": "8221100998",
            "latitude": 21.1480,
            "longitude": 79.0868,
            "created_at": now - timedelta(days=35),
        },
        {
            "title": "School Boundary Wall Collapsed",
            "description": "Compound wall of the village secondary school collapsed after heavy rain. Children's safety at serious risk. Temporary barrier needed immediately before school reopens Monday.",
            "category": "public_property",
            "priority": "high",
            "status": "resolved",
            "ward": "Ward 1",
            "complainant_name": "Sharad Ingole",
            "complainant_phone": "7110099887",
            "latitude": 21.1460,
            "longitude": 79.0888,
            "created_at": now - timedelta(days=50),
        },
        {
            "title": "Open Defecation Near Riverside",
            "description": "Despite Swachh Bharat Abhiyan, open defecation continues near the river bank. Causing water pollution and health hazards. Need community toilet construction and awareness drive.",
            "category": "sanitation",
            "priority": "medium",
            "status": "pending",
            "ward": "Ward 5",
            "complainant_name": "Lakshmi Raut",
            "complainant_phone": "9009988776",
            "latitude": 21.1510,
            "longitude": 79.0845,
            "created_at": now - timedelta(days=25),
        },
        {
            "title": "Irregular Water Supply in Ward 4",
            "description": "Water supply timing has become irregular. Sometimes water comes at 3 AM, sometimes not at all for 2 days. Storage tanks are empty. 50+ families affected. Need fixed schedule.",
            "category": "water",
            "priority": "high",
            "status": "pending",
            "ward": "Ward 4",
            "complainant_name": "Nirmala Gawande",
            "complainant_phone": "8899877665",
            "latitude": 21.1442,
            "longitude": 79.0898,
            "created_at": now - timedelta(days=3),
        },
        {
            "title": "Damaged Approach Road to Village",
            "description": "The approach road connecting village to the state highway is severely damaged with craters. ST buses have stopped coming. Patients cannot reach hospital in emergency. Critical infrastructure.",
            "category": "road",
            "priority": "critical",
            "status": "in_progress",
            "ward": "Ward 2",
            "complainant_name": "Balaji Thakare",
            "complainant_phone": "7788766554",
            "latitude": 21.1425,
            "longitude": 79.0920,
            "created_at": now - timedelta(days=18),
        },
        {
            "title": "Mosquito Breeding in Stagnant Water",
            "description": "Stagnant water accumulated in abandoned construction site near the cemetery is a breeding ground for mosquitoes. Dengue and malaria cases increasing. Need fogging and water drainage urgently.",
            "category": "sanitation",
            "priority": "high",
            "status": "pending",
            "ward": "Ward 3",
            "complainant_name": "Sanjay Nimbalkar",
            "complainant_phone": "6677655443",
            "latitude": 21.1478,
            "longitude": 79.0880,
            "created_at": now - timedelta(days=4),
        },
    ]

    # ── Insert complaints ───────────────────────────────────
    for data in complaints_data:
        c = Complaint(**data)
        db.add(c)
    db.commit()
    print(f"✓ {len(complaints_data)} complaints created")

    # ── Add timeline notes ──────────────────────────────────
    all_complaints = db.query(Complaint).all()
    notes_added = 0

    for c in all_complaints:
        # Every complaint gets a creation note
        db.add(ComplaintNote(
            complaint_id=c.id,
            author="System",
            content="Complaint registered with status 'pending'",
            note_type="status_change",
            created_at=c.created_at,
        ))
        notes_added += 1

        if c.status == "in_progress":
            db.add(ComplaintNote(
                complaint_id=c.id,
                author="Sarpanch Rajendra Patil",
                content="Status changed from 'pending' to 'in_progress'",
                note_type="status_change",
                created_at=c.created_at + timedelta(days=2),
            ))
            db.add(ComplaintNote(
                complaint_id=c.id,
                author="Sarpanch Rajendra Patil",
                content="Work order issued. Contractor assigned for inspection.",
                note_type="note",
                created_at=c.created_at + timedelta(days=3),
            ))
            notes_added += 2

        if c.status == "resolved":
            db.add(ComplaintNote(
                complaint_id=c.id,
                author="Sarpanch Rajendra Patil",
                content="Status changed from 'pending' to 'in_progress'",
                note_type="status_change",
                created_at=c.created_at + timedelta(days=2),
            ))
            db.add(ComplaintNote(
                complaint_id=c.id,
                author="Sarpanch Rajendra Patil",
                content="Repair work completed. Verified on site.",
                note_type="note",
                created_at=c.created_at + timedelta(days=7),
            ))
            db.add(ComplaintNote(
                complaint_id=c.id,
                author="Sarpanch Rajendra Patil",
                content="Status changed from 'in_progress' to 'resolved'",
                note_type="status_change",
                created_at=c.created_at + timedelta(days=8),
            ))
            notes_added += 3

    db.commit()
    print(f"✓ {notes_added} timeline notes created")

    # ── Default settings ────────────────────────────────────
    if not db.query(PanchayatSettings).first():
        db.add(PanchayatSettings(
            panchayat_name="ग्राम पंचायत कामठी",
            panchayat_name_en="Gram Panchayat Kamptee",
            village_name="Kamptee",
            district="Nagpur",
            state="Maharashtra",
            admin_name="Sarpanch Rajendra Patil",
            contact_phone="+91 712 264 0000",
            contact_email="gp.kamptee@maharashtra.gov.in",
            notifications_enabled=True,
            dark_mode=False,
        ))
        db.commit()
        print("✓ Default panchayat settings created")

    db.close()
    print("\n🎉 Database seeded successfully!")


if __name__ == "__main__":
    seed_db()
