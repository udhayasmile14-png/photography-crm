import datetime
import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey, Float, Boolean, JSON, Integer
from sqlalchemy.orm import relationship
from database import Base, engine
from sqlalchemy.sql import text

# Detect if pgvector extension is supported by the active database connection
def check_pgvector_supported():
    try:
        with engine.connect() as conn:
            result = conn.execute(text("SELECT 1 FROM pg_available_extensions WHERE name = 'vector'")).scalar()
            return result == 1
    except Exception:
        return False

try:
    if check_pgvector_supported():
        from pgvector.sqlalchemy import Vector
        EmbeddingType = Vector(128)
        PG_VECTOR_SUPPORTED = True
    else:
        EmbeddingType = JSON
        PG_VECTOR_SUPPORTED = False
except Exception:
    EmbeddingType = JSON
    PG_VECTOR_SUPPORTED = False

def generate_uuid():
    return str(uuid.uuid4())

class Studio(Base):
    __tablename__ = "studios"

    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    users = relationship("User", back_populates="studio", cascade="all, delete-orphan")
    clients = relationship("Client", back_populates="studio", cascade="all, delete-orphan")
    bookings = relationship("Booking", back_populates="studio", cascade="all, delete-orphan")
    invoices = relationship("Invoice", back_populates="studio", cascade="all, delete-orphan")
    galleries = relationship("Gallery", back_populates="studio", cascade="all, delete-orphan")
    contracts = relationship("Contract", back_populates="studio", cascade="all, delete-orphan")
    message_logs = relationship("MessageLog", back_populates="studio", cascade="all, delete-orphan")


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=generate_uuid)
    studio_id = Column(String, ForeignKey("studios.id"), nullable=False)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default="admin")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    studio = relationship("Studio", back_populates="users")


class Client(Base):
    __tablename__ = "clients"

    id = Column(String, primary_key=True, default=generate_uuid)
    studio_id = Column(String, ForeignKey("studios.id"), nullable=False)
    name = Column(String, nullable=False)
    email = Column(String, nullable=False)
    phone = Column(String, nullable=True)
    source = Column(String, nullable=True)
    preferences = Column(JSON, nullable=True)
    face_recognition_consent = Column(Boolean, default=False)
    face_embedding = Column(EmbeddingType, nullable=True) # SFace unit vector
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    studio = relationship("Studio", back_populates="clients")
    bookings = relationship("Booking", back_populates="client", cascade="all, delete-orphan")
    invoices = relationship("Invoice", back_populates="client", cascade="all, delete-orphan")
    contracts = relationship("Contract", back_populates="client", cascade="all, delete-orphan")
    message_logs = relationship("MessageLog", back_populates="client", cascade="all, delete-orphan")


class Booking(Base):
    __tablename__ = "bookings"

    id = Column(String, primary_key=True, default=generate_uuid)
    studio_id = Column(String, ForeignKey("studios.id"), nullable=False)
    client_id = Column(String, ForeignKey("clients.id"), nullable=False)
    session_type = Column(String, nullable=False)
    scheduled_at = Column(DateTime, nullable=False)
    duration_minutes = Column(Integer, default=60)
    status = Column(String, default="Lead")
    price = Column(Float, nullable=False, default=0.0)
    notes = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    studio = relationship("Studio", back_populates="bookings")
    client = relationship("Client", back_populates="bookings")
    invoices = relationship("Invoice", back_populates="booking", cascade="all, delete-orphan")
    galleries = relationship("Gallery", back_populates="booking", cascade="all, delete-orphan")
    contracts = relationship("Contract", back_populates="booking", cascade="all, delete-orphan")
    wedding_guests = relationship("WeddingGuest", back_populates="booking", cascade="all, delete-orphan")
    culling_jobs = relationship("CullingJob", back_populates="booking", cascade="all, delete-orphan")


class CullingJob(Base):
    __tablename__ = "culling_jobs"

    id = Column(String, primary_key=True, default=generate_uuid)
    booking_id = Column(String, ForeignKey("bookings.id", ondelete="CASCADE"), nullable=False)
    status = Column(String, default="uploaded") # uploaded, culling, review, retouching, ready, delivered, invoiced
    total_photos = Column(Integer, default=0)
    rejected_photos = Column(Integer, default=0)
    avg_sharpness = Column(Float, default=100.0)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    booking = relationship("Booking", back_populates="culling_jobs")


class WeddingGuest(Base):
    __tablename__ = "wedding_guests"

    id = Column(String, primary_key=True, default=generate_uuid)
    booking_id = Column(String, ForeignKey("bookings.id"), nullable=False)
    name = Column(String, nullable=False)
    email = Column(String, nullable=False)
    phone = Column(String, nullable=False)
    face_embedding = Column(EmbeddingType, nullable=True) # SFace unit vector
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    booking = relationship("Booking", back_populates="wedding_guests")


