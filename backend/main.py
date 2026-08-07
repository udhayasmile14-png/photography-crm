import datetime
from typing import List, Optional
import os
import uuid
from fastapi import FastAPI, Depends, HTTPException, status, Query, File, UploadFile, Form, Request, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from database import engine, get_db
import models, schemas, auth
from rate_limiter import RateLimiter

# Initialize Database tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Photography CRM API", version="1.1.0")

# CORS middleware for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----------------- Rate Limiters -----------------
# Limit public endpoints to prevent abuse: max 15 requests/minute
public_limiter = RateLimiter(max_requests=15, window_seconds=60)
# Limit image upload endpoints: max 5 requests/minute
upload_limiter = RateLimiter(max_requests=5, window_seconds=60)

# Helper to log messages in database
def log_message(db: Session, studio_id: str, client_id: str, subject: str, body: str, channel: str = "Email"):
    msg = models.MessageLog(
        studio_id=studio_id,
        client_id=client_id,
        subject=subject,
        body=body,
        channel=channel,
        status="Sent"
    )
    db.add(msg)
    db.commit()

# ----------------- Auth Endpoints -----------------

@app.post("/api/auth/register", response_model=schemas.UserResponse, status_code=status.HTTP_201_CREATED)
def register_studio(user_in: schemas.UserCreate, db: Session = Depends(get_db)):
    existing_user = db.query(models.User).filter(models.User.email == user_in.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists."
        )

    # 1. Create Studio
    new_studio = models.Studio(name=user_in.studio_name)
    db.add(new_studio)
    db.flush()

    # 2. Create User
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
    
    # Log registration greeting message
    log_message(
        db, 
        studio_id=new_studio.id, 
        client_id="system-welcome", # placeholder
        subject="Welcome to Aperture!", 
        body=f"Hello {user_in.name}, your workspace for '{user_in.studio_name}' is ready.",
        channel="Email"
    )
    
    return new_user


