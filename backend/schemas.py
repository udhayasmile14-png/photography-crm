from pydantic import BaseModel, EmailStr, ConfigDict
from typing import List, Optional, Any
from datetime import datetime

# ----------------- JWT & Auth Schemas -----------------
class Token(BaseModel):
    access_token: str
    token_type: str
    studio_id: str
    studio_name: str
    user_name: str

class TokenData(BaseModel):
    user_id: Optional[str] = None
    studio_id: Optional[str] = None


# ----------------- Studio Schemas -----------------
class StudioBase(BaseModel):
    name: str

class StudioCreate(StudioBase):
    pass

class StudioResponse(StudioBase):
    id: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


# ----------------- User Schemas -----------------
class UserBase(BaseModel):
    name: str
    email: EmailStr
    role: str = "admin"

class UserCreate(UserBase):
    password: str
    studio_name: str # Created when registering a new studio

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(UserBase):
    id: str
    studio_id: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


# ----------------- Client Schemas -----------------
class ClientBase(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None
    source: Optional[str] = None
    preferences: Optional[Any] = None
    face_recognition_consent: Optional[bool] = False
    face_embedding: Optional[List[float]] = None

class ClientCreate(ClientBase):
    pass

class ClientResponse(ClientBase):
    id: str
    studio_id: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


# ----------------- Booking Schemas -----------------
class BookingBase(BaseModel):
    client_id: str
    session_type: str
    scheduled_at: datetime
    duration_minutes: Optional[int] = 60
    status: Optional[str] = "Lead"
    price: Optional[float] = 0.0
    notes: Optional[str] = None

class BookingCreate(BookingBase):
    pass

class BookingResponse(BookingBase):
    id: str
    studio_id: str
    created_at: datetime
    client: Optional[ClientResponse] = None
    model_config = ConfigDict(from_attributes=True)


# ----------------- Wedding Guest Schemas -----------------
class WeddingGuestBase(BaseModel):
    name: str
    email: str
    phone: str # WhatsApp number
    face_embedding: Optional[List[float]] = None

class WeddingGuestCreate(WeddingGuestBase):
    pass

class WeddingGuestResponse(WeddingGuestBase):
    id: str
    booking_id: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


# ----------------- Invoice Schemas -----------------
class InvoiceBase(BaseModel):
    booking_id: str
    client_id: str
    amount: float
    tax: Optional[float] = 0.0
    status: Optional[str] = "Pending"
    due_at: datetime

class InvoiceCreate(InvoiceBase):
    pass

class InvoiceResponse(InvoiceBase):
    id: str
    studio_id: str
    created_at: datetime
    client: Optional[ClientResponse] = None
    booking: Optional[BookingResponse] = None
    model_config = ConfigDict(from_attributes=True)


# ----------------- Photo Schemas -----------------
class PhotoBase(BaseModel):
    original_url: str
    edited_url: Optional[str] = None
    is_selected: Optional[bool] = False
    ai_tags: Optional[List[str]] = None
    matched_clients: Optional[List[str]] = None
    matched_guests: Optional[List[str]] = None
    uploaded_by_guest: Optional[str] = None
    is_guest_uploaded: Optional[bool] = False

class PhotoResponse(PhotoBase):
    id: str
    gallery_id: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


# ----------------- Gallery Schemas -----------------
class GalleryBase(BaseModel):
    booking_id: str
    title: str
    status: Optional[str] = "Draft"
    expires_at: Optional[datetime] = None

class GalleryCreate(GalleryBase):
    pass

class GalleryResponse(GalleryBase):
    id: str
    studio_id: str
    created_at: datetime
    photos: List[PhotoResponse] = []
    booking: Optional[BookingResponse] = None
    model_config = ConfigDict(from_attributes=True)


# ----------------- Contract Schemas -----------------
class ContractBase(BaseModel):
    booking_id: str
    client_id: str
    title: str
    content: str
    status: Optional[str] = "Draft"
    signature_name: Optional[str] = None
    signed_at: Optional[datetime] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    document_hash: Optional[str] = None

class ContractCreate(ContractBase):
    pass

class ContractResponse(ContractBase):
    id: str
    studio_id: str
    created_at: datetime
    client: Optional[ClientResponse] = None
    model_config = ConfigDict(from_attributes=True)


# ----------------- Message Log Schemas -----------------
class MessageLogBase(BaseModel):
    client_id: Optional[str] = None
    subject: str
    body: str
    channel: str = "Email"
    status: str = "Sent"

class MessageLogResponse(MessageLogBase):
    id: str
    studio_id: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


# ----------------- Dashboard Stats Schemas -----------------
class BookingBrief(BaseModel):
    id: str
    client_name: str
    session_type: str
    scheduled_at: datetime
    status: str

class DashboardStats(BaseModel):
    total_clients: int
    total_bookings: int
    active_leads: int
    revenue_paid: float
    revenue_pending: float
    upcoming_bookings: List[BookingBrief]
