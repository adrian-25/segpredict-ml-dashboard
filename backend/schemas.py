from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime

class UserBase(BaseModel):
    name: str
    email: EmailStr

class UserCreate(UserBase):
    pass

class UserInDB(UserBase):
    id: str

class Token(BaseModel):
    access_token: str
    token_type: str

class CustomerCreate(BaseModel):
    name: str
    email: EmailStr
    recency: float
    frequency: float
    monetary: float
    avg_order_value: float
    purchases_per_month: float

class CustomerUpdate(BaseModel):
    prediction_label: Optional[str] = None
    email_status: Optional[str] = None

class CustomerInDB(CustomerCreate):
    id: str
    user_id: str
    prediction_label: Optional[str] = None
    email_status: str = "Not Sent"
    created_at: datetime = datetime.utcnow()

class UserMetrics(BaseModel):
    user_id: str
    total_customers: int
    total_revenue: float
    total_transactions: int
    date_range: Optional[str] = None
    updated_at: datetime = datetime.utcnow()

class GoogleAuthRequest(BaseModel):
    token: str
