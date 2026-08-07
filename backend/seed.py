import datetime
from database import SessionLocal, engine, Base
import models
from auth import get_password_hash

def seed_db():
    print("Dropping existing tables and recreating database schema...")
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        print("Seeding database...")

        # 1. Create Studios
        studio_a = models.Studio(name="Aura Photography")
        studio_b = models.Studio(name="Vogue Studios")
        db.add_all([studio_a, studio_b])
        db.flush()

        print(f"Created Studio A: '{studio_a.name}' (ID: {studio_a.id})")
        print(f"Created Studio B: '{studio_b.name}' (ID: {studio_b.id})")

        # 2. Create Users
        hashed_pwd = get_password_hash("password123")
        
        user_a = models.User(
            studio_id=studio_a.id,
            name="Aura Owner",
            email="owner@aura.com",
            hashed_password=hashed_pwd,
            role="admin"
        )
        
        user_b = models.User(
            studio_id=studio_b.id,
            name="Vogue Owner",
            email="owner@vogue.com",
            hashed_password=hashed_pwd,
            role="admin"
        )
        db.add_all([user_a, user_b])
        db.flush()

        # 3. Create Clients
        client_a1 = models.Client(
            studio_id=studio_a.id,
            name="Alice Johnson",
            email="alice@johnson.com",
            phone="+1 555-0199",
            source="Instagram",
            preferences={"style": "Bright & Airy", "notes": "Prefers natural outdoor lighting."}
        )
        client_a2 = models.Client(
            studio_id=studio_a.id,
            name="Bob Miller",
            email="bob@miller.net",
            phone="+1 555-0142",
            source="Referral",
            preferences={"style": "Moody & Cinematic", "notes": "Wants a dark studio background."}
        )
        client_b1 = models.Client(
            studio_id=studio_b.id,
            name="Charlie Smith",
            email="charlie@smith.org",
            phone="+1 555-0177",
            source="Google Search",
            preferences={"style": "Clean Editorial", "notes": "Corporate headshots for resume."}
        )
        db.add_all([client_a1, client_a2, client_b1])
        db.flush()

        # 4. Create Bookings
        booking_a1 = models.Booking(
            studio_id=studio_a.id,
            client_id=client_a1.id,
            session_type="Wedding",
            scheduled_at=datetime.datetime.utcnow() + datetime.timedelta(days=10, hours=4),
            duration_minutes=360,
            status="Confirmed",
            price=3200.0,
            notes="Full-day wedding photography. Second shooter assigned."
        )
        booking_a2 = models.Booking(
            studio_id=studio_a.id,
            client_id=client_a2.id,
            session_type="Portrait",
            scheduled_at=datetime.datetime.utcnow() - datetime.timedelta(days=2),
            duration_minutes=90,
            status="Completed",
            price=450.0,
            notes="Family outdoor portrait session at Golden Hour."
        )
        booking_b1 = models.Booking(
            studio_id=studio_b.id,
            client_id=client_b1.id,
            session_type="Corporate Headshot",
            scheduled_at=datetime.datetime.utcnow() + datetime.timedelta(days=5, hours=2),
            duration_minutes=60,
            status="Confirmed",
            price=299.0,
            notes="Requires solid gray backdrop."
        )
        db.add_all([booking_a1, booking_a2, booking_b1])
        db.flush()

        # 5. Create Invoices
        invoice_a1 = models.Invoice(
            studio_id=studio_a.id,
            booking_id=booking_a1.id,
            client_id=client_a1.id,
            amount=3200.0,
            tax=256.0,
            status="Pending",
            due_at=datetime.datetime.utcnow() + datetime.timedelta(days=5)
        )
        invoice_a2 = models.Invoice(
            studio_id=studio_a.id,
            booking_id=booking_a2.id,
            client_id=client_a2.id,
            amount=450.0,
            tax=36.0,
            status="Paid",
            due_at=datetime.datetime.utcnow() - datetime.timedelta(days=2)
        )
        invoice_b1 = models.Invoice(
            studio_id=studio_b.id,
            booking_id=booking_b1.id,
            client_id=client_b1.id,
            amount=299.0,
            tax=0.0,
            status="Paid",
            due_at=datetime.datetime.utcnow() + datetime.timedelta(days=2)
        )
        db.add_all([invoice_a1, invoice_a2, invoice_b1])
        db.flush()

        # 6. Create Galleries
        gallery_a2 = models.Gallery(
            studio_id=studio_a.id,
            booking_id=booking_a2.id,
            title="Miller Family Outdoors",
            status="Active",
            expires_at=datetime.datetime.utcnow() + datetime.timedelta(days=90)
        )
        db.add(gallery_a2)
        db.flush()

        # Add Photos
        mock_photos = [
            {"orig": "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?q=80&w=1200", "tags": ["Family", "Outdoors", "Golden Hour"]},
            {"orig": "https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=1200", "tags": ["Portrait", "Kids"]},
        ]
        for p_data in mock_photos:
            p = models.Photo(
                gallery_id=gallery_a2.id,
                original_url=p_data["orig"],
                edited_url=p_data["orig"] + "&auto=format&fit=crop&sat=-15",
                is_selected=False,
                ai_tags=p_data["tags"]
            )
            db.add(p)

        # 7. Create Contracts
        contract_a1 = models.Contract(
            studio_id=studio_a.id,
            booking_id=booking_a1.id,
            client_id=client_a1.id,
            title="Standard Wedding Photography Agreement",
            content="This agreement outline terms for the standard wedding day coverage. The photographer reserves artistic license. Balance is due 5 days before the event.",
            status="Sent"
        )
        contract_a2 = models.Contract(
            studio_id=studio_a.id,
            booking_id=booking_a2.id,
            client_id=client_a2.id,
            title="Model Release & Styling Form",
            content="Permits the photographer to publish selected outdoor family portraits in portfolios and campaigns.",
            status="Signed",
            signature_name="Bob Miller",
            signed_at=datetime.datetime.utcnow() - datetime.timedelta(days=2),
            ip_address="192.168.1.50",
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
            document_hash="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
        )
        db.add_all([contract_a1, contract_a2])
        db.flush()

        # 8. Create Message Logs
        msg_a1_1 = models.MessageLog(
            studio_id=studio_a.id,
            client_id=client_a1.id,
            subject="Intake Form Completed",
            body="Welcome Alice! Your preferences style is set to 'Bright & Airy'.",
            channel="Email",
            status="Sent"
        )
        msg_a1_2 = models.MessageLog(
            studio_id=studio_a.id,
            client_id=client_a1.id,
            subject="Contract ready for review",
            body="Please sign the Wedding Contract link inside your client portal.",
            channel="Email",
            status="Sent"
        )
        msg_a2_1 = models.MessageLog(
            studio_id=studio_a.id,
            client_id=client_a2.id,
            subject="Shoot day details",
            body="Bob, just a reminder for your Golden Hour portrait shoot tomorrow.",
            channel="SMS",
            status="Sent"
        )
        db.add_all([msg_a1_1, msg_a1_2, msg_a2_1])

        db.commit()
        print("Database successfully seeded with multi-tenant mock data and security logs!")
    except Exception as e:
        db.rollback()
        print(f"Error during seeding: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    seed_db()
