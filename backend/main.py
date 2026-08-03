import datetime
from typing import List, Optional
from fastapi import FastAPI, Depends, HTTPException, status, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
import json

from database import engine, get_db
import models, schemas, auth

# Initialize Database tables if not present
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Photography CRM API", version="1.0.0")

# CORS middleware for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict this to the frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----------------- Auth Endpoints -----------------

@app.post("/api/auth/register", response_model=schemas.UserResponse, status_code=status.HTTP_201_CREATED)
def register_studio(user_in: schemas.UserCreate, db: Session = Depends(get_db)):
    # Check if user already exists
    existing_user = db.query(models.User).filter(models.User.email == user_in.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists."
        )

    # 1. Create the Studio (tenant)
    new_studio = models.Studio(name=user_in.studio_name)
    db.add(new_studio)
    db.flush() # Populate the new_studio.id without committing

    # 2. Create the User associated with the new Studio
    hashed_pw = auth.get_password_hash(user_in.password)
    new_user = models.User(
        studio_id=new_studio.id,
        name=user_in.name,
        email=user_in.email,
        hashed_password=hashed_pw,
        role="admin"
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


@app.post("/api/auth/login", response_model=schemas.Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    # Authenticate user
    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Get Studio Name
    studio = db.query(models.Studio).filter(models.Studio.id == user.studio_id).first()
    studio_name = studio.name if studio else "Unknown Studio"

    # Create JWT
    access_token = auth.create_access_token(
        data={"sub": user.id, "studio_id": user.studio_id}
    )
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "studio_id": user.studio_id,
        "studio_name": studio_name,
        "user_name": user.name
    }


# ----------------- Dashboard Stats -----------------

@app.get("/api/dashboard/stats", response_model=schemas.DashboardStats)
def get_dashboard_stats(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    studio_id = current_user.studio_id

    # Total clients count
    total_clients = db.query(models.Client).filter(models.Client.studio_id == studio_id).count()

    # Bookings count
    total_bookings = db.query(models.Booking).filter(models.Booking.studio_id == studio_id).count()

    # Active leads (status is Lead or Inquiry)
    active_leads = db.query(models.Booking).filter(
        models.Booking.studio_id == studio_id,
        models.Booking.status.in_(["Lead", "Inquiry"])
    ).count()

    # Revenue calculation
    invoices = db.query(models.Invoice).filter(models.Invoice.studio_id == studio_id).all()
    revenue_paid = sum(inv.amount for inv in invoices if inv.status.lower() == "paid")
    revenue_pending = sum(inv.amount for inv in invoices if inv.status.lower() in ["pending", "overdue"])

    # Upcoming bookings list
    now = datetime.datetime.utcnow()
    upcoming = db.query(models.Booking).filter(
        models.Booking.studio_id == studio_id,
        models.Booking.scheduled_at >= now
    ).order_by(models.Booking.scheduled_at.asc()).limit(5).all()

    upcoming_list = []
    for b in upcoming:
        client = db.query(models.Client).filter(models.Client.id == b.client_id).first()
        client_name = client.name if client else "Unknown Client"
        upcoming_list.append({
            "id": b.id,
            "client_name": client_name,
            "session_type": b.session_type,
            "scheduled_at": b.scheduled_at,
            "status": b.status
        })

    return {
        "total_clients": total_clients,
        "total_bookings": total_bookings,
        "active_leads": active_leads,
        "revenue_paid": revenue_paid,
        "revenue_pending": revenue_pending,
        "upcoming_bookings": upcoming_list
    }


# ----------------- Client Management -----------------

@app.get("/api/clients", response_model=List[schemas.ClientResponse])
def get_clients(
    search: Optional[str] = None,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(models.Client).filter(models.Client.studio_id == current_user.studio_id)
    if search:
        query = query.filter(models.Client.name.contains(search) | models.Client.email.contains(search))
    return query.order_by(models.Client.name.asc()).all()


@app.post("/api/clients", response_model=schemas.ClientResponse)
def create_client(
    client_in: schemas.ClientCreate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    new_client = models.Client(
        studio_id=current_user.studio_id,
        name=client_in.name,
        email=client_in.email,
        phone=client_in.phone,
        source=client_in.source,
        preferences=client_in.preferences
    )
    db.add(new_client)
    db.commit()
    db.refresh(new_client)
    return new_client


# ----------------- Booking Calendar & Scheduling -----------------

@app.get("/api/bookings", response_model=List[schemas.BookingResponse])
def get_bookings(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    bookings = db.query(models.Booking).filter(models.Booking.studio_id == current_user.studio_id).all()
    # Eagerly load client relationships
    for b in bookings:
        b.client = db.query(models.Client).filter(models.Client.id == b.client_id).first()
    return bookings


@app.post("/api/bookings", response_model=schemas.BookingResponse)
def create_booking(
    booking_in: schemas.BookingCreate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    # Verify client belongs to studio
    client = db.query(models.Client).filter(
        models.Client.id == booking_in.client_id,
        models.Client.studio_id == current_user.studio_id
    ).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found in this studio context")

    # Conflict detection logic (Real-Time Buffer Check)
    # Check if there is another booking scheduled within 2 hours of this start time
    start_buffer = booking_in.scheduled_at - datetime.timedelta(hours=2)
    end_buffer = booking_in.scheduled_at + datetime.timedelta(hours=2)
    conflicting = db.query(models.Booking).filter(
        models.Booking.studio_id == current_user.studio_id,
        models.Booking.scheduled_at >= start_buffer,
        models.Booking.scheduled_at <= end_buffer
    ).first()

    # Note: For MVP, we will still allow creation but warn the client,
    # or you can return a status or raise an error. Let's raise a warning in notes if conflict,
    # or return an error if you want strict blocking. Let's append to notes or set custom header,
    # or let's allow it but label notes as "[Scheduling Warning: Potential Conflict]" for flexibility.
    final_notes = booking_in.notes or ""
    if conflicting:
        conflict_msg = f"[Conflict Warning: Scheduled close to booking '{conflicting.session_type}' at {conflicting.scheduled_at.strftime('%H:%M')}]"
        final_notes = f"{conflict_msg} {final_notes}".strip()

    new_booking = models.Booking(
        studio_id=current_user.studio_id,
        client_id=booking_in.client_id,
        session_type=booking_in.session_type,
        scheduled_at=booking_in.scheduled_at,
        duration_minutes=booking_in.duration_minutes,
        status=booking_in.status,
        price=booking_in.price,
        notes=final_notes
    )
    db.add(new_booking)
    db.commit()
    db.refresh(new_booking)
    new_booking.client = client
    return new_booking


# ----------------- Invoicing & Payments -----------------

@app.get("/api/invoices", response_model=List[schemas.InvoiceResponse])
def get_invoices(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    invoices = db.query(models.Invoice).filter(models.Invoice.studio_id == current_user.studio_id).all()
    for inv in invoices:
        inv.client = db.query(models.Client).filter(models.Client.id == inv.client_id).first()
        inv.booking = db.query(models.Booking).filter(models.Booking.id == inv.booking_id).first()
    return invoices


@app.post("/api/invoices", response_model=schemas.InvoiceResponse)
def create_invoice(
    invoice_in: schemas.InvoiceCreate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    # Verify booking and client
    booking = db.query(models.Booking).filter(
        models.Booking.id == invoice_in.booking_id,
        models.Booking.studio_id == current_user.studio_id
    ).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found in this studio")

    new_invoice = models.Invoice(
        studio_id=current_user.studio_id,
        booking_id=invoice_in.booking_id,
        client_id=invoice_in.client_id,
        amount=invoice_in.amount,
        tax=invoice_in.tax,
        status=invoice_in.status,
        due_at=invoice_in.due_at
    )
    db.add(new_invoice)
    db.commit()
    db.refresh(new_invoice)
    new_invoice.client = db.query(models.Client).filter(models.Client.id == invoice_in.client_id).first()
    new_invoice.booking = booking
    return new_invoice


@app.put("/api/invoices/{invoice_id}/status", response_model=schemas.InvoiceResponse)
def update_invoice_status(
    invoice_id: str,
    status_str: str = Query(..., alias="status"),
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    invoice = db.query(models.Invoice).filter(
        models.Invoice.id == invoice_id,
        models.Invoice.studio_id == current_user.studio_id
    ).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    invoice.status = status_str
    db.commit()
    db.refresh(invoice)
    invoice.client = db.query(models.Client).filter(models.Client.id == invoice.client_id).first()
    invoice.booking = db.query(models.Booking).filter(models.Booking.id == invoice.booking_id).first()
    return invoice


# ----------------- Galleries & Photo Storage (Tenant) -----------------

@app.get("/api/galleries", response_model=List[schemas.GalleryResponse])
def get_galleries(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    galleries = db.query(models.Gallery).filter(models.Gallery.studio_id == current_user.studio_id).all()
    for g in galleries:
        g.photos = db.query(models.Photo).filter(models.Photo.gallery_id == g.id).all()
        g.booking = db.query(models.Booking).filter(models.Booking.id == g.booking_id).first()
    return galleries


@app.post("/api/galleries", response_model=schemas.GalleryResponse)
def create_gallery(
    gallery_in: schemas.GalleryCreate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    # Verify booking
    booking = db.query(models.Booking).filter(
        models.Booking.id == gallery_in.booking_id,
        models.Booking.studio_id == current_user.studio_id
    ).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found in this studio")

    new_gallery = models.Gallery(
        studio_id=current_user.studio_id,
        booking_id=gallery_in.booking_id,
        title=gallery_in.title,
        status=gallery_in.status,
        expires_at=gallery_in.expires_at
    )
    db.add(new_gallery)
    db.flush()

    # Generate some mock AI photos for the gallery for proofing demonstration
    mock_photos_data = [
        {"original": "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?q=80&w=1200", "edited": "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?q=80&w=1200&auto=format&fit=crop&sat=-20&contrast=15", "tags": ["Wedding", "Ceremony", "Sharp", "Couple"]},
        {"original": "https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=1200", "edited": "https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=1200&auto=format&fit=crop&sat=-10&contrast=10&brightness=5", "tags": ["Wedding", "Bridesmaids", "Portrait"]},
        {"original": "https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?q=80&w=1200", "edited": "https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?q=80&w=1200&auto=format&fit=crop&sepia=10&warmth=10", "tags": ["Wedding", "Groom", "Detail"]},
        {"original": "https://images.unsplash.com/photo-1507504038482-7621c338ec01?q=80&w=1200", "edited": "https://images.unsplash.com/photo-1507504038482-7621c338ec01?q=80&w=1200&auto=format&fit=crop&brightness=10", "tags": ["Wedding", "Reception", "Candids"]},
        {"original": "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=1200", "edited": "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=1200&auto=format&fit=crop&contrast=15", "tags": ["Portrait", "Outdoor", "Golden Hour"]},
        {"original": "https://images.unsplash.com/photo-1532712938310-34cb3982ef74?q=80&w=1200", "edited": "https://images.unsplash.com/photo-1532712938310-34cb3982ef74?q=80&w=1200&auto=format&fit=crop&sharp=20", "tags": ["Portrait", "Studio", "B&W"]}
    ]

    for item in mock_photos_data:
        p = models.Photo(
            gallery_id=new_gallery.id,
            original_url=item["original"],
            edited_url=item["edited"],
            is_selected=False,
            ai_tags=item["tags"]
        )
        db.add(p)

    db.commit()
    db.refresh(new_gallery)
    new_gallery.photos = db.query(models.Photo).filter(models.Photo.gallery_id == new_gallery.id).all()
    new_gallery.booking = booking
    return new_gallery


# ----------------- Client Portal (Public Endpoints, no JWT auth) -----------------

@app.get("/api/public/galleries/{gallery_id}", response_model=schemas.GalleryResponse)
def get_public_gallery(gallery_id: str, db: Session = Depends(get_db)):
    gallery = db.query(models.Gallery).filter(models.Gallery.id == gallery_id).first()
    if not gallery:
        raise HTTPException(status_code=404, detail="Gallery not found")
    
    # Eager load photos & bookings
    gallery.photos = db.query(models.Photo).filter(models.Photo.gallery_id == gallery_id).all()
    gallery.booking = db.query(models.Booking).filter(models.Booking.id == gallery.booking_id).first()
    if gallery.booking:
        gallery.booking.client = db.query(models.Client).filter(models.Client.id == gallery.booking.client_id).first()
    
    return gallery


@app.post("/api/public/photos/{photo_id}/favorite", response_model=schemas.PhotoResponse)
def toggle_favorite_photo(photo_id: str, db: Session = Depends(get_db)):
    photo = db.query(models.Photo).filter(models.Photo.id == photo_id).first()
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")
    
    photo.is_selected = not photo.is_selected
    db.commit()
    db.refresh(photo)
    return photo


@app.get("/api/public/clients/{client_id}/portal")
def get_client_portal_data(client_id: str, db: Session = Depends(get_db)):
    # Fallback to the first client in the database if using the demo shortcut
    if client_id == "demo-client-id":
        first_client = db.query(models.Client).first()
        if first_client:
            client_id = first_client.id
            
    client = db.query(models.Client).filter(models.Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client portal not found")

    bookings = db.query(models.Booking).filter(models.Booking.client_id == client_id).all()
    invoices = db.query(models.Invoice).filter(models.Invoice.client_id == client_id).all()
    
    # Find galleries linked to client bookings
    booking_ids = [b.id for b in bookings]
    galleries = db.query(models.Gallery).filter(models.Gallery.booking_id.in_(booking_ids)).all() if booking_ids else []

    # Get Studio info
    studio = db.query(models.Studio).filter(models.Studio.id == client.studio_id).first()
    studio_name = studio.name if studio else "Your Studio"

    return {
        "client": {
            "id": client.id,
            "name": client.name,
            "email": client.email
        },
        "studio_name": studio_name,
        "bookings": [
            {
                "id": b.id,
                "session_type": b.session_type,
                "scheduled_at": b.scheduled_at,
                "status": b.status,
                "price": b.price
            } for b in bookings
        ],
        "invoices": [
            {
                "id": inv.id,
                "amount": inv.amount,
                "status": inv.status,
                "due_at": inv.due_at
            } for inv in invoices
        ],
        "galleries": [
            {
                "id": g.id,
                "title": g.title,
                "status": g.status,
                "expires_at": g.expires_at
            } for g in galleries
        ]
    }
