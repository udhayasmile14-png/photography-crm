import datetime
import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey, Float, Boolean, JSON, Integer
from sqlalchemy.orm import relationship
from database import Base

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
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default="admin") # admin, photographer, assistant
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
    source = Column(String, nullable=True) # Referral, Instagram, Website, etc.
    preferences = Column(JSON, nullable=True) # Style feedback, details, tags
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
    session_type = Column(String, nullable=False) # Wedding, Portrait, Corporate, etc.
    scheduled_at = Column(DateTime, nullable=False)
    duration_minutes = Column(Integer, default=60)
    status = Column(String, default="Lead") # Lead, Confirmed, Completed, Cancelled
    price = Column(Float, nullable=False, default=0.0)
    notes = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    studio = relationship("Studio", back_populates="bookings")
    client = relationship("Client", back_populates="bookings")
    invoices = relationship("Invoice", back_populates="booking", cascade="all, delete-orphan")
    galleries = relationship("Gallery", back_populates="booking", cascade="all, delete-orphan")
    contracts = relationship("Contract", back_populates="booking", cascade="all, delete-orphan")


class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(String, primary_key=True, default=generate_uuid)
    studio_id = Column(String, ForeignKey("studios.id"), nullable=False)
    booking_id = Column(String, ForeignKey("bookings.id"), nullable=False)
    client_id = Column(String, ForeignKey("clients.id"), nullable=False)
    amount = Column(Float, nullable=False)
    tax = Column(Float, default=0.0)
    status = Column(String, default="Pending") # Paid, Pending, Overdue
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
    status = Column(String, default="Draft") # Draft, Active, Expired
    expires_at = Column(DateTime, nullable=True)
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
    ai_tags = Column(JSON, nullable=True) # List of tags like ['Golden Hour', 'Sharp', 'Portrait']
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    gallery = relationship("Gallery", back_populates="photos")


class Contract(Base):
    __tablename__ = "contracts"

    id = Column(String, primary_key=True, default=generate_uuid)
    studio_id = Column(String, ForeignKey("studios.id"), nullable=False)
    booking_id = Column(String, ForeignKey("bookings.id"), nullable=False)
    client_id = Column(String, ForeignKey("clients.id"), nullable=False)
    title = Column(String, nullable=False)
    content = Column(String, nullable=False)
    status = Column(String, default="Draft") # Draft, Sent, Signed
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
    client_id = Column(String, ForeignKey("clients.id"), nullable=False)
    subject = Column(String, nullable=False)
    body = Column(String, nullable=False)
    channel = Column(String, default="Email") # Email, SMS
    status = Column(String, default="Sent") # Sent, Failed
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    studio = relationship("Studio", back_populates="message_logs")
    client = relationship("Client", back_populates="message_logs")
