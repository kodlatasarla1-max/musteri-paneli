from fastapi import FastAPI, APIRouter, Depends, HTTPException, status, BackgroundTasks
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import jwt
from passlib.context import CryptContext
import boto3
from botocore.exceptions import ClientError
import resend

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

security = HTTPBearer()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

JWT_SECRET = os.getenv("JWT_SECRET", "your-secret-key-change-in-production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

AWS_ACCESS_KEY = os.getenv("AWS_ACCESS_KEY_ID", "")
AWS_SECRET_KEY = os.getenv("AWS_SECRET_ACCESS_KEY", "")
AWS_REGION = os.getenv("AWS_REGION", "us-east-1")
S3_BUCKET_NAME = os.getenv("S3_BUCKET_NAME", "agency-os-files")

RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")
if RESEND_API_KEY:
    resend.api_key = RESEND_API_KEY

if AWS_ACCESS_KEY and AWS_SECRET_KEY:
    s3_client = boto3.client(
        's3',
        aws_access_key_id=AWS_ACCESS_KEY,
        aws_secret_access_key=AWS_SECRET_KEY,
        region_name=AWS_REGION
    )
else:
    s3_client = None

class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    role: str  # admin, staff, client

class UserCreate(UserBase):
    password: str
    client_id: Optional[str] = None  # Only for client role

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(UserBase):
    model_config = ConfigDict(extra="ignore")
    id: str
    client_id: Optional[str] = None
    created_at: datetime

class ClientBase(BaseModel):
    company_name: str
    contact_name: str
    contact_email: EmailStr
    contact_phone: str
    industry: str
    status: str = "active"  # active, read_only, expired
    access_days_remaining: int = 30
    access_expires_at: Optional[datetime] = None

class ClientCreate(ClientBase):
    pass

class ClientResponse(ClientBase):
    model_config = ConfigDict(extra="ignore")
    id: str
    created_at: datetime

class ServiceBase(BaseModel):
    name: str
    description: str
    icon: str

class ServiceResponse(ServiceBase):
    model_config = ConfigDict(extra="ignore")
    id: str

class ClientServiceBase(BaseModel):
    client_id: str
    service_id: str
    is_active: bool = False
    is_locked: bool = True

class ClientServiceResponse(ClientServiceBase):
    model_config = ConfigDict(extra="ignore")
    id: str
    service_name: str

class VideoBase(BaseModel):
    client_id: str
    project_name: str
    file_name: str
    file_url: str
    file_size: int
    month: str
    status: str = "uploaded"  # uploaded, approved, revision_requested
    notes: Optional[str] = None

class VideoCreate(VideoBase):
    pass

class VideoResponse(VideoBase):
    model_config = ConfigDict(extra="ignore")
    id: str
    created_at: datetime
    updated_at: datetime

class DesignBase(BaseModel):
    client_id: str
    project_name: str
    file_name: str
    file_url: str
    file_size: int
    version: int = 1
    status: str = "uploaded"  # uploaded, approved, revision_requested
    notes: Optional[str] = None

class DesignCreate(DesignBase):
    pass

class DesignResponse(DesignBase):
    model_config = ConfigDict(extra="ignore")
    id: str
    created_at: datetime
    updated_at: datetime

class SocialMediaPostBase(BaseModel):
    client_id: str
    post_date: datetime
    post_type: str  # post, reel, story
    caption: str
    media_url: Optional[str] = None
    status: str = "draft"  # draft, waiting_approval, approved, revision, published
    notes: Optional[str] = None

class SocialMediaPostCreate(SocialMediaPostBase):
    pass

class SocialMediaPostResponse(SocialMediaPostBase):
    model_config = ConfigDict(extra="ignore")
    id: str
    created_at: datetime
    updated_at: datetime

class AdsReportBase(BaseModel):
    client_id: str
    report_date: datetime
    daily_spend: float
    impressions: int
    clicks: int
    conversions: int
    cpc: float
    cpm: float
    campaign_name: str

class AdsReportCreate(AdsReportBase):
    pass

class AdsReportResponse(AdsReportBase):
    model_config = ConfigDict(extra="ignore")
    id: str
    created_at: datetime

class CalendarEventBase(BaseModel):
    client_id: str
    event_type: str  # shoot, deadline, meeting
    title: str
    event_date: datetime
    location: Optional[str] = None
    checklist: Optional[List[str]] = None
    notes: Optional[str] = None

class CalendarEventCreate(CalendarEventBase):
    pass

class CalendarEventResponse(CalendarEventBase):
    model_config = ConfigDict(extra="ignore")
    id: str
    created_at: datetime

class ReceiptBase(BaseModel):
    client_id: str
    amount: float
    receipt_file_url: str
    payment_date: datetime
    status: str = "pending"  # pending, approved, rejected
    admin_notes: Optional[str] = None

class ReceiptCreate(ReceiptBase):
    pass

class ReceiptResponse(ReceiptBase):
    model_config = ConfigDict(extra="ignore")
    id: str
    created_at: datetime
    updated_at: datetime

class CampaignBase(BaseModel):
    title: str
    content: str
    campaign_type: str  # popup, banner, modal, fullscreen
    start_date: datetime
    end_date: datetime
    target_service_missing: Optional[List[str]] = None  # ["Website", "E-commerce"]
    target_specific_clients: Optional[List[str]] = None
    cta_type: str  # form, whatsapp, call
    cta_link: Optional[str] = None
    is_active: bool = True

class CampaignCreate(CampaignBase):
    pass

class CampaignResponse(CampaignBase):
    model_config = ConfigDict(extra="ignore")
    id: str
    created_at: datetime

class ActivityLogBase(BaseModel):
    user_id: str
    user_email: str
    action: str
    resource_type: str
    resource_id: str
    details: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ActivityLogResponse(ActivityLogBase):
    model_config = ConfigDict(extra="ignore")
    id: str

class StaffPermissionBase(BaseModel):
    staff_id: str
    can_manage_clients: bool = False
    can_manage_content: bool = False
    can_view_reports: bool = False
    can_approve_receipts: bool = False
    can_manage_calendar: bool = False

class StaffPermissionCreate(StaffPermissionBase):
    pass

class StaffPermissionResponse(StaffPermissionBase):
    model_config = ConfigDict(extra="ignore")
    id: str

class PresignedUrlRequest(BaseModel):
    file_name: str
    file_type: str
    upload_path: str  # videos/client_id/, designs/client_id/, receipts/client_id/

class PresignedUrlResponse(BaseModel):
    upload_url: str
    file_url: str
    expires_in: int

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return encoded_jwt

def verify_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired")
    except jwt.JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    payload = verify_token(token)
    user = await db.users.find_one({"id": payload.get("sub")}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user

async def require_admin(user: dict = Depends(get_current_user)):
    if user["role"] != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return user

async def require_admin_or_staff(user: dict = Depends(get_current_user)):
    if user["role"] not in ["admin", "staff"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin or staff access required")
    return user

async def log_activity(user_id: str, user_email: str, action: str, resource_type: str, resource_id: str, details: str):
    log = ActivityLogBase(
        user_id=user_id,
        user_email=user_email,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        details=details
    )
    log_dict = log.model_dump()
    log_dict["id"] = str(uuid.uuid4())
    log_dict["timestamp"] = log_dict["timestamp"].isoformat()
    await db.activity_logs.insert_one(log_dict)

@api_router.get("/")
async def root():
    return {"message": "Agency OS API", "status": "running"}

@api_router.post("/init-system")
async def init_system():
    """Initialize system with default admin user and services"""
    existing_admin = await db.users.find_one({"role": "admin"}, {"_id": 0})
    if existing_admin:
        return {"message": "System already initialized", "admin_exists": True}
    
    admin_dict = {
        "id": str(uuid.uuid4()),
        "email": "admin@agency.com",
        "full_name": "Admin User",
        "role": "admin",
        "password": hash_password("admin123"),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(admin_dict)
    
    services = [
        {"id": str(uuid.uuid4()), "name": "Video Shoot & Production", "description": "Professional video shooting and production services", "icon": "Video"},
        {"id": str(uuid.uuid4()), "name": "Meta Ads Management", "description": "Facebook and Instagram advertising management", "icon": "BarChart3"},
        {"id": str(uuid.uuid4()), "name": "Social Media Management", "description": "Complete social media content and management", "icon": "Share2"},
        {"id": str(uuid.uuid4()), "name": "Graphic Design", "description": "Professional graphic design services", "icon": "Image"},
        {"id": str(uuid.uuid4()), "name": "Website Setup", "description": "Professional website development and setup", "icon": "Globe"},
        {"id": str(uuid.uuid4()), "name": "E-commerce Management", "description": "Complete e-commerce store management", "icon": "ShoppingBag"},
    ]
    await db.services.insert_many(services)
    
    return {
        "message": "System initialized successfully",
        "admin_email": "admin@agency.com",
        "admin_password": "admin123",
        "services_created": len(services)
    }

async def send_email(to_email: str, subject: str, html_content: str):
    if not RESEND_API_KEY:
        logging.warning("Resend API key not configured, skipping email")
        return
    try:
        params = {
            "from": "Agency OS <noreply@resend.dev>",
            "to": [to_email],
            "subject": subject,
            "html": html_content
        }
        resend.Emails.send(params)
        logging.info(f"Email sent to {to_email}")
    except Exception as e:
        logging.error(f"Failed to send email: {e}")

@api_router.post("/auth/register", response_model=UserResponse)
async def register(user_data: UserCreate):
    existing = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")
    
    user_dict = user_data.model_dump()
    user_dict["id"] = str(uuid.uuid4())
    user_dict["password"] = hash_password(user_data.password)
    user_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.users.insert_one(user_dict)
    
    response_dict = {k: v for k, v in user_dict.items() if k != "password"}
    response_dict["created_at"] = datetime.fromisoformat(response_dict["created_at"])
    return UserResponse(**response_dict)

@api_router.post("/auth/login")
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user or not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    
    token = create_access_token({"sub": user["id"], "email": user["email"], "role": user["role"]})
    return {"access_token": token, "token_type": "bearer", "role": user["role"], "client_id": user.get("client_id")}

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(user: dict = Depends(get_current_user)):
    user["created_at"] = datetime.fromisoformat(user["created_at"]) if isinstance(user["created_at"], str) else user["created_at"]
    return UserResponse(**user)

@api_router.get("/clients", response_model=List[ClientResponse])
async def get_clients(user: dict = Depends(require_admin_or_staff)):
    clients = await db.clients.find({}, {"_id": 0}).to_list(1000)
    for client in clients:
        client["created_at"] = datetime.fromisoformat(client["created_at"]) if isinstance(client["created_at"], str) else client["created_at"]
        if client.get("access_expires_at") and isinstance(client["access_expires_at"], str):
            client["access_expires_at"] = datetime.fromisoformat(client["access_expires_at"])
    return [ClientResponse(**c) for c in clients]

@api_router.get("/clients/{client_id}", response_model=ClientResponse)
async def get_client(client_id: str, user: dict = Depends(get_current_user)):
    if user["role"] == "client" and user.get("client_id") != client_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    
    client = await db.clients.find_one({"id": client_id}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")
    
    client["created_at"] = datetime.fromisoformat(client["created_at"]) if isinstance(client["created_at"], str) else client["created_at"]
    if client.get("access_expires_at") and isinstance(client["access_expires_at"], str):
        client["access_expires_at"] = datetime.fromisoformat(client["access_expires_at"])
    return ClientResponse(**client)

@api_router.post("/clients", response_model=ClientResponse)
async def create_client(client_data: ClientCreate, user: dict = Depends(require_admin)):
    client_dict = client_data.model_dump()
    client_dict["id"] = str(uuid.uuid4())
    client_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    client_dict["access_expires_at"] = (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()
    
    await db.clients.insert_one(client_dict)
    await log_activity(user["id"], user["email"], "create", "client", client_dict["id"], f"Created client {client_data.company_name}")
    
    client_dict["created_at"] = datetime.fromisoformat(client_dict["created_at"])
    client_dict["access_expires_at"] = datetime.fromisoformat(client_dict["access_expires_at"])
    return ClientResponse(**client_dict)

@api_router.put("/clients/{client_id}", response_model=ClientResponse)
async def update_client(client_id: str, client_data: ClientCreate, user: dict = Depends(require_admin)):
    existing = await db.clients.find_one({"id": client_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")
    
    update_dict = client_data.model_dump()
    await db.clients.update_one({"id": client_id}, {"$set": update_dict})
    await log_activity(user["id"], user["email"], "update", "client", client_id, f"Updated client {client_data.company_name}")
    
    updated = await db.clients.find_one({"id": client_id}, {"_id": 0})
    updated["created_at"] = datetime.fromisoformat(updated["created_at"]) if isinstance(updated["created_at"], str) else updated["created_at"]
    if updated.get("access_expires_at") and isinstance(updated["access_expires_at"], str):
        updated["access_expires_at"] = datetime.fromisoformat(updated["access_expires_at"])
    return ClientResponse(**updated)

@api_router.delete("/clients/{client_id}")
async def delete_client(client_id: str, user: dict = Depends(require_admin)):
    result = await db.clients.delete_one({"id": client_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")
    
    await log_activity(user["id"], user["email"], "delete", "client", client_id, f"Deleted client {client_id}")
    return {"message": "Client deleted"}

@api_router.get("/services", response_model=List[ServiceResponse])
async def get_services():
    services = await db.services.find({}, {"_id": 0}).to_list(100)
    return [ServiceResponse(**s) for s in services]

@api_router.post("/services/initialize")
async def initialize_services(user: dict = Depends(require_admin)):
    existing_count = await db.services.count_documents({})
    if existing_count > 0:
        return {"message": "Services already initialized"}
    
    services = [
        {"id": str(uuid.uuid4()), "name": "Video Shoot & Production", "description": "Professional video shooting and production services", "icon": "Video"},
        {"id": str(uuid.uuid4()), "name": "Meta Ads Management", "description": "Facebook and Instagram advertising management", "icon": "BarChart3"},
        {"id": str(uuid.uuid4()), "name": "Social Media Management", "description": "Complete social media content and management", "icon": "Share2"},
        {"id": str(uuid.uuid4()), "name": "Graphic Design", "description": "Professional graphic design services", "icon": "Image"},
        {"id": str(uuid.uuid4()), "name": "Website Setup", "description": "Professional website development and setup", "icon": "Globe"},
        {"id": str(uuid.uuid4()), "name": "E-commerce Management", "description": "Complete e-commerce store management", "icon": "ShoppingBag"},
    ]
    
    await db.services.insert_many(services)
    return {"message": "Services initialized", "count": len(services)}

@api_router.get("/client-services/{client_id}", response_model=List[ClientServiceResponse])
async def get_client_services(client_id: str, user: dict = Depends(get_current_user)):
    if user["role"] == "client" and user.get("client_id") != client_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    
    client_services = await db.client_services.find({"client_id": client_id}, {"_id": 0}).to_list(100)
    
    for cs in client_services:
        service = await db.services.find_one({"id": cs["service_id"]}, {"_id": 0})
        cs["service_name"] = service["name"] if service else "Unknown"
    
    return [ClientServiceResponse(**cs) for cs in client_services]

@api_router.post("/client-services")
async def toggle_client_service(service_data: ClientServiceBase, user: dict = Depends(require_admin)):
    existing = await db.client_services.find_one({
        "client_id": service_data.client_id,
        "service_id": service_data.service_id
    }, {"_id": 0})
    
    if existing:
        await db.client_services.update_one(
            {"client_id": service_data.client_id, "service_id": service_data.service_id},
            {"$set": {"is_active": service_data.is_active, "is_locked": service_data.is_locked}}
        )
        action = "enabled" if service_data.is_active else "disabled"
    else:
        cs_dict = service_data.model_dump()
        cs_dict["id"] = str(uuid.uuid4())
        await db.client_services.insert_one(cs_dict)
        action = "added"
    
    service = await db.services.find_one({"id": service_data.service_id}, {"_id": 0})
    await log_activity(user["id"], user["email"], "toggle_service", "client_service", service_data.client_id, f"{action} service {service['name']}")
    
    return {"message": f"Service {action}"}

@api_router.get("/videos/{client_id}", response_model=List[VideoResponse])
async def get_videos(client_id: str, user: dict = Depends(get_current_user)):
    if user["role"] == "client" and user.get("client_id") != client_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    
    videos = await db.videos.find({"client_id": client_id}, {"_id": 0}).to_list(1000)
    for video in videos:
        video["created_at"] = datetime.fromisoformat(video["created_at"]) if isinstance(video["created_at"], str) else video["created_at"]
        video["updated_at"] = datetime.fromisoformat(video["updated_at"]) if isinstance(video["updated_at"], str) else video["updated_at"]
    return [VideoResponse(**v) for v in videos]

@api_router.post("/videos", response_model=VideoResponse)
async def create_video(video_data: VideoCreate, user: dict = Depends(require_admin_or_staff)):
    video_dict = video_data.model_dump()
    video_dict["id"] = str(uuid.uuid4())
    video_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    video_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.videos.insert_one(video_dict)
    await log_activity(user["id"], user["email"], "create", "video", video_dict["id"], f"Uploaded video {video_data.file_name}")
    
    video_dict["created_at"] = datetime.fromisoformat(video_dict["created_at"])
    video_dict["updated_at"] = datetime.fromisoformat(video_dict["updated_at"])
    return VideoResponse(**video_dict)

@api_router.put("/videos/{video_id}/status")
async def update_video_status(video_id: str, status: str, notes: Optional[str] = None, user: dict = Depends(get_current_user)):
    result = await db.videos.update_one(
        {"id": video_id},
        {"$set": {"status": status, "notes": notes, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Video not found")
    
    await log_activity(user["id"], user["email"], "update_status", "video", video_id, f"Changed status to {status}")
    return {"message": "Status updated"}

@api_router.get("/designs/{client_id}", response_model=List[DesignResponse])
async def get_designs(client_id: str, user: dict = Depends(get_current_user)):
    if user["role"] == "client" and user.get("client_id") != client_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    
    designs = await db.designs.find({"client_id": client_id}, {"_id": 0}).to_list(1000)
    for design in designs:
        design["created_at"] = datetime.fromisoformat(design["created_at"]) if isinstance(design["created_at"], str) else design["created_at"]
        design["updated_at"] = datetime.fromisoformat(design["updated_at"]) if isinstance(design["updated_at"], str) else design["updated_at"]
    return [DesignResponse(**d) for d in designs]

@api_router.post("/designs", response_model=DesignResponse)
async def create_design(design_data: DesignCreate, user: dict = Depends(require_admin_or_staff)):
    design_dict = design_data.model_dump()
    design_dict["id"] = str(uuid.uuid4())
    design_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    design_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.designs.insert_one(design_dict)
    await log_activity(user["id"], user["email"], "create", "design", design_dict["id"], f"Uploaded design {design_data.file_name}")
    
    design_dict["created_at"] = datetime.fromisoformat(design_dict["created_at"])
    design_dict["updated_at"] = datetime.fromisoformat(design_dict["updated_at"])
    return DesignResponse(**design_dict)

@api_router.put("/designs/{design_id}/status")
async def update_design_status(design_id: str, status: str, notes: Optional[str] = None, user: dict = Depends(get_current_user)):
    result = await db.designs.update_one(
        {"id": design_id},
        {"$set": {"status": status, "notes": notes, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Design not found")
    
    await log_activity(user["id"], user["email"], "update_status", "design", design_id, f"Changed status to {status}")
    return {"message": "Status updated"}

@api_router.get("/social-media-posts/{client_id}", response_model=List[SocialMediaPostResponse])
async def get_social_posts(client_id: str, user: dict = Depends(get_current_user)):
    if user["role"] == "client" and user.get("client_id") != client_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    
    posts = await db.social_media_posts.find({"client_id": client_id}, {"_id": 0}).to_list(1000)
    for post in posts:
        post["created_at"] = datetime.fromisoformat(post["created_at"]) if isinstance(post["created_at"], str) else post["created_at"]
        post["updated_at"] = datetime.fromisoformat(post["updated_at"]) if isinstance(post["updated_at"], str) else post["updated_at"]
        post["post_date"] = datetime.fromisoformat(post["post_date"]) if isinstance(post["post_date"], str) else post["post_date"]
    return [SocialMediaPostResponse(**p) for p in posts]

@api_router.post("/social-media-posts", response_model=SocialMediaPostResponse)
async def create_social_post(post_data: SocialMediaPostCreate, user: dict = Depends(require_admin_or_staff)):
    post_dict = post_data.model_dump()
    post_dict["id"] = str(uuid.uuid4())
    post_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    post_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    post_dict["post_date"] = post_data.post_date.isoformat()
    
    await db.social_media_posts.insert_one(post_dict)
    await log_activity(user["id"], user["email"], "create", "social_post", post_dict["id"], f"Created {post_data.post_type}")
    
    post_dict["created_at"] = datetime.fromisoformat(post_dict["created_at"])
    post_dict["updated_at"] = datetime.fromisoformat(post_dict["updated_at"])
    post_dict["post_date"] = datetime.fromisoformat(post_dict["post_date"])
    return SocialMediaPostResponse(**post_dict)

@api_router.put("/social-media-posts/{post_id}/status")
async def update_social_post_status(post_id: str, status: str, notes: Optional[str] = None, user: dict = Depends(get_current_user)):
    result = await db.social_media_posts.update_one(
        {"id": post_id},
        {"$set": {"status": status, "notes": notes, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")
    
    await log_activity(user["id"], user["email"], "update_status", "social_post", post_id, f"Changed status to {status}")
    return {"message": "Status updated"}

@api_router.get("/ads-reports/{client_id}", response_model=List[AdsReportResponse])
async def get_ads_reports(client_id: str, user: dict = Depends(get_current_user)):
    if user["role"] == "client" and user.get("client_id") != client_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    
    reports = await db.ads_reports.find({"client_id": client_id}, {"_id": 0}).to_list(1000)
    for report in reports:
        report["created_at"] = datetime.fromisoformat(report["created_at"]) if isinstance(report["created_at"], str) else report["created_at"]
        report["report_date"] = datetime.fromisoformat(report["report_date"]) if isinstance(report["report_date"], str) else report["report_date"]
    return [AdsReportResponse(**r) for r in reports]

@api_router.post("/ads-reports", response_model=AdsReportResponse)
async def create_ads_report(report_data: AdsReportCreate, user: dict = Depends(require_admin_or_staff)):
    report_dict = report_data.model_dump()
    report_dict["id"] = str(uuid.uuid4())
    report_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    report_dict["report_date"] = report_data.report_date.isoformat()
    
    await db.ads_reports.insert_one(report_dict)
    await log_activity(user["id"], user["email"], "create", "ads_report", report_dict["id"], f"Added ads report for {report_data.campaign_name}")
    
    report_dict["created_at"] = datetime.fromisoformat(report_dict["created_at"])
    report_dict["report_date"] = datetime.fromisoformat(report_dict["report_date"])
    return AdsReportResponse(**report_dict)

@api_router.get("/calendar-events/{client_id}", response_model=List[CalendarEventResponse])
async def get_calendar_events(client_id: str, user: dict = Depends(get_current_user)):
    if user["role"] == "client" and user.get("client_id") != client_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    
    events = await db.calendar_events.find({"client_id": client_id}, {"_id": 0}).to_list(1000)
    for event in events:
        event["created_at"] = datetime.fromisoformat(event["created_at"]) if isinstance(event["created_at"], str) else event["created_at"]
        event["event_date"] = datetime.fromisoformat(event["event_date"]) if isinstance(event["event_date"], str) else event["event_date"]
    return [CalendarEventResponse(**e) for e in events]

@api_router.post("/calendar-events", response_model=CalendarEventResponse)
async def create_calendar_event(event_data: CalendarEventCreate, user: dict = Depends(require_admin_or_staff)):
    event_dict = event_data.model_dump()
    event_dict["id"] = str(uuid.uuid4())
    event_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    event_dict["event_date"] = event_data.event_date.isoformat()
    
    await db.calendar_events.insert_one(event_dict)
    await log_activity(user["id"], user["email"], "create", "calendar_event", event_dict["id"], f"Created event {event_data.title}")
    
    event_dict["created_at"] = datetime.fromisoformat(event_dict["created_at"])
    event_dict["event_date"] = datetime.fromisoformat(event_dict["event_date"])
    return CalendarEventResponse(**event_dict)

@api_router.delete("/calendar-events/{event_id}")
async def delete_calendar_event(event_id: str, user: dict = Depends(require_admin_or_staff)):
    result = await db.calendar_events.delete_one({"id": event_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
    
    await log_activity(user["id"], user["email"], "delete", "calendar_event", event_id, f"Deleted event {event_id}")
    return {"message": "Event deleted"}

@api_router.get("/receipts/{client_id}", response_model=List[ReceiptResponse])
async def get_receipts(client_id: str, user: dict = Depends(get_current_user)):
    if user["role"] == "client" and user.get("client_id") != client_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    
    receipts = await db.receipts.find({"client_id": client_id}, {"_id": 0}).to_list(1000)
    for receipt in receipts:
        receipt["created_at"] = datetime.fromisoformat(receipt["created_at"]) if isinstance(receipt["created_at"], str) else receipt["created_at"]
        receipt["updated_at"] = datetime.fromisoformat(receipt["updated_at"]) if isinstance(receipt["updated_at"], str) else receipt["updated_at"]
        receipt["payment_date"] = datetime.fromisoformat(receipt["payment_date"]) if isinstance(receipt["payment_date"], str) else receipt["payment_date"]
    return [ReceiptResponse(**r) for r in receipts]

@api_router.post("/receipts", response_model=ReceiptResponse)
async def create_receipt(receipt_data: ReceiptCreate, user: dict = Depends(get_current_user)):
    receipt_dict = receipt_data.model_dump()
    receipt_dict["id"] = str(uuid.uuid4())
    receipt_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    receipt_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    receipt_dict["payment_date"] = receipt_data.payment_date.isoformat()
    
    await db.receipts.insert_one(receipt_dict)
    await log_activity(user["id"], user["email"], "create", "receipt", receipt_dict["id"], f"Uploaded receipt for ${receipt_data.amount}")
    
    receipt_dict["created_at"] = datetime.fromisoformat(receipt_dict["created_at"])
    receipt_dict["updated_at"] = datetime.fromisoformat(receipt_dict["updated_at"])
    receipt_dict["payment_date"] = datetime.fromisoformat(receipt_dict["payment_date"])
    return ReceiptResponse(**receipt_dict)

@api_router.put("/receipts/{receipt_id}/approve")
async def approve_receipt(receipt_id: str, approve: bool, admin_notes: Optional[str] = None, background_tasks: BackgroundTasks = None, user: dict = Depends(require_admin)):
    receipt = await db.receipts.find_one({"id": receipt_id}, {"_id": 0})
    if not receipt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Receipt not found")
    
    new_status = "approved" if approve else "rejected"
    await db.receipts.update_one(
        {"id": receipt_id},
        {"$set": {"status": new_status, "admin_notes": admin_notes, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    if approve:
        client = await db.clients.find_one({"id": receipt["client_id"]}, {"_id": 0})
        new_expiry = datetime.now(timezone.utc) + timedelta(days=30)
        await db.clients.update_one(
            {"id": receipt["client_id"]},
            {"$set": {"access_days_remaining": 30, "access_expires_at": new_expiry.isoformat(), "status": "active"}}
        )
        
        if background_tasks and client:
            subject = "Payment Approved - Access Activated"
            html = f"""<html><body>
                <h2>Payment Approved</h2>
                <p>Your payment of ${receipt['amount']} has been approved.</p>
                <p>Your access has been activated for 30 days.</p>
                <p>Expires on: {new_expiry.strftime('%Y-%m-%d')}</p>
            </body></html>"""
            background_tasks.add_task(send_email, client["contact_email"], subject, html)
    
    await log_activity(user["id"], user["email"], "approve_receipt" if approve else "reject_receipt", "receipt", receipt_id, f"Receipt {new_status}")
    return {"message": f"Receipt {new_status}"}

@api_router.get("/campaigns", response_model=List[CampaignResponse])
async def get_campaigns(user: dict = Depends(get_current_user)):
    now = datetime.now(timezone.utc)
    query = {
        "is_active": True,
        "start_date": {"$lte": now.isoformat()},
        "end_date": {"$gte": now.isoformat()}
    }
    
    if user["role"] == "client":
        client_id = user.get("client_id")
        client_services = await db.client_services.find({"client_id": client_id, "is_active": True}, {"_id": 0}).to_list(100)
        active_service_ids = [cs["service_id"] for cs in client_services]
        
        all_services = await db.services.find({}, {"_id": 0}).to_list(100)
        active_service_names = [s["name"] for s in all_services if s["id"] in active_service_ids]
        
        query["$or"] = [
            {"target_specific_clients": client_id},
            {"target_service_missing": {"$nin": active_service_names}}
        ]
    
    campaigns = await db.campaigns.find(query, {"_id": 0}).to_list(100)
    for campaign in campaigns:
        campaign["created_at"] = datetime.fromisoformat(campaign["created_at"]) if isinstance(campaign["created_at"], str) else campaign["created_at"]
        campaign["start_date"] = datetime.fromisoformat(campaign["start_date"]) if isinstance(campaign["start_date"], str) else campaign["start_date"]
        campaign["end_date"] = datetime.fromisoformat(campaign["end_date"]) if isinstance(campaign["end_date"], str) else campaign["end_date"]
    return [CampaignResponse(**c) for c in campaigns]

@api_router.post("/campaigns", response_model=CampaignResponse)
async def create_campaign(campaign_data: CampaignCreate, user: dict = Depends(require_admin)):
    campaign_dict = campaign_data.model_dump()
    campaign_dict["id"] = str(uuid.uuid4())
    campaign_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    campaign_dict["start_date"] = campaign_data.start_date.isoformat()
    campaign_dict["end_date"] = campaign_data.end_date.isoformat()
    
    await db.campaigns.insert_one(campaign_dict)
    await log_activity(user["id"], user["email"], "create", "campaign", campaign_dict["id"], f"Created campaign {campaign_data.title}")
    
    campaign_dict["created_at"] = datetime.fromisoformat(campaign_dict["created_at"])
    campaign_dict["start_date"] = datetime.fromisoformat(campaign_dict["start_date"])
    campaign_dict["end_date"] = datetime.fromisoformat(campaign_dict["end_date"])
    return CampaignResponse(**campaign_dict)

@api_router.get("/activity-logs", response_model=List[ActivityLogResponse])
async def get_activity_logs(user: dict = Depends(require_admin)):
    logs = await db.activity_logs.find({}, {"_id": 0}).sort("timestamp", -1).to_list(1000)
    for log in logs:
        log["timestamp"] = datetime.fromisoformat(log["timestamp"]) if isinstance(log["timestamp"], str) else log["timestamp"]
    return [ActivityLogResponse(**log) for log in logs]

@api_router.post("/staff-permissions", response_model=StaffPermissionResponse)
async def create_staff_permission(permission_data: StaffPermissionCreate, user: dict = Depends(require_admin)):
    existing = await db.staff_permissions.find_one({"staff_id": permission_data.staff_id}, {"_id": 0})
    if existing:
        await db.staff_permissions.update_one({"staff_id": permission_data.staff_id}, {"$set": permission_data.model_dump()})
        perm_dict = permission_data.model_dump()
        perm_dict["id"] = existing["id"]
        return StaffPermissionResponse(**perm_dict)
    
    perm_dict = permission_data.model_dump()
    perm_dict["id"] = str(uuid.uuid4())
    await db.staff_permissions.insert_one(perm_dict)
    return StaffPermissionResponse(**perm_dict)

@api_router.get("/staff-permissions/{staff_id}", response_model=StaffPermissionResponse)
async def get_staff_permissions(staff_id: str, user: dict = Depends(require_admin_or_staff)):
    permissions = await db.staff_permissions.find_one({"staff_id": staff_id}, {"_id": 0})
    if not permissions:
        return StaffPermissionResponse(
            id=str(uuid.uuid4()),
            staff_id=staff_id,
            can_manage_clients=False,
            can_manage_content=False,
            can_view_reports=False,
            can_approve_receipts=False,
            can_manage_calendar=False
        )
    return StaffPermissionResponse(**permissions)

@api_router.post("/presigned-url", response_model=PresignedUrlResponse)
async def get_presigned_url(request: PresignedUrlRequest, user: dict = Depends(require_admin_or_staff)):
    if not s3_client:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="S3 not configured")
    
    file_key = f"{request.upload_path}{request.file_name}"
    
    try:
        presigned_url = s3_client.generate_presigned_url(
            'put_object',
            Params={'Bucket': S3_BUCKET_NAME, 'Key': file_key, 'ContentType': request.file_type},
            ExpiresIn=3600
        )
        
        file_url = f"https://{S3_BUCKET_NAME}.s3.{AWS_REGION}.amazonaws.com/{file_key}"
        
        return PresignedUrlResponse(upload_url=presigned_url, file_url=file_url, expires_in=3600)
    except ClientError as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
