import datetime
from database import SessionLocal, engine, Base
import models
from auth import get_password_hash

def seed_db():
    # Reset Database
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

        # 2. Create Users (hashed passwords)
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

        # 3. Create Clients for Studio A
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

        # Create Clients for Studio B
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

        # 4. Create Bookings for Studio A
        # Upcoming Wedding for Alice (10 days from now)
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
        # Past Portrait for Bob (2 days ago)
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

        # Create Bookings for Studio B
        # Upcoming Corporate Headshot for Charlie (5 days from now)
        booking_b1 = models.Booking(
            studio_id=studio_b.id,
            client_id=client_b1.id,
            session_type="Corporate Headshot",
            scheduled_at=datetime.datetime.utcnow() + datetime.timedelta(days=5, hours=2),
            duration_minutes=60,
            status="Confirmed",
            price=299.0,
            notes="Requires solid gray backdrop and fast delivery."
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

        # 6. Create Gallery for Studio A
        # Past portrait gallery for Bob
        gallery_a2 = models.Gallery(
            studio_id=studio_a.id,
            booking_id=booking_a2.id,
            title="Miller Family Outdoors",
            status="Active",
            expires_at=datetime.datetime.utcnow() + datetime.timedelta(days=90)
        )
        db.add(gallery_a2)
        db.flush()

        # 7. Add Photos to Gallery A2
        mock_photos = [
            {"orig": "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?q=80&w=1200", "ed": "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?q=80&w=1200&auto=format&fit=crop&sat=-20&contrast=15", "tags": ["Family", "Outdoors", "Golden Hour"]},
            {"orig": "https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=1200", "ed": "https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=1200&auto=format&fit=crop&sat=-10&contrast=10", "tags": ["Portrait", "Kids"]},
            {"orig": "https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?q=80&w=1200", "ed": "https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?q=80&w=1200&auto=format&fit=crop&sepia=10", "tags": ["Candid", "Outdoors"]},
        ]

        for p_data in mock_photos:
            p = models.Photo(
                gallery_id=gallery_a2.id,
                original_url=p_data["orig"],
                edited_url=p_data["ed"],
                is_selected=False,
                ai_tags=p_data["tags"]
            )
            db.add(p)

        db.commit()
        print("Database successfully seeded with multi-tenant mock data!")
        print("Logins created:")
        print(" - Aura Photography: owner@aura.com / password123")
        print(" - Vogue Studios: owner@vogue.com / password123")

    except Exception as e:
        db.rollback()
        print(f"Error during seeding: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    seed_db()