class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(String, primary_key=True, default=generate_uuid)
    studio_id = Column(String, ForeignKey("studios.id"), nullable=False)
    booking_id = Column(String, ForeignKey("bookings.id"), nullable=False)
    client_id = Column(String, ForeignKey("clients.id"), nullable=False)
    amount = Column(Float, nullable=False)
    tax = Column(Float, default=0.0)
    status = Column(String, default="Pending")
    due_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    studio = relationship("Studio", back_populates="invoices")
    booking = relationship("Booking", back_populates="invoices")
    client = relationship("Client", back_populates="invoices")


class Gallery(Base):
    __tablename__ = "galleries"

    id = Column(String, primary_key=True, default=generate_uuid)
    studio_id = Column(String, ForeignKey("studios.id"), nullable=False)
    booking_id = Column(String, ForeignKey("bookings.id"), nullable=False)
    title = Column(String, nullable=False)
    status = Column(String, default="Draft")
    expires_at = Column(DateTime, nullable=True)
    quota_couple = Column(Integer, default=50)
    quota_traditional = Column(Integer, default=30)
    quota_candid = Column(Integer, default=20)
    album_submitted = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    studio = relationship("Studio", back_populates="galleries")
    booking = relationship("Booking", back_populates="galleries")
    photos = relationship("Photo", back_populates="gallery", cascade="all, delete-orphan")


class Photo(Base):
    __tablename__ = "photos"

    id = Column(String, primary_key=True, default=generate_uuid)
    gallery_id = Column(String, ForeignKey("galleries.id"), nullable=False)
    original_url = Column(String, nullable=False)
    edited_url = Column(String, nullable=True)
    is_selected = Column(Boolean, default=False)
    is_hero = Column(Boolean, default=False)
    ai_tags = Column(JSON, nullable=True)
    matched_clients = Column(JSON, nullable=True)
    matched_guests = Column(JSON, nullable=True)
    uploaded_by_guest = Column(String, nullable=True)
    is_guest_uploaded = Column(Boolean, default=False)
    
    # Categorization & AI metrics
    category = Column(String, default="candid") # candid, traditional, couple, guest
    is_album_selection = Column(Boolean, default=False)
    sharpness_score = Column(Float, default=100.0)
    exposure_score = Column(Float, default=120.0)
    is_duplicate = Column(Boolean, default=False)
    duplicate_of_id = Column(String, nullable=True)
    blink_detected = Column(Boolean, default=False)
    cull_status = Column(String, default="keep") # keep, reject, pending_review
    image_hash = Column(String, nullable=True)
    
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    gallery = relationship("Gallery", back_populates="photos")
    faces = relationship("PhotoFace", back_populates="photo", cascade="all, delete-orphan")


class PhotoFace(Base):
    __tablename__ = "photos_faces"

    id = Column(String, primary_key=True, default=generate_uuid)
    photo_id = Column(String, ForeignKey("photos.id", ondelete="CASCADE"), nullable=False)
    face_embedding = Column(EmbeddingType, nullable=False) # pgvector vector(128)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    photo = relationship("Photo", back_populates="faces")


class Contract(Base):
    __tablename__ = "contracts"

    id = Column(String, primary_key=True, default=generate_uuid)
    studio_id = Column(String, ForeignKey("studios.id"), nullable=False)
    booking_id = Column(String, ForeignKey("bookings.id"), nullable=False)
    client_id = Column(String, ForeignKey("clients.id"), nullable=False)
    title = Column(String, nullable=False)
    content = Column(String, nullable=False)
    status = Column(String, default="Draft")
    signature_name = Column(String, nullable=True)
    signed_at = Column(DateTime, nullable=True)
    ip_address = Column(String, nullable=True)
    user_agent = Column(String, nullable=True)
    document_hash = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    studio = relationship("Studio", back_populates="contracts")
    booking = relationship("Booking", back_populates="contracts")
    client = relationship("Client", back_populates="contracts")


class MessageLog(Base):
    __tablename__ = "message_logs"

    id = Column(String, primary_key=True, default=generate_uuid)
    studio_id = Column(String, ForeignKey("studios.id"), nullable=False)
    client_id = Column(String, ForeignKey("clients.id"), nullable=True)
    subject = Column(String, nullable=False)
    body = Column(String, nullable=False)
    channel = Column(String, default="Email")
    status = Column(String, default="Sent")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    studio = relationship("Studio", back_populates="message_logs")
    client = relationship("Client", back_populates="message_logs")