@app.post("/api/auth/login", response_model=schemas.Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    studio = db.query(models.Studio).filter(models.Studio.id == user.studio_id).first()
    studio_name = studio.name if studio else "Unknown Studio"

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

    total_clients = db.query(models.Client).filter(models.Client.studio_id == studio_id).count()
    total_bookings = db.query(models.Booking).filter(models.Booking.studio_id == studio_id).count()
    
    active_leads = db.query(models.Booking).filter(
        models.Booking.studio_id == studio_id,
        models.Booking.status.in_(["Lead", "Inquiry"])
    ).count()

    invoices = db.query(models.Invoice).filter(models.Invoice.studio_id == studio_id).all()
    revenue_paid = sum(inv.amount for inv in invoices if inv.status.lower() == "paid")
    revenue_pending = sum(inv.amount for inv in invoices if inv.status.lower() in ["pending", "overdue"])

    now = datetime.datetime.utcnow()
    upcoming = db.query(models.Booking).filter(
        models.Booking.studio_id == studio_id,
        models.Booking.scheduled_at >= now
    ).order_by(models.Booking.scheduled_at.asc()).limit(5).all()

    upcoming_list = []
    for b in upcoming:
        client = db.query(models.Client).filter(
            models.Client.id == b.client_id,
            models.Client.studio_id == studio_id # Strict query scoping
        ).first()
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

    # Log initial introduction message in history
    log_message(
        db,
        studio_id=current_user.studio_id,
        client_id=new_client.id,
        subject="Intake Form Completed",
        body=f"Profile record created for {client_in.name} via CRM dashboard.",
        channel="Email"
    )

    return new_client


@app.get("/api/clients/{client_id}/token")
def get_client_portal_token(
    client_id: str,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    # Strict Query-Layer Tenant Isolation: Verify client belongs to studio
    client = db.query(models.Client).filter(
        models.Client.id == client_id,
        models.Client.studio_id == current_user.studio_id
    ).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found in your studio context")

    # Generate Secure Signed Expiring JWT Token
    token = auth.create_portal_share_token(client_id=client.id, expires_days=30)
    return {"token": token}


# ----------------- Booking Calendar & Scheduling -----------------

@app.get("/api/bookings", response_model=List[schemas.BookingResponse])
def get_bookings(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    bookings = db.query(models.Booking).filter(models.Booking.studio_id == current_user.studio_id).all()
    for b in bookings:
        b.client = db.query(models.Client).filter(
            models.Client.id == b.client_id,
            models.Client.studio_id == current_user.studio_id # Strict query scoping
        ).first()
    return bookings


@app.post("/api/bookings", response_model=schemas.BookingResponse)
def create_booking(
    booking_in: schemas.BookingCreate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    # Strict Query-Layer Tenant Isolation: Verify client belongs to studio
    client = db.query(models.Client).filter(
        models.Client.id == booking_in.client_id,
        models.Client.studio_id == current_user.studio_id
    ).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found in your studio context")

    # Conflict check
    start_buffer = booking_in.scheduled_at - datetime.timedelta(hours=2)
    end_buffer = booking_in.scheduled_at + datetime.timedelta(hours=2)
    conflicting = db.query(models.Booking).filter(
        models.Booking.studio_id == current_user.studio_id,
        models.Booking.scheduled_at >= start_buffer,
        models.Booking.scheduled_at <= end_buffer
    ).first()

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

    # Auto-log a message sequence for booking confirmation
    log_message(
        db,
        studio_id=current_user.studio_id,
        client_id=client.id,
        subject=f"Photoshoot Confirmed: {booking_in.session_type}",
        body=f"Your {booking_in.session_type} is scheduled for {booking_in.scheduled_at.strftime('%B %d, %Y at %H:%M')}.",
        channel="Email"
    )

    return new_booking


# ----------------- Invoicing & Payments -----------------

@app.get("/api/invoices", response_model=List[schemas.InvoiceResponse])
def get_invoices(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    invoices = db.query(models.Invoice).filter(models.Invoice.studio_id == current_user.studio_id).all()
    for inv in invoices:
        inv.client = db.query(models.Client).filter(
            models.Client.id == inv.client_id,
            models.Client.studio_id == current_user.studio_id
        ).first()
        inv.booking = db.query(models.Booking).filter(
            models.Booking.id == inv.booking_id,
            models.Booking.studio_id == current_user.studio_id
        ).first()
    return invoices


@app.post("/api/invoices", response_model=schemas.InvoiceResponse)
def create_invoice(
    invoice_in: schemas.InvoiceCreate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    # Strict Query-Layer Tenant Isolation: Verify client & booking belong to studio
    booking = db.query(models.Booking).filter(
        models.Booking.id == invoice_in.booking_id,
        models.Booking.studio_id == current_user.studio_id
    ).first()
    client = db.query(models.Client).filter(
        models.Client.id == invoice_in.client_id,
        models.Client.studio_id == current_user.studio_id
    ).first()
    if not booking or not client:
        raise HTTPException(status_code=404, detail="Booking or Client not found in your studio context")

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
    new_invoice.client = client
    new_invoice.booking = booking

    # Log invoice issue communication
    log_message(
        db,
        studio_id=current_user.studio_id,
        client_id=client.id,
        subject=f"Invoice #{new_invoice.id[:8]} Issued",
        body=f"An invoice of ${invoice_in.amount} is due by {invoice_in.due_at.strftime('%B %d, %Y')}.",
        channel="Email"
    )

    return new_invoice


@app.put("/api/invoices/{invoice_id}/status", response_model=schemas.InvoiceResponse)
def update_invoice_status(
    invoice_id: str,
    status_str: str = Query(..., alias="status"),
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    # Strict Query scoping
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


# ----------------- Galleries (Photographer dashboard) -----------------

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
    # Strict query scoping
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

    # Create default base photos
    mock_photos_data = [
        {"orig": "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?q=80&w=1200", "tags": ["Wedding", "Ceremony"]},
        {"orig": "https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=1200", "tags": ["Portrait", "Outdoor"]},
    ]
    for item in mock_photos_data:
        p = models.Photo(
            gallery_id=new_gallery.id,
            original_url=item["orig"],
            edited_url=item["orig"] + "&auto=format&fit=crop&sat=-10",
            is_selected=False,
            ai_tags=item["tags"]
        )
        db.add(p)

    db.commit()
    db.refresh(new_gallery)
    new_gallery.photos = db.query(models.Photo).filter(models.Photo.gallery_id == new_gallery.id).all()
    new_gallery.booking = booking
    return new_gallery


# ----------------- Contracts (Photographer dashboard) -----------------

@app.get("/api/contracts", response_model=List[schemas.ContractResponse])
def get_contracts(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    contracts = db.query(models.Contract).filter(models.Contract.studio_id == current_user.studio_id).all()
    for c in contracts:
        c.client = db.query(models.Client).filter(models.Client.id == c.client_id).first()
    return contracts


@app.post("/api/contracts", response_model=schemas.ContractResponse)
def create_contract(
    contract_in: schemas.ContractCreate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    # Strict Query-Layer Tenant Isolation: Verify client & booking belong to studio
    client = db.query(models.Client).filter(
        models.Client.id == contract_in.client_id,
        models.Client.studio_id == current_user.studio_id
    ).first()
    booking = db.query(models.Booking).filter(
        models.Booking.id == contract_in.booking_id,
        models.Booking.studio_id == current_user.studio_id
    ).first()
    if not client or not booking:
        raise HTTPException(status_code=404, detail="Client or Booking not found in this studio")

    new_contract = models.Contract(
        studio_id=current_user.studio_id,
        booking_id=contract_in.booking_id,
        client_id=contract_in.client_id,
        title=contract_in.title,
        content=contract_in.content,
        status="Sent"
    )
    db.add(new_contract)
    db.commit()
    db.refresh(new_contract)
    new_contract.client = client

    # Log document issue in messaging log
    log_message(
        db,
        studio_id=current_user.studio_id,
        client_id=client.id,
        subject=f"Contract Ready: {contract_in.title}",
        body=f"Please review and digitally sign the contract: '{contract_in.title}' in your portal.",
        channel="Email"
    )

    return new_contract


@app.get("/api/contracts/{contract_id}", response_model=schemas.ContractResponse)
def get_contract_by_id(
    contract_id: str,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    # Strict Query-Layer Tenant Scoping Check (Asserts 404/403 for other studios)
    contract = db.query(models.Contract).filter(models.Contract.id == contract_id).first()
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
        
    if contract.studio_id != current_user.studio_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: You do not have permission to access another tenant's contract."
        )
    contract.client = db.query(models.Client).filter(models.Client.id == contract.client_id).first()
    return contract


# ----------------- Image Upload (Photographer dashboard) -----------------

def background_ai_processing(photo_id: str, db_session_factory):
    # Simulates AI culling, subject classification, and tag calculation
    # Runs asynchronously in a background thread so upload isn't blocked.
    db = db_session_factory()
    try:
        photo = db.query(models.Photo).filter(models.Photo.id == photo_id).first()
        if photo:
            # Add mock computed AI tags after parsing "processing"
            photo.ai_tags = ["Sharp", "Outdoor", "Candid", "High Composition"]
            db.commit()
            print(f"Background AI processing complete for photo: {photo_id}")
    except Exception as e:
        print(f"Error in background AI task: {e}")
    finally:
        db.close()


@app.post("/api/photos/upload", response_model=schemas.PhotoResponse)
async def upload_gallery_photo(
    background_tasks: BackgroundTasks,
    gallery_id: str = Form(...),
    file: UploadFile = File(...),
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
    _ = Depends(upload_limiter)
):
    # Verify gallery belongs to this studio
    gallery = db.query(models.Gallery).filter(
        models.Gallery.id == gallery_id,
        models.Gallery.studio_id == current_user.studio_id
    ).first()
    if not gallery:
        raise HTTPException(status_code=404, detail="Gallery not found")

    # 1. Cap File Size to 5MB
    MAX_FILE_SIZE = 5 * 1024 * 1024
    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File is too large. Maximum allowed size is 5MB."
        )

    # 2. Verify Magic Bytes content (Accept JPEGs and PNGs only)
    is_jpeg = contents.startswith(b'\xff\xd8\xff')
    is_png = contents.startswith(b'\x89PNG\r\n\x1a\n')
    if not is_jpeg and not is_png:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid image format. Only JPEGs and PNGs are accepted."
        )

    # 3. Store file outside of static web root (save to a local uploads directory)
    upload_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "uploads")
    os.makedirs(upload_dir, exist_ok=True)
    
    file_ext = ".jpg" if is_jpeg else ".png"
    unique_filename = f"{uuid.uuid4()}{file_ext}"
    file_path = os.path.join(upload_dir, unique_filename)

    with open(file_path, "wb") as f:
        f.write(contents)

    # In production, we would save this to S3 and store the signed URL in db.
    # For local test, we store the file path (or a simulated URL path)
    db_photo = models.Photo(
        gallery_id=gallery_id,
        original_url=f"/uploads/{unique_filename}",
        edited_url=f"/uploads/{unique_filename}",
        is_selected=False,
        ai_tags=["Processing..."]
    )
    db.add(db_photo)
    db.commit()
    db.refresh(db_photo)

    # Trigger async background tasks
    background_tasks.add_task(background_ai_processing, db_photo.id, SessionLocalFactory)

    return db_photo

# Session factory for background threads
from sqlalchemy.orm import sessionmaker
SessionLocalFactory = sessionmaker(autocommit=False, autoflush=False, bind=engine)


# ----------------- Secure Client Portal (Public Endpoints, token required) -----------------

@app.get("/api/public/clients/portal")
def get_secure_client_portal_data(
    token: str = Query(...),
    db: Session = Depends(get_db),
    _ = Depends(public_limiter)
):
    # Verify and parse expiring token
    client_id = auth.get_portal_client_id(token)
    
    client = db.query(models.Client).filter(models.Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client portal not found")

    bookings = db.query(models.Booking).filter(models.Booking.client_id == client_id).all()
    invoices = db.query(models.Invoice).filter(models.Invoice.client_id == client_id).all()
    
    booking_ids = [b.id for b in bookings]
    galleries = db.query(models.Gallery).filter(models.Gallery.booking_id.in_(booking_ids)).all() if booking_ids else []
    contracts = db.query(models.Contract).filter(models.Contract.client_id == client_id).all()
    message_logs = db.query(models.MessageLog).filter(models.MessageLog.client_id == client_id).all()

    studio = db.query(models.Studio).filter(models.Studio.id == client.studio_id).first()
    studio_name = studio.name if studio else "Your Studio"

    return {
        "client": {
            "id": client.id,
            "name": client.name,
            "email": client.email,
            "face_recognition_consent": client.face_recognition_consent,
            "has_face_embedding": client.face_embedding is not None
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
        ],
        "contracts": [
            {
                "id": c.id,
                "title": c.title,
                "content": c.content,
                "status": c.status,
                "signed_at": c.signed_at,
                "signature_name": c.signature_name,
                "ip_address": c.ip_address,
                "user_agent": c.user_agent,
                "document_hash": c.document_hash
            } for c in contracts
        ],
        "message_logs": [
            {
                "id": m.id,
                "subject": m.subject,
                "body": m.body,
                "channel": m.channel,
                "created_at": m.created_at
            } for m in message_logs
        ]
    }


@app.get("/api/public/galleries/{gallery_id}", response_model=schemas.GalleryResponse)
def get_secure_public_gallery(
    gallery_id: str,
    token: str = Query(...),
    db: Session = Depends(get_db),
    _ = Depends(public_limiter)
):
    # Verify and parse client_id from token
    client_id = auth.get_portal_client_id(token)
    
    gallery = db.query(models.Gallery).filter(models.Gallery.id == gallery_id).first()
    if not gallery:
        raise HTTPException(status_code=404, detail="Gallery not found")

    # Strict ownership scoping: Verify gallery booking belongs to the token's client
    booking = db.query(models.Booking).filter(
        models.Booking.id == gallery.booking_id,
        models.Booking.client_id == client_id
    ).first()
    if not booking:
        raise HTTPException(status_code=403, detail="Forbidden: You do not have access to this gallery.")

    gallery.photos = db.query(models.Photo).filter(models.Photo.gallery_id == gallery_id).all()
    gallery.booking = booking
    gallery.booking.client = db.query(models.Client).filter(models.Client.id == client_id).first()
    
    return gallery


@app.post("/api/public/photos/{photo_id}/favorite", response_model=schemas.PhotoResponse)
def toggle_favorite_photo(
    photo_id: str,
    token: str = Query(...),
    db: Session = Depends(get_db)
):
    # Verify token
    client_id = auth.get_portal_client_id(token)

    photo = db.query(models.Photo).filter(models.Photo.id == photo_id).first()
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")
    
    gallery = db.query(models.Gallery).filter(models.Gallery.id == photo.gallery_id).first()
    if not gallery:
        raise HTTPException(status_code=404, detail="Gallery not found")
        
    # Verify photo belongs to the token's client booking
    booking = db.query(models.Booking).filter(
        models.Booking.id == gallery.booking_id,
        models.Booking.client_id == client_id
    ).first()
    if not booking:
        raise HTTPException(status_code=403, detail="Forbidden: Access denied.")

    photo.is_selected = not photo.is_selected
    db.commit()
    db.refresh(photo)
    return photo


@app.post("/api/public/contracts/{contract_id}/sign", response_model=schemas.ContractResponse)
def sign_contract(
    contract_id: str,
    request: Request,
    signature_name: str = Query(...),
    token: str = Query(...),
    db: Session = Depends(get_db),
    _ = Depends(public_limiter)
):
    # Verify token
    client_id = auth.get_portal_client_id(token)

    # Scoped check: must belong to the client_id contained in the secure token
    contract = db.query(models.Contract).filter(
        models.Contract.id == contract_id,
        models.Contract.client_id == client_id
    ).first()
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found for this client link.")

    if contract.status == "Signed":
        raise HTTPException(status_code=400, detail="Contract has already been signed and is immutable.")

    # Capture client request audit metrics
    client_ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent") or "unknown"

    # Compute a cryptographic SHA-256 signature hash of the exact template terms at signing time
    import hashlib
    content_payload = f"Title: {contract.title}\nTerms: {contract.content}\nClient: {client_id}"
    document_hash = hashlib.sha256(content_payload.encode("utf-8")).hexdigest()

    contract.status = "Signed"
    contract.signature_name = signature_name
    contract.signed_at = datetime.datetime.utcnow()
    contract.ip_address = client_ip
    contract.user_agent = user_agent
    contract.document_hash = document_hash
    db.commit()
    db.refresh(contract)

    # Log contract signing in messaging log
    log_message(
        db,
        studio_id=contract.studio_id,
        client_id=client_id,
        subject=f"Contract Signed: {contract.title}",
        body=f"Document '{contract.title}' was signed digitally by {signature_name}. IP: {client_ip}. SHA-256: {document_hash[:12]}...",
        channel="Email"
    )

    return contract


@app.post("/api/public/clients/register-face")
async def register_client_face(
    token: str = Query(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _ = Depends(public_limiter)
):
    # 1. Verify token and find client
    client_id = auth.get_portal_client_id(token)
    client = db.query(models.Client).filter(models.Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    # 2. Cap file size to 5MB
    MAX_FILE_SIZE = 5 * 1024 * 1024
    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large. Maximum size is 5MB.")

    # 3. Verify magic bytes (JPEGs and PNGs only)
    is_jpeg = contents.startswith(b'\xff\xd8\xff')
    is_png = contents.startswith(b'\x89PNG\r\n\x1a\n')
    if not is_jpeg and not is_png:
        raise HTTPException(status_code=400, detail="Invalid image format. Only JPEGs and PNGs are accepted.")

    # 4. Generate stable, mock 128-dimensional face embedding vector
    import hashlib
    import math
    h = hashlib.sha256(f"{client.id}-{file.filename}".encode("utf-8")).digest()

    raw_vector = []
    vector_sum = 0.0
    for i in range(128):
        byte_val = h[i % len(h)]
        val = math.sin(byte_val + i) # Generate floats between -1 and 1
        raw_vector.append(val)
        vector_sum += val * val

    # Normalize vector to unit length for standard cosine/L2 distance math
    norm = math.sqrt(vector_sum)
    normalized_vector = [val / norm for val in raw_vector]

    # 5. Save consent and vector embedding
    client.face_recognition_consent = True
    client.face_embedding = normalized_vector
    db.commit()
    db.refresh(client)

    log_message(
        db,
        studio_id=client.studio_id,
        client_id=client.id,
        subject="Face Profile Registered",
        body="Biometric consent given and facial selfie registered for smart search.",
        channel="System"
    )

    return {
        "status": "success",
        "client_name": client.name,
        "face_recognition_consent": client.face_recognition_consent,
        "has_face_embedding": True
    }


# ----------------- Public Guest Wedding QR Upload Portal -----------------

@app.get("/api/public/wedding/{booking_id}/info")
def get_public_wedding_info(booking_id: str, db: Session = Depends(get_db), _ = Depends(public_limiter)):
    booking = db.query(models.Booking).filter(models.Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Wedding session booking not found")
        
    client = db.query(models.Client).filter(models.Client.id == booking.client_id).first()
    client_name = client.name if client else "Newlyweds"
    
    studio = db.query(models.Studio).filter(models.Studio.id == booking.studio_id).first()
    studio_name = studio.name if studio else "Your Studio"
    
    return {
        "booking_id": booking.id,
        "session_type": booking.session_type,
        "scheduled_at": booking.scheduled_at,
        "client_name": client_name,
        "studio_name": studio_name
    }


@app.post("/api/public/wedding/{booking_id}/guest-upload", response_model=schemas.PhotoResponse)
async def upload_guest_wedding_photo(
    booking_id: str,
    guest_name: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _ = Depends(public_limiter)
):
    booking = db.query(models.Booking).filter(models.Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Wedding booking not found")

    # Find or create a gallery for this booking to hold the guest photos
    gallery = db.query(models.Gallery).filter(
        models.Gallery.booking_id == booking_id
    ).first()
    
    if not gallery:
        gallery = models.Gallery(
            studio_id=booking.studio_id,
            booking_id=booking_id,
            title=f"Guest Snapshot Album - {booking.session_type}",
            status="Active"
        )
        db.add(gallery)
        db.flush()

    # 1. Cap File Size to 5MB
    MAX_FILE_SIZE = 5 * 1024 * 1024
    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File is too large. Maximum allowed size is 5MB."
        )

    # 2. Verify Magic Bytes (JPEGs and PNGs only)
    is_jpeg = contents.startswith(b'\xff\xd8\xff')
    is_png = contents.startswith(b'\x89PNG\r\n\x1a\n')
    if not is_jpeg and not is_png:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid image format. Only JPEGs and PNGs are accepted."
        )

    # 3. Store file on local disk uploads folder
    upload_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "uploads")
    os.makedirs(upload_dir, exist_ok=True)
    
    file_ext = ".jpg" if is_jpeg else ".png"
    unique_filename = f"guest-{uuid.uuid4()}{file_ext}"
    file_path = os.path.join(upload_dir, unique_filename)

    with open(file_path, "wb") as f:
        f.write(contents)

    # 4. Insert photo record with Guest attribution tags
    db_photo = models.Photo(
        gallery_id=gallery.id,
        original_url=f"/uploads/{unique_filename}",
        edited_url=f"/uploads/{unique_filename}",
        is_selected=False,
        ai_tags=["Guest Upload", f"By: {guest_name}"],
        uploaded_by_guest=guest_name,
        is_guest_uploaded=True
    )
    db.add(db_photo)
    db.commit()
    db.refresh(db_photo)

    return db_photo
