from fastapi import FastAPI, APIRouter, HTTPException, status, Depends, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import RedirectResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
import os
import logging
import secrets
import httpx
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from urllib.parse import urlencode
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from supabase import create_client, Client

# Configure logging first
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# FastAPI app
app = FastAPI(title="Mova Dijital API", version="2.2.0")
api_router = APIRouter(prefix="/api")

# Supabase client setup
SUPABASE_URL = os.environ.get('SUPABASE_URL')
SUPABASE_SERVICE_KEY = os.environ.get('SUPABASE_SERVICE_KEY')
SUPABASE_ANON_KEY = os.environ.get('SUPABASE_ANON_KEY')

# Twilio WhatsApp Config
TWILIO_ACCOUNT_SID = os.environ.get('TWILIO_ACCOUNT_SID')
TWILIO_AUTH_TOKEN = os.environ.get('TWILIO_AUTH_TOKEN')
TWILIO_WHATSAPP_FROM = os.environ.get('TWILIO_WHATSAPP_FROM', 'whatsapp:+14155238886')

# Meta OAuth Config
META_APP_ID = os.environ.get('META_APP_ID')
META_APP_SECRET = os.environ.get('META_APP_SECRET')
META_REDIRECT_URI = os.environ.get('META_REDIRECT_URI')

# Frontend URL for OAuth redirects
FRONTEND_URL = os.environ.get('FRONTEND_URL', '')

# Initialize Supabase client safely
supabase: Client = None
if SUPABASE_URL and SUPABASE_SERVICE_KEY:
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
        logger.info("Supabase client initialized successfully")
    except Exception as e:
        logger.error(f"Supabase initialization failed: {e}")

# OAuth state storage (in production, use Redis)
oauth_state_storage = {}

# =====================================================
# INITIALIZE MAIL TABLES (if not exist)
# =====================================================
def init_mail_tables():
    """Initialize mail system tables if they don't exist"""
    import httpx
    try:
        # Check if system_settings table exists by trying to query it
        test = supabase.table('system_settings').select('id').limit(1).execute()
        logging.info("Mail tables already exist")
        return True
    except Exception as e:
        logging.warning(f"Mail tables may not exist, attempting to create: {e}")
        
    # If table doesn't exist, we need to create it via Supabase SQL Editor
    # Since we can't run raw SQL through the REST API, we'll use a workaround:
    # Store settings in a JSON file or environment variable as fallback
    return False

# Global mail settings cache (fallback if DB not available)
MAIL_SETTINGS_CACHE = {}

app = FastAPI(title="Agency OS API", version="2.2.0")
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

# =====================================================
# PYDANTIC MODELS
# =====================================================
class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: str = "client"
    client_id: Optional[str] = None

class ClientCreate(BaseModel):
    company_name: str
    contact_name: str
    contact_email: EmailStr
    contact_phone: str
    industry: str
    address: Optional[str] = None
    notes: Optional[str] = None

class ClientUpdate(BaseModel):
    company_name: Optional[str] = None
    contact_name: Optional[str] = None
    contact_email: Optional[EmailStr] = None
    contact_phone: Optional[str] = None
    industry: Optional[str] = None
    address: Optional[str] = None
    notes: Optional[str] = None
    client_status: Optional[str] = None

class ServiceToggle(BaseModel):
    client_id: str
    service_id: str
    is_enabled: bool

class ReceiptCreate(BaseModel):
    client_id: str
    file_url: str
    file_name: str
    amount: float
    payment_date: str

class ReceiptApproval(BaseModel):
    approve: bool
    admin_note: Optional[str] = None

class VideoCreate(BaseModel):
    client_id: str
    file_url: str
    file_name: str
    title: str
    project_name: Optional[str] = None
    month: Optional[str] = None
    tags: Optional[List[str]] = None

class DesignCreate(BaseModel):
    client_id: str
    file_url: str
    file_name: str
    title: str
    project_name: Optional[str] = None

class StatusUpdate(BaseModel):
    status: str
    notes: Optional[str] = None

class CalendarEventCreate(BaseModel):
    client_id: str
    event_type: str
    title: str
    event_date: str
    location: Optional[str] = None
    notes: Optional[str] = None
    checklist: Optional[List[str]] = None

class AdsReportCreate(BaseModel):
    client_id: str
    report_date: str
    campaign_name: str
    daily_spend: float = 0
    impressions: int = 0
    clicks: int = 0
    conversions: int = 0
    cpc: float = 0
    cpm: float = 0

class CampaignCreate(BaseModel):
    title: str
    content: str
    campaign_type: str
    start_date: str
    end_date: str
    target_service_missing: Optional[List[str]] = None
    target_specific_clients: Optional[List[str]] = None
    cta_type: str
    cta_link: Optional[str] = None
    is_active: bool = True

class ClientFinanceCreate(BaseModel):
    transaction_type: str
    amount: float
    transaction_date: str
    category: str
    description: Optional[str] = None
    receipt_url: Optional[str] = None

class ClientFinanceUpdate(BaseModel):
    transaction_type: Optional[str] = None
    amount: Optional[float] = None
    transaction_date: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    receipt_url: Optional[str] = None

class StaffCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    
class StaffUpdate(BaseModel):
    full_name: Optional[str] = None
    is_active: Optional[bool] = None

class StaffPermissions(BaseModel):
    staff_id: str
    can_manage_clients: bool = False
    can_manage_content: bool = False
    can_view_reports: bool = False
    can_approve_receipts: bool = False
    can_manage_calendar: bool = False

class ProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    avatar_url: Optional[str] = None
    company_name: Optional[str] = None
    address: Optional[str] = None

class MetaAccountCreate(BaseModel):
    client_id: str
    meta_access_token: str
    ad_account_id: str
    account_name: Optional[str] = None

# =====================================================
# MAIL SYSTEM MODELS
# =====================================================
class MailSettingsUpdate(BaseModel):
    provider: str  # 'smtp' or 'resend'
    # SMTP Settings
    smtp_host: Optional[str] = None
    smtp_port: Optional[int] = 587
    smtp_username: Optional[str] = None
    smtp_password: Optional[str] = None
    smtp_use_tls: Optional[bool] = True
    smtp_from_email: Optional[str] = None
    smtp_from_name: Optional[str] = "Mova Dijital"
    # Resend Settings
    resend_api_key: Optional[str] = None
    resend_from_email: Optional[str] = None

class MailTemplateUpdate(BaseModel):
    template_type: str  # 'welcome', 'receipt_approved', 'content_uploaded', etc.
    subject: str
    body_html: str

class ClientPasswordUpdate(BaseModel):
    new_password: str

class ClientUserCreate(BaseModel):
    email: EmailStr
    password: str

class SendTestEmail(BaseModel):
    to_email: EmailStr


# =====================================================
# AUTH HELPERS
# =====================================================
async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        user_response = supabase.auth.get_user(token)
        if not user_response.user:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        profile = supabase.table('profiles').select('*').eq('id', user_response.user.id).single().execute()
        if not profile.data:
            raise HTTPException(status_code=401, detail="User profile not found")
        
        return {**profile.data, 'auth_user': user_response.user}
    except Exception as e:
        logging.error(f"Auth error: {e}")
        raise HTTPException(status_code=401, detail="Invalid or expired token")


async def require_admin(user: dict = Depends(get_current_user)):
    if user.get('role') != 'admin':
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


async def require_admin_or_staff(user: dict = Depends(get_current_user)):
    if user.get('role') not in ['admin', 'staff']:
        raise HTTPException(status_code=403, detail="Admin or staff access required")
    return user


async def require_client(user: dict = Depends(get_current_user)):
    if user.get('role') != 'client':
        raise HTTPException(status_code=403, detail="Client access required")
    return user


def get_staff_permissions(staff_id: str) -> dict:
    """Get staff permissions from database"""
    try:
        response = supabase.table('staff_permissions').select('*').eq('staff_id', staff_id).single().execute()
        if response.data:
            return response.data
        return {
            'can_manage_clients': False,
            'can_manage_content': False,
            'can_view_reports': False,
            'can_approve_receipts': False,
            'can_manage_calendar': False
        }
    except Exception:
        return {
            'can_manage_clients': False,
            'can_manage_content': False,
            'can_view_reports': False,
            'can_approve_receipts': False,
            'can_manage_calendar': False
        }


async def require_permission(permission: str):
    """Factory function to create permission checker"""
    async def check_permission(user: dict = Depends(get_current_user)):
        # Admin has all permissions
        if user.get('role') == 'admin':
            return user
        
        # Staff needs specific permission
        if user.get('role') == 'staff':
            perms = get_staff_permissions(user['id'])
            if perms.get(permission, False):
                return user
            raise HTTPException(status_code=403, detail=f"Bu işlem için yetkiniz yok: {permission}")
        
        raise HTTPException(status_code=403, detail="Bu işlem için yetkiniz yok")
    return check_permission


class RevisionCreate(BaseModel):
    content_type: str  # 'video' or 'design'
    content_id: str
    message: str

class RevisionResponse(BaseModel):
    admin_response: str
    status: str  # 'in_progress', 'resolved', 'rejected'


# =====================================================
# AUDIT & NOTIFICATION HELPERS
# =====================================================
def log_audit(actor_id: str, actor_email: str, action: str, entity: str, entity_id: str = None, client_id: str = None, before: dict = None, after: dict = None):
    try:
        supabase.table('audit_logs').insert({
            'actor_user_id': actor_id,
            'actor_email': actor_email,
            'action': action,
            'entity': entity,
            'entity_id': entity_id,
            'client_id': client_id,
            'before': before,
            'after': after
        }).execute()
    except Exception as e:
        logging.error(f"Audit log error: {e}")


def create_notification(user_id: str, type: str, title: str, message: str, link: str = None):
    try:
        supabase.table('notifications').insert({
            'user_id': user_id,
            'type': type,
            'title': title,
            'message': message,
            'link': link
        }).execute()
    except Exception as e:
        logging.error(f"Notification error: {e}")


def notify_client_users(client_id: str, type: str, title: str, message: str, link: str = None):
    """Send notification and email to all users belonging to a client"""
    try:
        # Get client info for email
        client_info = supabase.table('clients').select('company_name, contact_name, contact_email').eq('id', client_id).single().execute()
        
        # Get client users for in-app notification
        client_users = supabase.table('profiles').select('id').eq('client_id', client_id).execute()
        for cu in client_users.data:
            create_notification(cu['id'], type, title, message, link)
        
        # Send email notification
        import asyncio
        if client_info.data:
            client_data = client_info.data
            template_type = None
            template_vars = {
                'client_name': client_data.get('contact_name', ''),
                'portal_url': FRONTEND_URL
            }
            
            if type == 'video_uploaded' or type == 'design_uploaded':
                template_type = 'content_uploaded'
                template_vars['content_type'] = 'video' if 'video' in type else 'tasarım'
                template_vars['content_title'] = title
            elif type == 'event_created':
                template_type = 'event_created'
                template_vars['event_title'] = title
                template_vars['event_date'] = message
                template_vars['event_location'] = ''
            
            if template_type:
                template = get_mail_template(template_type)
                if template.get('body_html'):
                    email_body = render_template(template.get('body_html', ''), template_vars)
                    # Run async send_email in sync context
                    try:
                        loop = asyncio.get_event_loop()
                    except RuntimeError:
                        loop = asyncio.new_event_loop()
                        asyncio.set_event_loop(loop)
                    
                    loop.run_until_complete(send_email(client_data.get('contact_email'), template.get('subject', title), email_body))
    except Exception as e:
        logging.error(f"Notify client users error: {e}")


def notify_admins(type: str, title: str, message: str, link: str = None):
    """Send notification to all admins"""
    try:
        admins = supabase.table('profiles').select('id').eq('role', 'admin').execute()
        for admin in admins.data:
            create_notification(admin['id'], type, title, message, link)
    except Exception as e:
        logging.error(f"Notify admins error: {e}")


# =====================================================
# ACCESS PERIOD HELPERS
# =====================================================
def get_client_access_info(client_id: str):
    """Get current access status for a client"""
    try:
        now = datetime.now(timezone.utc)
        
        # Check for active access
        access = supabase.table('client_access').select('*').eq('client_id', client_id).eq('status', 'active').gte('active_until', now.isoformat()).order('active_until', desc=True).limit(1).execute()
        
        if access.data and len(access.data) > 0:
            active_access = access.data[0]
            active_until = datetime.fromisoformat(active_access['active_until'].replace('Z', '+00:00'))
            days_remaining = (active_until - now).days
            return {
                'has_access': True,
                'access_id': active_access['id'],
                'active_from': active_access['active_from'],
                'active_until': active_access['active_until'],
                'days_remaining': max(0, days_remaining),
                'status': 'active'
            }
        
        # Check for pending receipts
        pending = supabase.table('receipts').select('id', count='exact').eq('client_id', client_id).eq('status', 'pending').execute()
        has_pending = (pending.count or 0) > 0
        
        return {
            'has_access': False,
            'access_id': None,
            'active_from': None,
            'active_until': None,
            'days_remaining': 0,
            'status': 'pending' if has_pending else 'expired',
            'has_pending_receipt': has_pending
        }
    except Exception as e:
        logging.error(f"Get client access info error: {e}")
        return {'has_access': False, 'days_remaining': 0, 'status': 'error'}


def create_or_extend_access(client_id: str, receipt_id: str, activated_by: str, days: int = 30):
    """Create new access period or extend existing one"""
    try:
        now = datetime.now(timezone.utc)
        
        # Check for existing active access
        existing = supabase.table('client_access').select('*').eq('client_id', client_id).eq('status', 'active').gte('active_until', now.isoformat()).order('active_until', desc=True).limit(1).execute()
        
        if existing.data and len(existing.data) > 0:
            # Extend existing access
            current_until = datetime.fromisoformat(existing.data[0]['active_until'].replace('Z', '+00:00'))
            new_until = current_until + timedelta(days=days)
            
            supabase.table('client_access').update({
                'active_until': new_until.isoformat(),
                'notes': f'Extended by {days} days on {now.strftime("%Y-%m-%d")}'
            }).eq('id', existing.data[0]['id']).execute()
            
            access_id = existing.data[0]['id']
            active_until = new_until
        else:
            # Create new access period
            new_until = now + timedelta(days=days)
            
            result = supabase.table('client_access').insert({
                'client_id': client_id,
                'receipt_id': receipt_id,
                'active_from': now.isoformat(),
                'active_until': new_until.isoformat(),
                'status': 'active',
                'activated_by': activated_by
            }).execute()
            
            access_id = result.data[0]['id']
            active_until = new_until
        
        # Update client record
        days_remaining = (active_until - now).days
        supabase.table('clients').update({
            'status': 'active',
            'current_access_id': access_id,
            'access_days_remaining': days_remaining,
            'access_expires_at': active_until.isoformat(),
            'has_pending_receipt': False
        }).eq('id', client_id).execute()
        
        return {
            'access_id': access_id,
            'active_until': active_until.isoformat(),
            'days_remaining': days_remaining
        }
    except Exception as e:
        logging.error(f"Create/extend access error: {e}")
        raise


# =====================================================
# AUTH ENDPOINTS
# =====================================================
@api_router.get("/health")
async def api_health_check():
    """API Health check endpoint"""
    return {"status": "healthy"}

@api_router.get("/")
async def api_root():
    """API Root endpoint"""
    return {"message": "Mova Dijital API v2.2", "status": "running"}
@api_router.post("/auth/login")
async def login(request: LoginRequest):
    if not supabase:
        raise HTTPException(status_code=503, detail="Veritabanı bağlantısı yapılandırılmamış")
    try:
        response = supabase.auth.sign_in_with_password({
            "email": request.email,
            "password": request.password
        })
        
        if not response.user:
            raise HTTPException(status_code=401, detail="Geçersiz kimlik bilgileri")
        
        profile = supabase.table('profiles').select('*').eq('id', response.user.id).single().execute()
        
        if not profile.data:
            raise HTTPException(status_code=401, detail="Kullanıcı profili bulunamadı")
        
        # Get access info for clients
        access_info = None
        if profile.data.get('role') == 'client' and profile.data.get('client_id'):
            access_info = get_client_access_info(profile.data['client_id'])
        
        return {
            "access_token": response.session.access_token,
            "refresh_token": response.session.refresh_token,
            "token_type": "bearer",
            "role": profile.data.get('role'),
            "client_id": profile.data.get('client_id'),
            "access_info": access_info,
            "user": {
                "id": profile.data.get('id'),
                "email": profile.data.get('email'),
                "full_name": profile.data.get('full_name'),
                "role": profile.data.get('role'),
                "client_id": profile.data.get('client_id'),
                "avatar_url": profile.data.get('avatar_url')
            }
        }
    except Exception as e:
        logging.error(f"Login error: {e}")
        raise HTTPException(status_code=401, detail="Geçersiz kimlik bilgileri")


@api_router.post("/auth/register")
async def register(request: RegisterRequest, admin_user: dict = Depends(require_admin)):
    try:
        auth_response = supabase.auth.admin.create_user({
            "email": request.email,
            "password": request.password,
            "email_confirm": True
        })
        
        if not auth_response.user:
            raise HTTPException(status_code=400, detail="Kullanıcı oluşturulamadı")
        
        profile_data = {
            "id": auth_response.user.id,
            "email": request.email,
            "full_name": request.full_name,
            "role": request.role,
            "client_id": request.client_id
        }
        
        supabase.table('profiles').insert(profile_data).execute()
        
        log_audit(admin_user['id'], admin_user['email'], 'create', 'user', auth_response.user.id, None, None, profile_data)
        
        return {"message": "Kullanıcı başarıyla oluşturuldu", "user_id": auth_response.user.id}
    except Exception as e:
        logging.error(f"Register error: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@api_router.get("/auth/me")
async def get_me(user: dict = Depends(get_current_user)):
    access_info = None
    if user.get('role') == 'client' and user.get('client_id'):
        access_info = get_client_access_info(user['client_id'])
    
    return {
        "id": user.get('id'),
        "email": user.get('email'),
        "full_name": user.get('full_name'),
        "role": user.get('role'),
        "client_id": user.get('client_id'),
        "avatar_url": user.get('avatar_url'),
        "created_at": user.get('created_at'),
        "access_info": access_info
    }


# =====================================================
# INIT SYSTEM
# =====================================================
@api_router.post("/init-system")
async def init_system():
    try:
        existing = supabase.table('profiles').select('id').eq('role', 'admin').limit(1).execute()
        
        if existing.data and len(existing.data) > 0:
            return {"message": "Sistem zaten başlatılmış", "admin_exists": True}
        
        auth_response = supabase.auth.admin.create_user({
            "email": "admin@agency.com",
            "password": "admin123",
            "email_confirm": True
        })
        
        if not auth_response.user:
            raise HTTPException(status_code=500, detail="Admin kullanıcısı oluşturulamadı")
        
        supabase.table('profiles').insert({
            "id": auth_response.user.id,
            "email": "admin@agency.com",
            "full_name": "Admin Kullanıcı",
            "role": "admin"
        }).execute()
        
        return {
            "message": "Sistem başarıyla başlatıldı",
            "admin_email": "admin@agency.com",
            "admin_password": "admin123"
        }
    except Exception as e:
        logging.error(f"Init system error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# =====================================================
# CLIENTS
# =====================================================
@api_router.get("/clients")
async def get_clients(user: dict = Depends(require_admin_or_staff)):
    try:
        # Fetch all clients
        response = supabase.table('clients').select('*').order('created_at', desc=True).execute()
        
        if not response.data:
            return []
        
        # Batch fetch all client access info in a single query
        client_ids = [client['id'] for client in response.data]
        now = datetime.now(timezone.utc)
        
        # Get all active access records for these clients
        access_response = supabase.table('client_access').select('*').in_('client_id', client_ids).eq('status', 'active').gte('active_until', now.isoformat()).execute()
        
        # Get pending receipts count for all clients
        pending_response = supabase.table('receipts').select('client_id').in_('client_id', client_ids).eq('status', 'pending').execute()
        
        # Create lookup maps
        access_map = {}
        for access in (access_response.data or []):
            cid = access['client_id']
            if cid not in access_map:
                access_map[cid] = access
            else:
                # Keep the one with latest active_until
                existing_until = datetime.fromisoformat(access_map[cid]['active_until'].replace('Z', '+00:00'))
                new_until = datetime.fromisoformat(access['active_until'].replace('Z', '+00:00'))
                if new_until > existing_until:
                    access_map[cid] = access
        
        pending_map = {}
        for pending in (pending_response.data or []):
            cid = pending['client_id']
            pending_map[cid] = pending_map.get(cid, 0) + 1
        
        # Build result with access info
        result = []
        for client in response.data:
            client_data = dict(client)
            cid = client['id']
            
            if cid in access_map:
                active_access = access_map[cid]
                active_until = datetime.fromisoformat(active_access['active_until'].replace('Z', '+00:00'))
                days_remaining = (active_until - now).days
                client_data['access_info'] = {
                    'has_access': True,
                    'access_id': active_access['id'],
                    'active_from': active_access['active_from'],
                    'active_until': active_access['active_until'],
                    'days_remaining': max(0, days_remaining),
                    'status': 'active'
                }
            else:
                has_pending = pending_map.get(cid, 0) > 0
                client_data['access_info'] = {
                    'has_access': False,
                    'access_id': None,
                    'active_from': None,
                    'active_until': None,
                    'days_remaining': 0,
                    'status': 'pending' if has_pending else 'expired',
                    'has_pending_receipt': has_pending
                }
            
            result.append(client_data)
        
        return result
    except Exception as e:
        logging.error(f"Get clients error: {e}")
        raise HTTPException(status_code=500, detail="Müşteriler yüklenemedi")


@api_router.get("/clients/{client_id}")
async def get_client(client_id: str, user: dict = Depends(get_current_user)):
    try:
        if user.get('role') == 'client' and str(user.get('client_id')) != client_id:
            raise HTTPException(status_code=403, detail="Erişim reddedildi")
        
        response = supabase.table('clients').select('*').eq('id', client_id).single().execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Müşteri bulunamadı")
        
        client_data = dict(response.data)
        client_data['access_info'] = get_client_access_info(client_id)
        
        return client_data
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Get client error: {e}")
        raise HTTPException(status_code=500, detail="Müşteri yüklenemedi")


@api_router.post("/clients")
async def create_client(client: ClientCreate, user: dict = Depends(require_admin)):
    try:
        client_data = client.model_dump()
        client_data['status'] = 'pending'
        client_data['access_days_remaining'] = 0
        client_data['has_pending_receipt'] = False
        
        response = supabase.table('clients').insert(client_data).execute()
        
        log_audit(user['id'], user['email'], 'create', 'client', response.data[0]['id'], response.data[0]['id'], None, client_data)
        
        return response.data[0]
    except Exception as e:
        logging.error(f"Create client error: {e}")
        raise HTTPException(status_code=500, detail="Müşteri oluşturulamadı")


@api_router.put("/clients/{client_id}")
async def update_client(client_id: str, client: ClientUpdate, user: dict = Depends(require_admin)):
    try:
        existing = supabase.table('clients').select('*').eq('id', client_id).single().execute()
        if not existing.data:
            raise HTTPException(status_code=404, detail="Müşteri bulunamadı")
        
        update_data = {k: v for k, v in client.model_dump().items() if v is not None}
        
        response = supabase.table('clients').update(update_data).eq('id', client_id).execute()
        
        log_audit(user['id'], user['email'], 'update', 'client', client_id, client_id, existing.data, update_data)
        
        # Notify client
        notify_client_users(client_id, 'client_updated', 'Profil Güncellendi', 'Müşteri profiliniz güncellendi.', '/client/dashboard')
        
        return response.data[0]
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Update client error: {e}")
        raise HTTPException(status_code=500, detail="Müşteri güncellenemedi")


@api_router.delete("/clients/{client_id}")
async def delete_client(client_id: str, user: dict = Depends(require_admin)):
    try:
        existing = supabase.table('clients').select('*').eq('id', client_id).single().execute()
        if not existing.data:
            raise HTTPException(status_code=404, detail="Müşteri bulunamadı")
        
        supabase.table('clients').delete().eq('id', client_id).execute()
        
        log_audit(user['id'], user['email'], 'delete', 'client', client_id, client_id, existing.data, None)
        
        return {"message": "Müşteri silindi"}
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Delete client error: {e}")
        raise HTTPException(status_code=500, detail="Müşteri silinemedi")


# =====================================================
# CLIENT ACCESS
# =====================================================
@api_router.get("/client-access/{client_id}")
async def get_client_access(client_id: str, user: dict = Depends(get_current_user)):
    try:
        if user.get('role') == 'client' and str(user.get('client_id')) != client_id:
            raise HTTPException(status_code=403, detail="Erişim reddedildi")
        
        return get_client_access_info(client_id)
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Get client access error: {e}")
        raise HTTPException(status_code=500, detail="Erişim bilgisi yüklenemedi")


@api_router.get("/client-access/{client_id}/history")
async def get_client_access_history(client_id: str, user: dict = Depends(get_current_user)):
    try:
        if user.get('role') == 'client' and str(user.get('client_id')) != client_id:
            raise HTTPException(status_code=403, detail="Erişim reddedildi")
        
        response = supabase.table('client_access').select('*').eq('client_id', client_id).order('created_at', desc=True).execute()
        return response.data
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Get access history error: {e}")
        raise HTTPException(status_code=500, detail="Erişim geçmişi yüklenemedi")


# =====================================================
# SERVICES
# =====================================================
@api_router.get("/services")
async def get_services():
    try:
        response = supabase.table('services').select('*').execute()
        return response.data
    except Exception as e:
        logging.error(f"Get services error: {e}")
        raise HTTPException(status_code=500, detail="Hizmetler yüklenemedi")


@api_router.get("/client-services/{client_id}")
async def get_client_services(client_id: str, user: dict = Depends(get_current_user)):
    try:
        if user.get('role') == 'client' and str(user.get('client_id')) != client_id:
            raise HTTPException(status_code=403, detail="Erişim reddedildi")
        
        services = supabase.table('services').select('*').execute()
        client_services = supabase.table('client_services').select('*').eq('client_id', client_id).execute()
        
        cs_map = {str(cs['service_id']): cs for cs in client_services.data}
        
        result = []
        for service in services.data:
            cs = cs_map.get(str(service['id']), {})
            result.append({
                'id': cs.get('id', ''),
                'client_id': client_id,
                'service_id': service['id'],
                'service_name': service['name'],
                'is_active': cs.get('is_enabled', False),
                'is_enabled': cs.get('is_enabled', False),
                'is_locked': not cs.get('is_enabled', False)
            })
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Get client services error: {e}")
        raise HTTPException(status_code=500, detail="Müşteri hizmetleri yüklenemedi")


@api_router.post("/client-services")
async def toggle_client_service(data: ServiceToggle, user: dict = Depends(require_admin)):
    try:
        existing = supabase.table('client_services').select('*').eq('client_id', data.client_id).eq('service_id', data.service_id).execute()
        
        if existing.data and len(existing.data) > 0:
            supabase.table('client_services').update({'is_enabled': data.is_enabled}).eq('id', existing.data[0]['id']).execute()
            action = "etkinleştirildi" if data.is_enabled else "devre dışı bırakıldı"
        else:
            supabase.table('client_services').insert({
                'client_id': data.client_id,
                'service_id': data.service_id,
                'is_enabled': data.is_enabled
            }).execute()
            action = "eklendi"
        
        service = supabase.table('services').select('name').eq('id', data.service_id).single().execute()
        service_name = service.data.get('name', 'Hizmet') if service.data else 'Hizmet'
        
        log_audit(user['id'], user['email'], 'toggle_service', 'client_service', data.service_id, data.client_id, None, {'is_enabled': data.is_enabled})
        
        # Notify client
        notify_client_users(data.client_id, 'service_toggle', 'Hizmet Güncellendi', f'{service_name} hizmeti {action}.', '/client/dashboard')
        
        return {"message": f"Hizmet {action}: {service_name}"}
    except Exception as e:
        logging.error(f"Toggle service error: {e}")
        raise HTTPException(status_code=500, detail="Hizmet durumu güncellenemedi")


# =====================================================
# RECEIPTS
# =====================================================
@api_router.get("/receipts")
async def get_all_receipts(user: dict = Depends(require_admin_or_staff)):
    try:
        response = supabase.table('receipts').select('*, clients(company_name)').order('created_at', desc=True).execute()
        
        result = []
        for receipt in response.data:
            receipt_data = {k: v for k, v in receipt.items() if k != 'clients'}
            receipt_data['client_name'] = receipt.get('clients', {}).get('company_name', 'Bilinmeyen') if receipt.get('clients') else 'Bilinmeyen'
            result.append(receipt_data)
        
        return result
    except Exception as e:
        logging.error(f"Get all receipts error: {e}")
        raise HTTPException(status_code=500, detail="Makbuzlar yüklenemedi")


@api_router.get("/receipts/client/{client_id}")
async def get_client_receipts(client_id: str, year: Optional[int] = None, month: Optional[int] = None, receipt_status: Optional[str] = None, user: dict = Depends(get_current_user)):
    try:
        if user.get('role') == 'client' and str(user.get('client_id')) != client_id:
            raise HTTPException(status_code=403, detail="Erişim reddedildi")
        
        query = supabase.table('receipts').select('*').eq('client_id', client_id)
        
        if receipt_status:
            query = query.eq('status', receipt_status)
        
        response = query.order('created_at', desc=True).execute()
        
        # Group by month
        grouped = {}
        for receipt in response.data:
            created = datetime.fromisoformat(receipt['created_at'].replace('Z', '+00:00'))
            
            # Filter by year/month if provided
            if year and created.year != year:
                continue
            if month and created.month != month:
                continue
            
            month_key = created.strftime('%Y-%m')
            month_label = created.strftime('%B %Y')
            
            if month_key not in grouped:
                grouped[month_key] = {
                    'month_key': month_key,
                    'month_label': month_label,
                    'receipts': []
                }
            grouped[month_key]['receipts'].append(receipt)
        
        # Sort by month descending
        result = sorted(grouped.values(), key=lambda x: x['month_key'], reverse=True)
        
        return {
            'grouped': result,
            'all': response.data
        }
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Get receipts error: {e}")
        raise HTTPException(status_code=500, detail="Makbuzlar yüklenemedi")


@api_router.get("/receipts/pending/count")
async def get_pending_receipts_count(user: dict = Depends(require_admin_or_staff)):
    try:
        response = supabase.table('receipts').select('id', count='exact').eq('status', 'pending').execute()
        return {"count": response.count or 0}
    except Exception as e:
        logging.error(f"Get pending count error: {e}")
        return {"count": 0}


@api_router.post("/receipts")
async def create_receipt(receipt: ReceiptCreate, user: dict = Depends(get_current_user)):
    try:
        receipt_data = receipt.model_dump()
        receipt_data['uploaded_by'] = user['id']
        receipt_data['status'] = 'pending'
        
        response = supabase.table('receipts').insert(receipt_data).execute()
        
        # Update client has_pending_receipt
        supabase.table('clients').update({'has_pending_receipt': True}).eq('id', receipt.client_id).execute()
        
        log_audit(user['id'], user['email'], 'create', 'receipt', response.data[0]['id'], receipt.client_id, None, receipt_data)
        
        # Notify admins
        notify_admins(
            'receipt_pending',
            'Yeni Makbuz',
            f'₺{receipt.amount:,.2f} tutarında yeni bir makbuz yüklendi ve onay bekliyor.',
            '/admin/receipts'
        )
        
        return response.data[0]
    except Exception as e:
        logging.error(f"Create receipt error: {e}")
        raise HTTPException(status_code=500, detail="Makbuz oluşturulamadı")


@api_router.put("/receipts/{receipt_id}/approve")
async def approve_receipt(receipt_id: str, approval: ReceiptApproval, user: dict = Depends(require_admin)):
    try:
        receipt = supabase.table('receipts').select('*').eq('id', receipt_id).single().execute()
        if not receipt.data:
            raise HTTPException(status_code=404, detail="Makbuz bulunamadı")
        
        new_status = 'approved' if approval.approve else 'rejected'
        now = datetime.now(timezone.utc)
        
        # Update receipt
        update_data = {
            'status': new_status,
            'admin_note': approval.admin_note,
            'approved_by': user['id'],
            'approved_at': now.isoformat()
        }
        
        supabase.table('receipts').update(update_data).eq('id', receipt_id).execute()
        
        client_id = receipt.data['client_id']
        amount = receipt.data['amount']
        
        if approval.approve:
            # Create/extend access period - THIS IS THE KEY LOGIC
            access_result = create_or_extend_access(
                client_id=client_id,
                receipt_id=receipt_id,
                activated_by=user['id'],
                days=30
            )
            
            # Update total_paid
            client = supabase.table('clients').select('total_paid').eq('id', client_id).single().execute()
            current_paid = client.data.get('total_paid', 0) or 0
            supabase.table('clients').update({
                'total_paid': current_paid + amount
            }).eq('id', client_id).execute()
            
            # Create finance transaction (agency income)
            supabase.table('finance_transactions').insert({
                'transaction_type': 'income',
                'client_id': client_id,
                'amount': amount,
                'currency': 'TRY',
                'transaction_date': receipt.data['payment_date'],
                'category': 'Hizmet Ödemesi',
                'status': 'received',
                'receipt_id': receipt_id,
                'created_by': user['id']
            }).execute()
            
            # Notify client
            notify_client_users(
                client_id,
                'receipt_approved',
                'Makbuz Onaylandı',
                f'₺{amount:,.2f} tutarındaki makbuzunuz onaylandı. 30 günlük erişiminiz aktifleştirildi. Bitiş tarihi: {access_result["active_until"][:10]}',
                '/client/dashboard'
            )
            
            log_audit(user['id'], user['email'], 'receipt_approved', 'receipt', receipt_id, client_id, receipt.data, {
                'status': new_status,
                'access_until': access_result['active_until'],
                'days_granted': 30
            })
            
            return {
                "message": "Makbuz onaylandı ve 30 günlük erişim aktifleştirildi",
                "access_until": access_result['active_until'],
                "days_remaining": access_result['days_remaining']
            }
        else:
            # Rejected - check if there are other pending receipts
            pending_count = supabase.table('receipts').select('id', count='exact').eq('client_id', client_id).eq('status', 'pending').execute()
            has_pending = (pending_count.count or 0) > 0
            
            supabase.table('clients').update({'has_pending_receipt': has_pending}).eq('id', client_id).execute()
            
            # Notify client
            notify_client_users(
                client_id,
                'receipt_rejected',
                'Makbuz Reddedildi',
                f'₺{amount:,.2f} tutarındaki makbuzunuz reddedildi. {approval.admin_note or ""}',
                '/client/receipts'
            )
            
            log_audit(user['id'], user['email'], 'receipt_rejected', 'receipt', receipt_id, client_id, receipt.data, {
                'status': new_status,
                'admin_note': approval.admin_note
            })
            
            return {"message": "Makbuz reddedildi"}
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Approve receipt error: {e}")
        raise HTTPException(status_code=500, detail="Makbuz işlenemedi")


@api_router.delete("/receipts/{receipt_id}")
async def delete_receipt(receipt_id: str, user: dict = Depends(get_current_user)):
    try:
        receipt = supabase.table('receipts').select('*').eq('id', receipt_id).single().execute()
        if not receipt.data:
            raise HTTPException(status_code=404, detail="Makbuz bulunamadı")
        
        # Only allow deletion of pending receipts by the uploader or admin
        if user.get('role') != 'admin' and receipt.data.get('uploaded_by') != user['id']:
            raise HTTPException(status_code=403, detail="Bu makbuzu silme yetkiniz yok")
        
        if receipt.data.get('status') != 'pending':
            raise HTTPException(status_code=400, detail="Sadece bekleyen makbuzlar silinebilir")
        
        client_id = receipt.data['client_id']
        
        supabase.table('receipts').delete().eq('id', receipt_id).execute()
        
        # Update has_pending_receipt
        pending_count = supabase.table('receipts').select('id', count='exact').eq('client_id', client_id).eq('status', 'pending').execute()
        has_pending = (pending_count.count or 0) > 0
        supabase.table('clients').update({'has_pending_receipt': has_pending}).eq('id', client_id).execute()
        
        log_audit(user['id'], user['email'], 'delete', 'receipt', receipt_id, client_id, receipt.data, None)
        
        return {"message": "Makbuz silindi"}
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Delete receipt error: {e}")
        raise HTTPException(status_code=500, detail="Makbuz silinemedi")


# =====================================================
# CLIENT FINANCE (Müşteri Muhasebesi)
# =====================================================
@api_router.get("/client-finance/categories")
async def get_finance_categories():
    try:
        response = supabase.table('finance_categories').select('*').eq('is_active', True).order('sort_order').execute()
        return response.data
    except Exception as e:
        logging.error(f"Get finance categories error: {e}")
        raise HTTPException(status_code=500, detail="Kategoriler yüklenemedi")


@api_router.get("/client-finance/{client_id}")
async def get_client_finance(client_id: str, year: Optional[int] = None, month: Optional[int] = None, user: dict = Depends(get_current_user)):
    try:
        if user.get('role') == 'client' and str(user.get('client_id')) != client_id:
            raise HTTPException(status_code=403, detail="Erişim reddedildi")
        
        query = supabase.table('client_finance_transactions').select('*').eq('client_id', client_id)
        
        response = query.order('transaction_date', desc=True).execute()
        
        # Filter by year/month if provided
        transactions = response.data
        if year or month:
            filtered = []
            for t in transactions:
                t_date = datetime.fromisoformat(t['transaction_date'])
                if year and t_date.year != year:
                    continue
                if month and t_date.month != month:
                    continue
                filtered.append(t)
            transactions = filtered
        
        # Calculate summary
        total_income = sum(float(t['amount']) for t in transactions if t['transaction_type'] == 'income')
        total_expense = sum(float(t['amount']) for t in transactions if t['transaction_type'] == 'expense')
        net_profit = total_income - total_expense
        
        # Group by category for expenses
        expense_by_category = {}
        for t in transactions:
            if t['transaction_type'] == 'expense':
                cat = t['category']
                expense_by_category[cat] = expense_by_category.get(cat, 0) + float(t['amount'])
        
        return {
            'transactions': transactions,
            'summary': {
                'total_income': total_income,
                'total_expense': total_expense,
                'net_profit': net_profit,
                'expense_by_category': expense_by_category
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Get client finance error: {e}")
        raise HTTPException(status_code=500, detail="Finans verileri yüklenemedi")


@api_router.get("/client-finance/{client_id}/monthly-summary")
async def get_client_monthly_summary(client_id: str, months: int = 12, user: dict = Depends(get_current_user)):
    try:
        if user.get('role') == 'client' and str(user.get('client_id')) != client_id:
            raise HTTPException(status_code=403, detail="Erişim reddedildi")
        
        response = supabase.table('client_finance_transactions').select('*').eq('client_id', client_id).order('transaction_date', desc=True).execute()
        
        # Group by month
        monthly = {}
        for t in response.data:
            t_date = datetime.fromisoformat(t['transaction_date'])
            month_key = t_date.strftime('%Y-%m')
            
            if month_key not in monthly:
                monthly[month_key] = {
                    'month': month_key,
                    'month_label': t_date.strftime('%B %Y'),
                    'income': 0,
                    'expense': 0,
                    'net_profit': 0
                }
            
            if t['transaction_type'] == 'income':
                monthly[month_key]['income'] += float(t['amount'])
            else:
                monthly[month_key]['expense'] += float(t['amount'])
        
        # Calculate net profit for each month
        for m in monthly.values():
            m['net_profit'] = m['income'] - m['expense']
        
        # Sort and limit
        result = sorted(monthly.values(), key=lambda x: x['month'], reverse=True)[:months]
        result.reverse()  # Oldest first for charts
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Get monthly summary error: {e}")
        raise HTTPException(status_code=500, detail="Aylık özet yüklenemedi")


@api_router.post("/client-finance/{client_id}")
async def create_client_finance(client_id: str, data: ClientFinanceCreate, user: dict = Depends(get_current_user)):
    try:
        if user.get('role') == 'client' and str(user.get('client_id')) != client_id:
            raise HTTPException(status_code=403, detail="Erişim reddedildi")
        
        finance_data = data.model_dump()
        finance_data['client_id'] = client_id
        finance_data['created_by'] = user['id']
        finance_data['currency'] = 'TRY'
        
        response = supabase.table('client_finance_transactions').insert(finance_data).execute()
        
        log_audit(user['id'], user['email'], 'create', 'client_finance', response.data[0]['id'], client_id, None, finance_data)
        
        return response.data[0]
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Create client finance error: {e}")
        raise HTTPException(status_code=500, detail="Finans kaydı oluşturulamadı")


@api_router.put("/client-finance/{client_id}/{transaction_id}")
async def update_client_finance(client_id: str, transaction_id: str, data: ClientFinanceUpdate, user: dict = Depends(get_current_user)):
    try:
        if user.get('role') == 'client' and str(user.get('client_id')) != client_id:
            raise HTTPException(status_code=403, detail="Erişim reddedildi")
        
        existing = supabase.table('client_finance_transactions').select('*').eq('id', transaction_id).eq('client_id', client_id).single().execute()
        if not existing.data:
            raise HTTPException(status_code=404, detail="Kayıt bulunamadı")
        
        update_data = {k: v for k, v in data.model_dump().items() if v is not None}
        
        response = supabase.table('client_finance_transactions').update(update_data).eq('id', transaction_id).execute()
        
        log_audit(user['id'], user['email'], 'update', 'client_finance', transaction_id, client_id, existing.data, update_data)
        
        return response.data[0]
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Update client finance error: {e}")
        raise HTTPException(status_code=500, detail="Finans kaydı güncellenemedi")


@api_router.delete("/client-finance/{client_id}/{transaction_id}")
async def delete_client_finance(client_id: str, transaction_id: str, user: dict = Depends(get_current_user)):
    try:
        if user.get('role') == 'client' and str(user.get('client_id')) != client_id:
            raise HTTPException(status_code=403, detail="Erişim reddedildi")
        
        existing = supabase.table('client_finance_transactions').select('*').eq('id', transaction_id).eq('client_id', client_id).single().execute()
        if not existing.data:
            raise HTTPException(status_code=404, detail="Kayıt bulunamadı")
        
        supabase.table('client_finance_transactions').delete().eq('id', transaction_id).execute()
        
        log_audit(user['id'], user['email'], 'delete', 'client_finance', transaction_id, client_id, existing.data, None)
        
        return {"message": "Finans kaydı silindi"}
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Delete client finance error: {e}")
        raise HTTPException(status_code=500, detail="Finans kaydı silinemedi")


@api_router.get("/client-finance/{client_id}/export")
async def export_client_finance(client_id: str, year: Optional[int] = None, month: Optional[int] = None, user: dict = Depends(get_current_user)):
    """Export client finance data as CSV-compatible JSON"""
    try:
        if user.get('role') == 'client' and str(user.get('client_id')) != client_id:
            raise HTTPException(status_code=403, detail="Erişim reddedildi")
        
        response = supabase.table('client_finance_transactions').select('*').eq('client_id', client_id).order('transaction_date', desc=True).execute()
        
        transactions = response.data
        if year or month:
            filtered = []
            for t in transactions:
                t_date = datetime.fromisoformat(t['transaction_date'])
                if year and t_date.year != year:
                    continue
                if month and t_date.month != month:
                    continue
                filtered.append(t)
            transactions = filtered
        
        # Format for CSV export
        export_data = []
        for t in transactions:
            export_data.append({
                'Tarih': t['transaction_date'],
                'Tür': 'Gelir' if t['transaction_type'] == 'income' else 'Gider',
                'Kategori': t['category'],
                'Açıklama': t.get('description', ''),
                'Tutar': t['amount'],
                'Para Birimi': t.get('currency', 'TRY')
            })
        
        return {'data': export_data, 'count': len(export_data)}
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Export client finance error: {e}")
        raise HTTPException(status_code=500, detail="Dışa aktarma başarısız")


# =====================================================
# ADMIN FINANCE / ACCOUNTING
# =====================================================

@api_router.get("/admin/finance/overview")
async def get_admin_finance_overview(year: Optional[int] = None, month: Optional[int] = None, user: dict = Depends(get_current_user)):
    """Admin: Get aggregated financial overview across all clients + agency"""
    if user.get('role') not in ['admin']:
        raise HTTPException(status_code=403, detail="Yetki yok")
    try:
        # Get all client transactions
        query = supabase.table('client_finance_transactions').select('*, clients(company_name, contact_name)')
        if year:
            query = query.gte('transaction_date', f'{year}-01-01').lte('transaction_date', f'{year}-12-31')
        if month and year:
            import calendar
            last_day = calendar.monthrange(year, month)[1]
            query = query.gte('transaction_date', f'{year}-{month:02d}-01').lte('transaction_date', f'{year}-{month:02d}-{last_day:02d}')
        all_transactions = query.order('transaction_date', desc=True).execute()

        transactions = all_transactions.data or []
        total_income = sum(float(t['amount']) for t in transactions if t['transaction_type'] == 'income')
        total_expense = sum(float(t['amount']) for t in transactions if t['transaction_type'] == 'expense')
        net = total_income - total_expense

        # Per-client summary
        client_summary = {}
        for t in transactions:
            cid = t['client_id']
            if cid not in client_summary:
                client_info = t.get('clients') or {}
                client_summary[cid] = {
                    'client_id': cid,
                    'company_name': client_info.get('company_name', 'Bilinmeyen'),
                    'contact_name': client_info.get('contact_name', ''),
                    'income': 0.0,
                    'expense': 0.0,
                    'net': 0.0,
                    'transaction_count': 0
                }
            amount = float(t['amount'])
            if t['transaction_type'] == 'income':
                client_summary[cid]['income'] += amount
            else:
                client_summary[cid]['expense'] += amount
            client_summary[cid]['transaction_count'] += 1
            client_summary[cid]['net'] = client_summary[cid]['income'] - client_summary[cid]['expense']

        # Monthly trend (last 12 months)
        from collections import defaultdict
        monthly = defaultdict(lambda: {'income': 0.0, 'expense': 0.0})
        for t in transactions:
            month_key = t['transaction_date'][:7]
            amount = float(t['amount'])
            if t['transaction_type'] == 'income':
                monthly[month_key]['income'] += amount
            else:
                monthly[month_key]['expense'] += amount
        monthly_list = sorted([{'month': k, **v} for k, v in monthly.items()], key=lambda x: x['month'])

        # Category breakdown
        cat_breakdown = defaultdict(lambda: {'income': 0.0, 'expense': 0.0})
        for t in transactions:
            cat = t.get('category', 'other')
            amount = float(t['amount'])
            if t['transaction_type'] == 'income':
                cat_breakdown[cat]['income'] += amount
            else:
                cat_breakdown[cat]['expense'] += amount

        return {
            'summary': {
                'total_income': round(total_income, 2),
                'total_expense': round(total_expense, 2),
                'net_profit': round(net, 2),
                'transaction_count': len(transactions),
                'client_count': len(client_summary)
            },
            'client_summary': sorted(client_summary.values(), key=lambda x: x['net'], reverse=True),
            'monthly_trend': monthly_list,
            'category_breakdown': [{'category': k, **v} for k, v in cat_breakdown.items()]
        }
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Admin finance overview error: {e}")
        raise HTTPException(status_code=500, detail="Muhasebe özeti yüklenemedi")


@api_router.get("/admin/finance/transactions")
async def get_admin_finance_transactions(
    year: Optional[int] = None,
    month: Optional[int] = None,
    client_id: Optional[str] = None,
    transaction_type: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    """Admin: Get all transactions with client info"""
    if user.get('role') not in ['admin']:
        raise HTTPException(status_code=403, detail="Yetki yok")
    try:
        query = supabase.table('client_finance_transactions').select('*, clients(company_name, contact_name)')
        if year:
            query = query.gte('transaction_date', f'{year}-01-01').lte('transaction_date', f'{year}-12-31')
        if month and year:
            import calendar
            last_day = calendar.monthrange(year, month)[1]
            query = query.gte('transaction_date', f'{year}-{month:02d}-01').lte('transaction_date', f'{year}-{month:02d}-{last_day:02d}')
        if client_id:
            query = query.eq('client_id', client_id)
        if transaction_type:
            query = query.eq('transaction_type', transaction_type)
        response = query.order('transaction_date', desc=True).execute()
        return response.data or []
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Admin finance transactions error: {e}")
        raise HTTPException(status_code=500, detail="İşlemler yüklenemedi")


@api_router.get("/admin/finance/clients-list")
async def get_admin_finance_clients(user: dict = Depends(get_current_user)):
    """Admin: Get clients list for finance filter"""
    if user.get('role') not in ['admin']:
        raise HTTPException(status_code=403, detail="Yetki yok")
    try:
        response = supabase.table('clients').select('id, company_name, contact_name').order('company_name').execute()
        return response.data or []
    except Exception as e:
        logging.error(f"Admin finance clients error: {e}")
        raise HTTPException(status_code=500, detail="Müşteriler yüklenemedi")


# =====================================================
# VIDEOS
# =====================================================
@api_router.get("/videos/{client_id}")
async def get_videos(client_id: str, user: dict = Depends(get_current_user)):
    try:
        if user.get('role') == 'client' and str(user.get('client_id')) != client_id:
            raise HTTPException(status_code=403, detail="Erişim reddedildi")
        
        response = supabase.table('videos').select('*').eq('client_id', client_id).order('created_at', desc=True).execute()
        return response.data
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Get videos error: {e}")
        raise HTTPException(status_code=500, detail="Videolar yüklenemedi")


@api_router.post("/videos")
async def create_video(video: VideoCreate, user: dict = Depends(require_admin_or_staff)):
    try:
        video_data = video.model_dump()
        video_data['uploaded_by'] = user['id']
        video_data['status'] = 'uploaded'
        
        response = supabase.table('videos').insert(video_data).execute()
        
        log_audit(user['id'], user['email'], 'create', 'video', response.data[0]['id'], video.client_id, None, video_data)
        
        notify_client_users(video.client_id, 'video_uploaded', 'Yeni Video', f'"{video.title}" başlıklı yeni bir video yüklendi.', '/client/videos')
        
        return response.data[0]
    except Exception as e:
        logging.error(f"Create video error: {e}")
        raise HTTPException(status_code=500, detail="Video oluşturulamadı")


@api_router.put("/videos/{video_id}/status")
async def update_video_status(video_id: str, data: StatusUpdate, user: dict = Depends(get_current_user)):
    try:
        existing = supabase.table('videos').select('*').eq('id', video_id).single().execute()
        if not existing.data:
            raise HTTPException(status_code=404, detail="Video bulunamadı")
        
        supabase.table('videos').update({'status': data.status, 'notes': data.notes}).eq('id', video_id).execute()
        
        log_audit(user['id'], user['email'], 'update_status', 'video', video_id, existing.data.get('client_id'), {'status': existing.data.get('status')}, {'status': data.status})
        
        return {"message": "Durum güncellendi"}
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Update video status error: {e}")
        raise HTTPException(status_code=500, detail="Durum güncellenemedi")


# =====================================================
# DESIGNS
# =====================================================
@api_router.get("/designs/{client_id}")
async def get_designs(client_id: str, user: dict = Depends(get_current_user)):
    try:
        if user.get('role') == 'client' and str(user.get('client_id')) != client_id:
            raise HTTPException(status_code=403, detail="Erişim reddedildi")
        
        response = supabase.table('designs').select('*').eq('client_id', client_id).order('created_at', desc=True).execute()
        return response.data
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Get designs error: {e}")
        raise HTTPException(status_code=500, detail="Tasarımlar yüklenemedi")


@api_router.post("/designs")
async def create_design(design: DesignCreate, user: dict = Depends(require_admin_or_staff)):
    try:
        design_data = design.model_dump()
        design_data['uploaded_by'] = user['id']
        design_data['status'] = 'uploaded'
        design_data['version'] = 1
        
        response = supabase.table('designs').insert(design_data).execute()
        
        log_audit(user['id'], user['email'], 'create', 'design', response.data[0]['id'], design.client_id, None, design_data)
        
        notify_client_users(design.client_id, 'design_uploaded', 'Yeni Tasarım', f'"{design.title}" başlıklı yeni bir tasarım yüklendi.', '/client/designs')
        
        return response.data[0]
    except Exception as e:
        logging.error(f"Create design error: {e}")
        raise HTTPException(status_code=500, detail="Tasarım oluşturulamadı")


@api_router.put("/designs/{design_id}/status")
async def update_design_status(design_id: str, data: StatusUpdate, user: dict = Depends(get_current_user)):
    try:
        existing = supabase.table('designs').select('*').eq('id', design_id).single().execute()
        if not existing.data:
            raise HTTPException(status_code=404, detail="Tasarım bulunamadı")
        
        supabase.table('designs').update({'status': data.status, 'notes': data.notes}).eq('id', design_id).execute()
        
        log_audit(user['id'], user['email'], 'update_status', 'design', design_id, existing.data.get('client_id'), {'status': existing.data.get('status')}, {'status': data.status})
        
        return {"message": "Durum güncellendi"}
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Update design status error: {e}")
        raise HTTPException(status_code=500, detail="Durum güncellenemedi")


# =====================================================
# CALENDAR EVENTS
# =====================================================
@api_router.get("/calendar-events")
async def get_all_calendar_events(user: dict = Depends(require_admin_or_staff)):
    try:
        response = supabase.table('calendar_events').select('*, clients(company_name)').order('event_date').execute()
        
        result = []
        for event in response.data:
            event_data = {k: v for k, v in event.items() if k != 'clients'}
            event_data['client_name'] = event.get('clients', {}).get('company_name', '') if event.get('clients') else ''
            result.append(event_data)
        
        return result
    except Exception as e:
        logging.error(f"Get all calendar events error: {e}")
        raise HTTPException(status_code=500, detail="Etkinlikler yüklenemedi")


@api_router.get("/calendar-events/{client_id}")
async def get_client_calendar_events(client_id: str, user: dict = Depends(get_current_user)):
    try:
        if user.get('role') == 'client' and str(user.get('client_id')) != client_id:
            raise HTTPException(status_code=403, detail="Erişim reddedildi")
        
        response = supabase.table('calendar_events').select('*').eq('client_id', client_id).order('event_date').execute()
        return response.data
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Get calendar events error: {e}")
        raise HTTPException(status_code=500, detail="Etkinlikler yüklenemedi")


@api_router.post("/calendar-events")
async def create_calendar_event(event: CalendarEventCreate, user: dict = Depends(require_admin_or_staff)):
    try:
        event_data = event.model_dump()
        event_data['created_by'] = user['id']
        
        response = supabase.table('calendar_events').insert(event_data).execute()
        
        log_audit(user['id'], user['email'], 'create', 'calendar_event', response.data[0]['id'], event.client_id, None, event_data)
        
        notify_client_users(event.client_id, 'event_created', 'Yeni Etkinlik', f'"{event.title}" başlıklı yeni bir etkinlik oluşturuldu.', '/client/videos')
        
        return response.data[0]
    except Exception as e:
        logging.error(f"Create event error: {e}")
        raise HTTPException(status_code=500, detail="Etkinlik oluşturulamadı")


@api_router.delete("/calendar-events/{event_id}")
async def delete_calendar_event(event_id: str, user: dict = Depends(require_admin_or_staff)):
    try:
        existing = supabase.table('calendar_events').select('*').eq('id', event_id).single().execute()
        if not existing.data:
            raise HTTPException(status_code=404, detail="Etkinlik bulunamadı")
        
        supabase.table('calendar_events').delete().eq('id', event_id).execute()
        
        log_audit(user['id'], user['email'], 'delete', 'calendar_event', event_id, existing.data.get('client_id'), existing.data, None)
        
        return {"message": "Etkinlik silindi"}
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Delete event error: {e}")
        raise HTTPException(status_code=500, detail="Etkinlik silinemedi")


# =====================================================
# ADS REPORTS
# =====================================================
@api_router.get("/ads-reports/{client_id}")
async def get_ads_reports(client_id: str, user: dict = Depends(get_current_user)):
    try:
        if user.get('role') == 'client' and str(user.get('client_id')) != client_id:
            raise HTTPException(status_code=403, detail="Erişim reddedildi")
        
        response = supabase.table('ad_reports').select('*').eq('client_id', client_id).order('report_date', desc=True).execute()
        return response.data
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Get ads reports error: {e}")
        raise HTTPException(status_code=500, detail="Raporlar yüklenemedi")


@api_router.post("/ads-reports")
async def create_ads_report(report: AdsReportCreate, user: dict = Depends(require_admin_or_staff)):
    try:
        report_data = report.model_dump()
        report_data['source'] = 'manual'
        
        response = supabase.table('ad_reports').insert(report_data).execute()
        
        log_audit(user['id'], user['email'], 'create', 'ad_report', response.data[0]['id'], report.client_id, None, report_data)
        
        return response.data[0]
    except Exception as e:
        logging.error(f"Create ads report error: {e}")
        raise HTTPException(status_code=500, detail="Rapor oluşturulamadı")


# =====================================================
# CAMPAIGNS
# =====================================================
@api_router.get("/campaigns")
async def get_campaigns(user: dict = Depends(get_current_user)):
    try:
        if user.get('role') in ['admin', 'staff']:
            response = supabase.table('campaigns').select('*').order('created_at', desc=True).execute()
        else:
            response = supabase.table('campaigns').select('*').eq('is_active', True).execute()
        
        return response.data
    except Exception as e:
        logging.error(f"Get campaigns error: {e}")
        raise HTTPException(status_code=500, detail="Kampanyalar yüklenemedi")


@api_router.post("/campaigns")
async def create_campaign(campaign: CampaignCreate, user: dict = Depends(require_admin)):
    try:
        campaign_data = campaign.model_dump()
        
        response = supabase.table('campaigns').insert(campaign_data).execute()
        
        log_audit(user['id'], user['email'], 'create', 'campaign', response.data[0]['id'], None, None, campaign_data)
        
        return response.data[0]
    except Exception as e:
        logging.error(f"Create campaign error: {e}")
        raise HTTPException(status_code=500, detail="Kampanya oluşturulamadı")


# =====================================================
# ACTIVITY LOGS
# =====================================================
@api_router.get("/activity-logs")
async def get_activity_logs(user: dict = Depends(require_admin)):
    try:
        response = supabase.table('audit_logs').select('*').order('created_at', desc=True).limit(500).execute()
        return response.data
    except Exception as e:
        logging.error(f"Get activity logs error: {e}")
        raise HTTPException(status_code=500, detail="Loglar yüklenemedi")


# =====================================================
# NOTIFICATIONS
# =====================================================
@api_router.get("/notifications")
async def get_notifications(user: dict = Depends(get_current_user)):
    try:
        response = supabase.table('notifications').select('*').eq('user_id', user['id']).order('created_at', desc=True).limit(50).execute()
        return response.data
    except Exception as e:
        logging.error(f"Get notifications error: {e}")
        raise HTTPException(status_code=500, detail="Bildirimler yüklenemedi")


@api_router.get("/notifications/unread-count")
async def get_unread_count(user: dict = Depends(get_current_user)):
    try:
        response = supabase.table('notifications').select('id', count='exact').eq('user_id', user['id']).eq('is_read', False).execute()
        return {"count": response.count or 0}
    except Exception as e:
        logging.error(f"Get unread count error: {e}")
        return {"count": 0}


@api_router.put("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, user: dict = Depends(get_current_user)):
    try:
        supabase.table('notifications').update({'is_read': True}).eq('id', notification_id).eq('user_id', user['id']).execute()
        return {"message": "Bildirim okundu olarak işaretlendi"}
    except Exception as e:
        logging.error(f"Mark read error: {e}")
        raise HTTPException(status_code=500, detail="İşlem başarısız")


@api_router.put("/notifications/mark-all-read")
async def mark_all_notifications_read(user: dict = Depends(get_current_user)):
    try:
        supabase.table('notifications').update({'is_read': True}).eq('user_id', user['id']).eq('is_read', False).execute()
        return {"message": "Tüm bildirimler okundu olarak işaretlendi"}
    except Exception as e:
        logging.error(f"Mark all read error: {e}")
        raise HTTPException(status_code=500, detail="İşlem başarısız")


# =====================================================
# STATS / DASHBOARD
# =====================================================
@api_router.get("/stats/admin-dashboard")
async def get_admin_dashboard_stats(user: dict = Depends(require_admin_or_staff)):
    try:
        clients = supabase.table('clients').select('id, status').execute()
        videos = supabase.table('videos').select('id').execute()
        designs = supabase.table('designs').select('id').execute()
        pending_receipts = supabase.table('receipts').select('id', count='exact').eq('status', 'pending').execute()
        
        active_count = len([c for c in clients.data if c.get('status') == 'active'])
        
        return {
            "total_clients": len(clients.data),
            "active_clients": active_count,
            "videos_produced": len(videos.data),
            "designs_created": len(designs.data),
            "pending_receipts": pending_receipts.count or 0
        }
    except Exception as e:
        logging.error(f"Get dashboard stats error: {e}")
        return {
            "total_clients": 0,
            "active_clients": 0,
            "videos_produced": 0,
            "designs_created": 0,
            "pending_receipts": 0
        }


@api_router.get("/stats/client-dashboard/{client_id}")
async def get_client_dashboard_stats(client_id: str, user: dict = Depends(get_current_user)):
    try:
        if user.get('role') == 'client' and str(user.get('client_id')) != client_id:
            raise HTTPException(status_code=403, detail="Erişim reddedildi")
        
        videos = supabase.table('videos').select('id, status').eq('client_id', client_id).execute()
        designs = supabase.table('designs').select('id, status').eq('client_id', client_id).execute()
        ads = supabase.table('ad_reports').select('daily_spend').eq('client_id', client_id).execute()
        
        # Get access info
        access_info = get_client_access_info(client_id)
        
        # Get pending receipts count
        pending_receipts = supabase.table('receipts').select('id', count='exact').eq('client_id', client_id).eq('status', 'pending').execute()
        
        total_ad_spend = sum(float(a.get('daily_spend', 0)) for a in ads.data)
        
        return {
            "videos_delivered": len([v for v in videos.data if v.get('status') == 'approved']),
            "designs_delivered": len([d for d in designs.data if d.get('status') == 'approved']),
            "content_published": len(videos.data) + len(designs.data),
            "monthly_ad_spend": total_ad_spend,
            "access_info": access_info,
            "pending_receipts": pending_receipts.count or 0
        }
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Get client dashboard stats error: {e}")
        return {
            "videos_delivered": 0,
            "designs_delivered": 0,
            "content_published": 0,
            "monthly_ad_spend": 0,
            "access_info": None,
            "pending_receipts": 0
        }


# =====================================================
# STORAGE
# =====================================================
@api_router.post("/storage/upload-url")
async def get_upload_url(file_name: str, file_type: str, bucket: str = "uploads", user: dict = Depends(get_current_user)):
    try:
        import uuid
        file_ext = file_name.split('.')[-1] if '.' in file_name else ''
        unique_name = f"{uuid.uuid4()}.{file_ext}" if file_ext else str(uuid.uuid4())
        path = f"{user['id']}/{unique_name}"
        
        return {
            "path": path,
            "bucket": bucket,
            "file_name": unique_name,
            "original_name": file_name
        }
    except Exception as e:
        logging.error(f"Get upload URL error: {e}")
        raise HTTPException(status_code=500, detail="Upload URL oluşturulamadı")


# =====================================================
# STAFF MANAGEMENT
# =====================================================
@api_router.get("/staff")
async def get_all_staff(user: dict = Depends(require_admin)):
    try:
        response = supabase.table('profiles').select('*').eq('role', 'staff').order('created_at', desc=True).execute()
        
        # Get permissions for each staff
        staff_list = []
        for staff in response.data:
            perm_response = supabase.table('staff_permissions').select('*').eq('staff_id', staff['id']).single().execute()
            staff_data = dict(staff)
            staff_data['permissions'] = perm_response.data if perm_response.data else None
            staff_list.append(staff_data)
        
        return staff_list
    except Exception as e:
        logging.error(f"Get staff error: {e}")
        raise HTTPException(status_code=500, detail="Personel listesi yüklenemedi")


@api_router.post("/staff")
async def create_staff(data: StaffCreate, user: dict = Depends(require_admin)):
    try:
        # Create auth user
        auth_response = supabase.auth.admin.create_user({
            "email": data.email,
            "password": data.password,
            "email_confirm": True
        })
        
        if not auth_response.user:
            raise HTTPException(status_code=400, detail="Kullanıcı oluşturulamadı")
        
        # Create profile
        profile_data = {
            'id': auth_response.user.id,
            'email': data.email,
            'full_name': data.full_name,
            'role': 'staff',
            'is_active': True
        }
        
        supabase.table('profiles').insert(profile_data).execute()
        
        # Create default permissions
        supabase.table('staff_permissions').insert({
            'staff_id': auth_response.user.id,
            'can_manage_clients': False,
            'can_manage_content': False,
            'can_view_reports': False,
            'can_approve_receipts': False,
            'can_manage_calendar': False
        }).execute()
        
        log_audit(user['id'], user['email'], 'create', 'staff', auth_response.user.id, after=profile_data)
        
        return {"id": auth_response.user.id, **profile_data}
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Create staff error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.put("/staff/{staff_id}")
async def update_staff(staff_id: str, data: StaffUpdate, user: dict = Depends(require_admin)):
    try:
        update_data = {k: v for k, v in data.dict().items() if v is not None}
        update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
        
        response = supabase.table('profiles').update(update_data).eq('id', staff_id).eq('role', 'staff').execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Personel bulunamadı")
        
        log_audit(user['id'], user['email'], 'update', 'staff', staff_id, after=update_data)
        
        return response.data[0]
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Update staff error: {e}")
        raise HTTPException(status_code=500, detail="Personel güncellenemedi")


@api_router.delete("/staff/{staff_id}")
async def delete_staff(staff_id: str, user: dict = Depends(require_admin)):
    try:
        # Get staff before delete
        staff = supabase.table('profiles').select('*').eq('id', staff_id).eq('role', 'staff').single().execute()
        
        if not staff.data:
            raise HTTPException(status_code=404, detail="Personel bulunamadı")
        
        # Delete permissions
        supabase.table('staff_permissions').delete().eq('staff_id', staff_id).execute()
        
        # Delete profile
        supabase.table('profiles').delete().eq('id', staff_id).execute()
        
        # Delete auth user
        try:
            supabase.auth.admin.delete_user(staff_id)
        except Exception:
            pass
        
        log_audit(user['id'], user['email'], 'delete', 'staff', staff_id, before=staff.data)
        
        return {"message": "Personel başarıyla silindi"}
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Delete staff error: {e}")
        raise HTTPException(status_code=500, detail="Personel silinemedi")


@api_router.post("/staff-permissions")
async def update_staff_permissions(data: StaffPermissions, user: dict = Depends(require_admin)):
    try:
        perm_data = {
            'staff_id': data.staff_id,
            'can_manage_clients': data.can_manage_clients,
            'can_manage_content': data.can_manage_content,
            'can_view_reports': data.can_view_reports,
            'can_approve_receipts': data.can_approve_receipts,
            'can_manage_calendar': data.can_manage_calendar,
            'updated_at': datetime.now(timezone.utc).isoformat()
        }
        
        # Upsert permissions
        response = supabase.table('staff_permissions').upsert(perm_data, on_conflict='staff_id').execute()
        
        log_audit(user['id'], user['email'], 'update', 'staff_permissions', data.staff_id, after=perm_data)
        
        return response.data[0] if response.data else perm_data
    except Exception as e:
        logging.error(f"Update staff permissions error: {e}")
        raise HTTPException(status_code=500, detail="İzinler güncellenemedi")


@api_router.get("/staff-permissions/{staff_id}")
async def get_staff_permissions(staff_id: str, user: dict = Depends(require_admin_or_staff)):
    try:
        response = supabase.table('staff_permissions').select('*').eq('staff_id', staff_id).single().execute()
        
        if not response.data:
            return {
                'staff_id': staff_id,
                'can_manage_clients': False,
                'can_manage_content': False,
                'can_view_reports': False,
                'can_approve_receipts': False,
                'can_manage_calendar': False
            }
        
        return response.data
    except Exception as e:
        logging.error(f"Get staff permissions error: {e}")
        raise HTTPException(status_code=500, detail="İzinler yüklenemedi")


# =====================================================
# USER PROFILE
# =====================================================
@api_router.get("/profile")
async def get_profile(user: dict = Depends(get_current_user)):
    try:
        # Get profile with client info if client
        profile = supabase.table('profiles').select('*').eq('id', user['id']).single().execute()
        
        if not profile.data:
            raise HTTPException(status_code=404, detail="Profil bulunamadı")
        
        result = dict(profile.data)
        
        # If client, get client company info
        if profile.data.get('client_id'):
            client = supabase.table('clients').select('company_name, contact_phone, address').eq('id', profile.data['client_id']).single().execute()
            if client.data:
                result['company_name'] = client.data.get('company_name')
                result['phone'] = client.data.get('contact_phone')
                result['address'] = client.data.get('address')
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Get profile error: {e}")
        raise HTTPException(status_code=500, detail="Profil yüklenemedi")


@api_router.put("/profile")
async def update_profile(data: ProfileUpdate, user: dict = Depends(get_current_user)):
    try:
        update_data = {}
        
        # Update profile fields
        if data.full_name:
            update_data['full_name'] = data.full_name
        if data.avatar_url is not None:
            update_data['avatar_url'] = data.avatar_url
        
        if update_data:
            update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
            supabase.table('profiles').update(update_data).eq('id', user['id']).execute()
        
        # If client and has client_id, update client info too
        if user.get('client_id') and user.get('role') == 'client':
            client_update = {}
            if data.phone:
                client_update['contact_phone'] = data.phone
            if data.address:
                client_update['address'] = data.address
            if data.company_name:
                client_update['company_name'] = data.company_name
            
            if client_update:
                client_update['updated_at'] = datetime.now(timezone.utc).isoformat()
                supabase.table('clients').update(client_update).eq('id', user['client_id']).execute()
        
        log_audit(user['id'], user['email'], 'update', 'profile', user['id'], after={**update_data, **(data.dict() if user.get('client_id') else {})})
        
        # Return updated profile
        return await get_profile(user)
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Update profile error: {e}")
        raise HTTPException(status_code=500, detail="Profil güncellenemedi")


@api_router.post("/profile/avatar")
async def upload_avatar(user: dict = Depends(get_current_user)):
    """Get presigned URL for avatar upload"""
    try:
        import uuid
        file_name = f"avatars/{user['id']}/{uuid.uuid4()}.jpg"
        
        return {
            "upload_path": file_name,
            "bucket": "avatars"
        }
    except Exception as e:
        logging.error(f"Avatar upload URL error: {e}")
        raise HTTPException(status_code=500, detail="Avatar yükleme URL'i oluşturulamadı")


# =====================================================
# META ADS API INTEGRATION
# =====================================================
@api_router.get("/meta-accounts")
async def get_all_meta_accounts(user: dict = Depends(require_admin_or_staff)):
    try:
        response = supabase.table('meta_accounts').select('*, clients(company_name)').order('created_at', desc=True).execute()
        return response.data
    except Exception as e:
        logging.error(f"Get meta accounts error: {e}")
        raise HTTPException(status_code=500, detail="Meta hesapları yüklenemedi")


@api_router.get("/meta-accounts/{client_id}")
async def get_client_meta_account(client_id: str, user: dict = Depends(require_admin_or_staff)):
    try:
        response = supabase.table('meta_accounts').select('*').eq('client_id', client_id).single().execute()
        return response.data
    except Exception as e:
        logging.error(f"Get client meta account error: {e}")
        return None


@api_router.post("/meta-accounts")
async def create_meta_account(data: MetaAccountCreate, user: dict = Depends(require_admin)):
    try:
        # Check if client already has a meta account
        existing = supabase.table('meta_accounts').select('id').eq('client_id', data.client_id).execute()
        
        if existing.data:
            # Update existing
            response = supabase.table('meta_accounts').update({
                'meta_access_token': data.meta_access_token,
                'ad_account_id': data.ad_account_id,
                'account_name': data.account_name,
                'is_active': True,
                'updated_at': datetime.now(timezone.utc).isoformat()
            }).eq('client_id', data.client_id).execute()
        else:
            # Create new
            response = supabase.table('meta_accounts').insert({
                'client_id': data.client_id,
                'meta_access_token': data.meta_access_token,
                'ad_account_id': data.ad_account_id,
                'account_name': data.account_name,
                'is_active': True
            }).execute()
        
        log_audit(user['id'], user['email'], 'create', 'meta_account', data.client_id)
        
        return response.data[0] if response.data else {"message": "Meta hesabı kaydedildi"}
    except Exception as e:
        logging.error(f"Create meta account error: {e}")
        raise HTTPException(status_code=500, detail="Meta hesabı oluşturulamadı")


@api_router.delete("/meta-accounts/{client_id}")
async def delete_meta_account(client_id: str, user: dict = Depends(require_admin)):
    try:
        supabase.table('meta_accounts').delete().eq('client_id', client_id).execute()
        log_audit(user['id'], user['email'], 'delete', 'meta_account', client_id)
        return {"message": "Meta hesabı silindi"}
    except Exception as e:
        logging.error(f"Delete meta account error: {e}")
        raise HTTPException(status_code=500, detail="Meta hesabı silinemedi")


@api_router.post("/meta-accounts/{client_id}/fetch-data")
async def fetch_meta_ads_data(client_id: str, user: dict = Depends(require_admin_or_staff)):
    """Fetch ads data from Meta API and store in database"""
    try:
        import requests
        
        # Get meta account
        meta_account = supabase.table('meta_accounts').select('*').eq('client_id', client_id).single().execute()
        
        if not meta_account.data:
            raise HTTPException(status_code=404, detail="Meta hesabı bulunamadı")
        
        access_token = meta_account.data['meta_access_token']
        ad_account_id = meta_account.data['ad_account_id']
        
        # Format ad account ID (add act_ prefix if not present)
        if not ad_account_id.startswith('act_'):
            ad_account_id = f"act_{ad_account_id}"
        
        # Meta Graph API endpoint for insights
        url = f"https://graph.facebook.com/v18.0/{ad_account_id}/insights"
        
        params = {
            'access_token': access_token,
            'fields': 'campaign_name,spend,impressions,clicks,actions,cpc,cpm',
            'date_preset': 'last_7d',
            'level': 'campaign',
            'time_increment': 1
        }
        
        response = requests.get(url, params=params, timeout=30)
        
        if response.status_code != 200:
            error_data = response.json()
            error_msg = error_data.get('error', {}).get('message', 'Meta API hatası')
            raise HTTPException(status_code=400, detail=f"Meta API: {error_msg}")
        
        data = response.json()
        insights = data.get('data', [])
        
        # Store insights in database
        reports_created = 0
        for insight in insights:
            # Parse conversions from actions
            conversions = 0
            actions = insight.get('actions', [])
            for action in actions:
                if action.get('action_type') in ['purchase', 'lead', 'complete_registration']:
                    conversions += int(action.get('value', 0))
            
            report_data = {
                'client_id': client_id,
                'report_date': insight.get('date_start'),
                'campaign_name': insight.get('campaign_name', 'Unknown'),
                'daily_spend': float(insight.get('spend', 0)),
                'impressions': int(insight.get('impressions', 0)),
                'clicks': int(insight.get('clicks', 0)),
                'conversions': conversions,
                'cpc': float(insight.get('cpc', 0)),
                'cpm': float(insight.get('cpm', 0)),
                'source': 'meta_api'
            }
            
            # Upsert to avoid duplicates
            supabase.table('ad_reports').upsert(
                report_data, 
                on_conflict='client_id,report_date,campaign_name'
            ).execute()
            reports_created += 1
        
        # Update last sync time
        supabase.table('meta_accounts').update({
            'last_sync': datetime.now(timezone.utc).isoformat()
        }).eq('client_id', client_id).execute()
        
        log_audit(user['id'], user['email'], 'sync', 'meta_ads', client_id, after={'reports_synced': reports_created})
        
        return {
            "message": f"{reports_created} rapor senkronize edildi",
            "reports_synced": reports_created,
            "last_sync": datetime.now(timezone.utc).isoformat()
        }
    except HTTPException:
        raise
    except requests.exceptions.Timeout:
        raise HTTPException(status_code=504, detail="Meta API zaman aşımı")
    except requests.exceptions.RequestException as e:
        logging.error(f"Meta API request error: {e}")
        raise HTTPException(status_code=500, detail="Meta API bağlantı hatası")
    except Exception as e:
        logging.error(f"Fetch meta ads data error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# =====================================================
# REVISIONS SYSTEM
# =====================================================
@api_router.get("/revisions")
async def get_all_revisions(status: Optional[str] = None, user: dict = Depends(require_admin_or_staff)):
    try:
        query = supabase.table('revisions').select('*, clients(company_name), profiles!revisions_requested_by_fkey(full_name, email)')
        
        if status:
            query = query.eq('status', status)
        
        response = query.order('created_at', desc=True).execute()
        return response.data
    except Exception as e:
        logging.error(f"Get revisions error: {e}")
        raise HTTPException(status_code=500, detail="Revizyonlar yüklenemedi")


@api_router.get("/revisions/client/{client_id}")
async def get_client_revisions(client_id: str, user: dict = Depends(get_current_user)):
    try:
        # Check access
        if user.get('role') == 'client' and str(user.get('client_id')) != client_id:
            raise HTTPException(status_code=403, detail="Erişim reddedildi")
        
        response = supabase.table('revisions').select('*').eq('client_id', client_id).order('created_at', desc=True).execute()
        return response.data
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Get client revisions error: {e}")
        raise HTTPException(status_code=500, detail="Revizyonlar yüklenemedi")


@api_router.get("/revisions/pending/count")
async def get_pending_revisions_count(user: dict = Depends(require_admin_or_staff)):
    try:
        response = supabase.table('revisions').select('id', count='exact').eq('status', 'pending').execute()
        return {"count": response.count or 0}
    except Exception as e:
        logging.error(f"Get pending revisions count error: {e}")
        return {"count": 0}


@api_router.post("/revisions")
async def create_revision(data: RevisionCreate, user: dict = Depends(get_current_user)):
    try:
        client_id = user.get('client_id')
        
        # Admin/staff can create for any client
        if user.get('role') in ['admin', 'staff']:
            # Get client_id from content
            if data.content_type == 'video':
                content = supabase.table('videos').select('client_id').eq('id', data.content_id).single().execute()
            else:
                content = supabase.table('designs').select('client_id').eq('id', data.content_id).single().execute()
            
            if content.data:
                client_id = content.data['client_id']
        
        if not client_id:
            raise HTTPException(status_code=400, detail="Client ID bulunamadı")
        
        revision_data = {
            'client_id': client_id,
            'content_type': data.content_type,
            'content_id': data.content_id,
            'requested_by': user['id'],
            'message': data.message,
            'status': 'pending'
        }
        
        response = supabase.table('revisions').insert(revision_data).execute()
        
        # Update content status
        table = 'videos' if data.content_type == 'video' else 'designs'
        supabase.table(table).update({'status': 'revision_requested'}).eq('id', data.content_id).execute()
        
        # Create notification for admin
        create_notification(
            user_id=None,  # Will be sent to all admins
            notification_type='revision_request',
            message=f"Yeni revizyon talebi: {data.content_type}",
            link=f"/admin/revisions"
        )
        
        log_audit(user['id'], user['email'], 'create', 'revision', response.data[0]['id'] if response.data else None, client_id)
        
        return response.data[0] if response.data else {"message": "Revizyon talebi oluşturuldu"}
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Create revision error: {e}")
        raise HTTPException(status_code=500, detail="Revizyon talebi oluşturulamadı")


@api_router.put("/revisions/{revision_id}")
async def respond_to_revision(revision_id: str, data: RevisionResponse, user: dict = Depends(require_admin_or_staff)):
    try:
        # Get revision
        revision = supabase.table('revisions').select('*').eq('id', revision_id).single().execute()
        
        if not revision.data:
            raise HTTPException(status_code=404, detail="Revizyon bulunamadı")
        
        update_data = {
            'admin_response': data.admin_response,
            'status': data.status,
            'resolved_by': user['id'],
            'resolved_at': datetime.now(timezone.utc).isoformat() if data.status in ['resolved', 'rejected'] else None,
            'updated_at': datetime.now(timezone.utc).isoformat()
        }
        
        response = supabase.table('revisions').update(update_data).eq('id', revision_id).execute()
        
        # Update content status if resolved
        if data.status == 'resolved':
            table = 'videos' if revision.data['content_type'] == 'video' else 'designs'
            supabase.table(table).update({'status': 'approved'}).eq('id', revision.data['content_id']).execute()
        
        # Notify client
        if revision.data.get('requested_by'):
            create_notification(
                user_id=revision.data['requested_by'],
                notification_type='revision_response',
                message=f"Revizyon talebiniz {'tamamlandı' if data.status == 'resolved' else 'yanıtlandı'}",
                link=f"/client/revisions"
            )
        
        log_audit(user['id'], user['email'], 'update', 'revision', revision_id, revision.data.get('client_id'), after=update_data)
        
        return response.data[0] if response.data else {"message": "Revizyon güncellendi"}
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Update revision error: {e}")
        raise HTTPException(status_code=500, detail="Revizyon güncellenemedi")


@api_router.delete("/revisions/{revision_id}")
async def delete_revision(revision_id: str, user: dict = Depends(require_admin)):
    try:
        revision = supabase.table('revisions').select('*').eq('id', revision_id).single().execute()
        
        if not revision.data:
            raise HTTPException(status_code=404, detail="Revizyon bulunamadı")
        
        supabase.table('revisions').delete().eq('id', revision_id).execute()
        
        log_audit(user['id'], user['email'], 'delete', 'revision', revision_id, before=revision.data)
        
        return {"message": "Revizyon silindi"}
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Delete revision error: {e}")
        raise HTTPException(status_code=500, detail="Revizyon silinemedi")


# =====================================================
# ENHANCED NOTIFICATIONS
# =====================================================
@api_router.get("/notifications/all")
async def get_all_notifications(user: dict = Depends(get_current_user)):
    """Get all notifications for current user with pagination"""
    try:
        query = supabase.table('notifications').select('*').eq('user_id', user['id'])
        response = query.order('created_at', desc=True).limit(50).execute()
        return response.data
    except Exception as e:
        logging.error(f"Get all notifications error: {e}")
        return []


@api_router.get("/notifications/grouped")
async def get_grouped_notifications(user: dict = Depends(get_current_user)):
    """Get notifications grouped by date"""
    try:
        response = supabase.table('notifications').select('*').eq('user_id', user['id']).order('created_at', desc=True).limit(100).execute()
        
        # Group by date
        grouped = {}
        for notif in response.data:
            created = datetime.fromisoformat(notif['created_at'].replace('Z', '+00:00'))
            date_key = created.strftime('%Y-%m-%d')
            
            if date_key not in grouped:
                grouped[date_key] = []
            grouped[date_key].append(notif)
        
        return grouped
    except Exception as e:
        logging.error(f"Get grouped notifications error: {e}")
        return {}


@api_router.delete("/notifications/{notification_id}")
async def delete_notification(notification_id: str, user: dict = Depends(get_current_user)):
    try:
        supabase.table('notifications').delete().eq('id', notification_id).eq('user_id', user['id']).execute()
        return {"message": "Bildirim silindi"}
    except Exception as e:
        logging.error(f"Delete notification error: {e}")
        raise HTTPException(status_code=500, detail="Bildirim silinemedi")


@api_router.delete("/notifications/clear-all")
async def clear_all_notifications(user: dict = Depends(get_current_user)):
    try:
        supabase.table('notifications').delete().eq('user_id', user['id']).execute()
        return {"message": "Tüm bildirimler silindi"}
    except Exception as e:
        logging.error(f"Clear notifications error: {e}")
        raise HTTPException(status_code=500, detail="Bildirimler silinemedi")


@api_router.get("/user/permissions")
async def get_user_permissions(user: dict = Depends(get_current_user)):
    """Get current user's permissions for frontend access control"""
    try:
        role = user.get('role')
        
        if role == 'admin':
            return {
                'role': 'admin',
                'permissions': {
                    'can_manage_clients': True,
                    'can_manage_content': True,
                    'can_view_reports': True,
                    'can_approve_receipts': True,
                    'can_manage_calendar': True,
                    'can_manage_staff': True,
                    'can_manage_meta': True
                }
            }
        elif role == 'staff':
            perms = get_staff_permissions(user['id'])
            return {
                'role': 'staff',
                'permissions': {
                    'can_manage_clients': perms.get('can_manage_clients', False),
                    'can_manage_content': perms.get('can_manage_content', False),
                    'can_view_reports': perms.get('can_view_reports', False),
                    'can_approve_receipts': perms.get('can_approve_receipts', False),
                    'can_manage_calendar': perms.get('can_manage_calendar', False),
                    'can_manage_staff': False,
                    'can_manage_meta': False
                }
            }
        else:
            return {
                'role': 'client',
                'permissions': {
                    'can_view_own_data': True,
                    'can_upload_receipts': True,
                    'can_request_revisions': True,
                    'can_manage_finance': True
                }
            }
    except Exception as e:
        logging.error(f"Get user permissions error: {e}")
        return {'role': user.get('role'), 'permissions': {}}


# =====================================================
# WHATSAPP NOTIFICATIONS (Twilio)
# =====================================================
class WhatsAppMessage(BaseModel):
    to_phone: str  # E.164 format: +905551234567
    message: str

class WhatsAppTemplate(BaseModel):
    to_phone: str
    template_name: str
    template_vars: Optional[dict] = None


def send_whatsapp_message(to_phone: str, message: str) -> dict:
    """Send WhatsApp message via Twilio"""
    if not TWILIO_ACCOUNT_SID or not TWILIO_AUTH_TOKEN:
        logging.warning("Twilio credentials not configured")
        return {"status": "skipped", "reason": "Twilio not configured"}
    
    try:
        from twilio.rest import Client
        client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
        
        # Format phone number for WhatsApp
        whatsapp_to = f"whatsapp:{to_phone}" if not to_phone.startswith('whatsapp:') else to_phone
        
        twilio_message = client.messages.create(
            body=message,
            from_=TWILIO_WHATSAPP_FROM,
            to=whatsapp_to
        )
        
        logging.info(f"WhatsApp sent to {to_phone}: {twilio_message.sid}")
        return {"status": "sent", "sid": twilio_message.sid}
    except Exception as e:
        logging.error(f"WhatsApp send error: {e}")
        return {"status": "failed", "error": str(e)}


@api_router.post("/whatsapp/send")
async def send_whatsapp(data: WhatsAppMessage, user: dict = Depends(require_admin_or_staff)):
    """Send a WhatsApp message to a phone number"""
    result = send_whatsapp_message(data.to_phone, data.message)
    
    if result["status"] == "failed":
        raise HTTPException(status_code=500, detail=result.get("error", "Mesaj gönderilemedi"))
    
    log_audit(user['id'], user['email'], 'send', 'whatsapp', data.to_phone)
    return result


@api_router.post("/whatsapp/notify-client/{client_id}")
async def notify_client_whatsapp(
    client_id: str, 
    notification_type: str = Query(..., description="receipt_approved, receipt_rejected, access_expiring"),
    user: dict = Depends(require_admin_or_staff)
):
    """Send notification to client via WhatsApp"""
    try:
        # Get client info
        client = supabase.table('clients').select('company_name, contact_phone').eq('id', client_id).single().execute()
        
        if not client.data or not client.data.get('contact_phone'):
            raise HTTPException(status_code=400, detail="Müşteri telefon numarası bulunamadı")
        
        phone = client.data['contact_phone']
        company_name = client.data['company_name']
        
        # Prepare message based on notification type
        messages = {
            'receipt_approved': f"🎉 Merhaba {company_name}! Makbuzunuz onaylandı ve 30 günlük erişiminiz aktifleştirildi. Ajans OS'e giriş yaparak hizmetlerinize ulaşabilirsiniz.",
            'receipt_rejected': f"⚠️ Merhaba {company_name}, yüklediğiniz makbuz reddedildi. Lütfen geçerli bir makbuz yükleyiniz veya bizimle iletişime geçiniz.",
            'access_expiring': f"⏰ Merhaba {company_name}! Ajans OS erişim süreniz 3 gün içinde dolacak. Kesintisiz hizmet için lütfen ödeme yapınız.",
            'access_expired': f"🔒 Merhaba {company_name}, Ajans OS erişim süreniz doldu. Hizmetlerinize devam etmek için lütfen ödeme yapınız.",
            'revision_completed': f"✅ Merhaba {company_name}! İstediğiniz revizyon tamamlandı. Ajans OS'e giriş yaparak inceleyebilirsiniz."
        }
        
        message = messages.get(notification_type)
        if not message:
            raise HTTPException(status_code=400, detail="Geçersiz bildirim türü")
        
        result = send_whatsapp_message(phone, message)
        
        if result["status"] == "failed":
            raise HTTPException(status_code=500, detail=result.get("error", "Mesaj gönderilemedi"))
        
        log_audit(user['id'], user['email'], 'notify', 'whatsapp', client_id, after={'type': notification_type})
        
        return {"message": "WhatsApp bildirimi gönderildi", **result}
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"WhatsApp notify client error: {e}")
        raise HTTPException(status_code=500, detail="Bildirim gönderilemedi")


@api_router.get("/whatsapp/status")
async def get_whatsapp_status(user: dict = Depends(require_admin)):
    """Check WhatsApp integration status"""
    is_configured = bool(TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN)
    return {
        "configured": is_configured,
        "from_number": TWILIO_WHATSAPP_FROM if is_configured else None
    }


# =====================================================
# META OAUTH INTEGRATION
# =====================================================
@api_router.get("/meta/oauth/start/{client_id}")
async def start_meta_oauth(client_id: str, frontend_origin: str = None, user: dict = Depends(require_admin)):
    """Start Meta OAuth flow for a client"""
    if not META_APP_ID:
        raise HTTPException(status_code=500, detail="Meta App ID yapılandırılmamış")
    
    # Generate state for CSRF protection
    state = secrets.token_urlsafe(32)
    oauth_state_storage[state] = {
        "client_id": client_id,
        "user_id": user['id'],
        "created_at": datetime.now(timezone.utc),
        "frontend_origin": frontend_origin or FRONTEND_URL or ""
    }
    
    # Build authorization URL
    params = {
        "client_id": META_APP_ID,
        "redirect_uri": META_REDIRECT_URI,
        "scope": "ads_read,ads_management",
        "state": state,
        "response_type": "code"
    }
    
    authorization_url = f"https://www.facebook.com/v20.0/dialog/oauth?{urlencode(params)}"
    
    return {
        "authorization_url": authorization_url,
        "state": state
    }


@api_router.get("/meta/callback")
async def meta_oauth_callback(
    code: str = None, 
    state: str = None, 
    error: str = None,
    error_description: str = None
):
    """Handle Meta OAuth callback"""
    # Get redirect base from state or fallback to env
    redirect_base = ""
    if state and state in oauth_state_storage:
        redirect_base = oauth_state_storage[state].get("frontend_origin", "") or FRONTEND_URL or ""
    else:
        redirect_base = FRONTEND_URL or ""
    
    if error:
        logging.error(f"Meta OAuth error: {error} - {error_description}")
        return RedirectResponse(url=f"{redirect_base}/admin/meta-integration?error={error}")
    
    if not code or not state:
        raise HTTPException(status_code=400, detail="Eksik parametreler")
    
    # Verify state
    if state not in oauth_state_storage:
        raise HTTPException(status_code=400, detail="Geçersiz state parametresi")
    
    state_data = oauth_state_storage[state]
    
    # Check state expiration (10 minutes)
    if (datetime.now(timezone.utc) - state_data["created_at"]).seconds > 600:
        del oauth_state_storage[state]
        raise HTTPException(status_code=400, detail="State süresi doldu")
    
    client_id = state_data["client_id"]
    
    try:
        # Exchange code for short-lived token
        async with httpx.AsyncClient() as http_client:
            token_response = await http_client.get(
                "https://graph.facebook.com/v20.0/oauth/access_token",
                params={
                    "client_id": META_APP_ID,
                    "client_secret": META_APP_SECRET,
                    "redirect_uri": META_REDIRECT_URI,
                    "code": code
                }
            )
        
        if token_response.status_code != 200:
            raise HTTPException(status_code=400, detail="Token alınamadı")
        
        token_data = token_response.json()
        
        if "error" in token_data:
            raise HTTPException(status_code=400, detail=token_data.get("error_description", "Token hatası"))
        
        short_lived_token = token_data.get("access_token")
        
        # Exchange for long-lived token
        async with httpx.AsyncClient() as http_client:
            long_lived_response = await http_client.get(
                "https://graph.facebook.com/v20.0/oauth/access_token",
                params={
                    "grant_type": "fb_exchange_token",
                    "client_id": META_APP_ID,
                    "client_secret": META_APP_SECRET,
                    "fb_exchange_token": short_lived_token
                }
            )
        
        if long_lived_response.status_code != 200:
            raise HTTPException(status_code=400, detail="Long-lived token alınamadı")
        
        long_lived_data = long_lived_response.json()
        long_lived_token = long_lived_data.get("access_token")
        expires_in = long_lived_data.get("expires_in", 5184000)  # 60 days default
        
        # Get user's ad accounts
        async with httpx.AsyncClient() as http_client:
            accounts_response = await http_client.get(
                "https://graph.facebook.com/v20.0/me/adaccounts",
                params={
                    "access_token": long_lived_token,
                    "fields": "id,name,account_status"
                }
            )
        
        ad_accounts = []
        if accounts_response.status_code == 200:
            accounts_data = accounts_response.json()
            ad_accounts = accounts_data.get("data", [])
        
        # Save token to database
        token_expires_at = datetime.now(timezone.utc) + timedelta(seconds=expires_in)
        
        # Check if meta_account exists for this client
        existing = supabase.table('meta_accounts').select('id').eq('client_id', client_id).execute()
        
        if existing.data:
            supabase.table('meta_accounts').update({
                'meta_access_token': long_lived_token,
                'token_expires_at': token_expires_at.isoformat(),
                'is_active': True,
                'updated_at': datetime.now(timezone.utc).isoformat()
            }).eq('client_id', client_id).execute()
        else:
            # Get first ad account if available
            first_account = ad_accounts[0] if ad_accounts else {}
            supabase.table('meta_accounts').insert({
                'client_id': client_id,
                'meta_access_token': long_lived_token,
                'ad_account_id': first_account.get('id', '').replace('act_', ''),
                'account_name': first_account.get('name', 'OAuth Connected'),
                'is_active': True
            }).execute()
        
        # Clean up state
        del oauth_state_storage[state]
        
        # Redirect to admin panel with success
        return RedirectResponse(url=f"{redirect_base}/admin/meta-integration?success=true&accounts={len(ad_accounts)}")
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Meta OAuth callback error: {e}")
        return RedirectResponse(url=f"{redirect_base}/admin/meta-integration?error=callback_failed")


@api_router.get("/meta/oauth/status")
async def get_meta_oauth_status(user: dict = Depends(require_admin)):
    """Check Meta OAuth configuration status"""
    return {
        "configured": bool(META_APP_ID and META_APP_SECRET),
        "app_id": META_APP_ID[:10] + "..." if META_APP_ID else None,
        "redirect_uri": META_REDIRECT_URI
    }


@api_router.post("/meta/refresh-token/{client_id}")
async def refresh_meta_token(client_id: str, user: dict = Depends(require_admin_or_staff)):
    """Refresh Meta access token for a client"""
    try:
        # Get current token
        meta_account = supabase.table('meta_accounts').select('*').eq('client_id', client_id).single().execute()
        
        if not meta_account.data:
            raise HTTPException(status_code=404, detail="Meta hesabı bulunamadı")
        
        current_token = meta_account.data['meta_access_token']
        
        # Exchange for new long-lived token
        async with httpx.AsyncClient() as http_client:
            response = await http_client.get(
                "https://graph.facebook.com/v20.0/oauth/access_token",
                params={
                    "grant_type": "fb_exchange_token",
                    "client_id": META_APP_ID,
                    "client_secret": META_APP_SECRET,
                    "fb_exchange_token": current_token
                }
            )
        
        if response.status_code != 200:
            raise HTTPException(status_code=400, detail="Token yenilenemedi")
        
        token_data = response.json()
        
        if "error" in token_data:
            raise HTTPException(status_code=400, detail=token_data.get("error_description", "Token yenileme hatası"))
        
        new_token = token_data.get("access_token")
        expires_in = token_data.get("expires_in", 5184000)
        token_expires_at = datetime.now(timezone.utc) + timedelta(seconds=expires_in)
        
        # Update in database
        supabase.table('meta_accounts').update({
            'meta_access_token': new_token,
            'token_expires_at': token_expires_at.isoformat(),
            'updated_at': datetime.now(timezone.utc).isoformat()
        }).eq('client_id', client_id).execute()
        
        return {
            "message": "Token başarıyla yenilendi",
            "expires_in": expires_in,
            "expires_at": token_expires_at.isoformat()
        }
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Meta token refresh error: {e}")
        raise HTTPException(status_code=500, detail="Token yenilenemedi")


# =====================================================
# MAIL SYSTEM - HELPERS
# =====================================================
MAIL_SETTINGS_FILE = Path(__file__).parent / 'mail_settings.json'

def get_mail_settings():
    """Get mail settings from database or file fallback"""
    import json
    # Try database first
    try:
        response = supabase.table('system_settings').select('*').eq('setting_key', 'mail_settings').single().execute()
        if response.data:
            return json.loads(response.data['setting_value'])
    except Exception as e:
        logging.warning(f"DB get mail settings failed, trying file fallback: {e}")
    
    # Fallback to file
    try:
        if MAIL_SETTINGS_FILE.exists():
            with open(MAIL_SETTINGS_FILE, 'r') as f:
                return json.load(f)
    except Exception as e:
        logging.error(f"File fallback also failed: {e}")
    
    # Return from cache if available
    if MAIL_SETTINGS_CACHE:
        return MAIL_SETTINGS_CACHE
    
    return None

def save_mail_settings(settings: dict):
    """Save mail settings to database and file fallback"""
    import json
    global MAIL_SETTINGS_CACHE
    
    # Always save to file as backup
    try:
        with open(MAIL_SETTINGS_FILE, 'w') as f:
            json.dump(settings, f, indent=2)
        logging.info("Mail settings saved to file")
    except Exception as e:
        logging.error(f"Failed to save mail settings to file: {e}")
    
    # Update cache
    MAIL_SETTINGS_CACHE = settings.copy()
    
    # Try database
    try:
        existing = supabase.table('system_settings').select('id').eq('setting_key', 'mail_settings').execute()
        if existing.data:
            supabase.table('system_settings').update({
                'setting_value': json.dumps(settings),
                'updated_at': datetime.now(timezone.utc).isoformat()
            }).eq('setting_key', 'mail_settings').execute()
        else:
            supabase.table('system_settings').insert({
                'setting_key': 'mail_settings',
                'setting_value': json.dumps(settings),
                'created_at': datetime.now(timezone.utc).isoformat()
            }).execute()
        logging.info("Mail settings saved to database")
        return True
    except Exception as e:
        logging.error(f"DB save mail settings error (using file fallback): {e}")
        # Return True if file save succeeded
        return MAIL_SETTINGS_FILE.exists()

def get_mail_template(template_type: str) -> dict:
    """Get mail template from database"""
    try:
        response = supabase.table('mail_templates').select('*').eq('template_type', template_type).single().execute()
        if response.data:
            return response.data
        # Return default templates
        defaults = {
            'welcome': {
                'subject': 'Mova Dijital Portalına Hoş Geldiniz',
                'body_html': '''
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: #0f172a; padding: 30px; text-align: center;">
                        <h1 style="color: white; margin: 0;">Mova Dijital</h1>
                    </div>
                    <div style="padding: 30px; background: #f8fafc;">
                        <h2 style="color: #0f172a;">Hoş Geldiniz, {{client_name}}!</h2>
                        <p style="color: #475569;">Mova Dijital müşteri portalına kaydınız başarıyla oluşturulmuştur.</p>
                        <p style="color: #475569;"><strong>Giriş Bilgileriniz:</strong></p>
                        <p style="color: #475569;">E-posta: {{email}}</p>
                        <p style="color: #475569;">Şifre: {{password}}</p>
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="{{login_url}}" style="background: #0f172a; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px;">Portala Giriş Yap</a>
                        </div>
                        <p style="color: #94a3b8; font-size: 12px;">Güvenliğiniz için ilk girişinizde şifrenizi değiştirmenizi öneririz.</p>
                    </div>
                </div>
                '''
            },
            'receipt_approved': {
                'subject': 'Makbuzunuz Onaylandı - Mova Dijital',
                'body_html': '''
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: #0f172a; padding: 30px; text-align: center;">
                        <h1 style="color: white; margin: 0;">Mova Dijital</h1>
                    </div>
                    <div style="padding: 30px; background: #f8fafc;">
                        <h2 style="color: #0f172a;">Makbuzunuz Onaylandı!</h2>
                        <p style="color: #475569;">Sayın {{client_name}},</p>
                        <p style="color: #475569;">Yüklediğiniz makbuz onaylanmıştır. Portal erişiminiz 30 gün boyunca aktif olacaktır.</p>
                        <p style="color: #475569;"><strong>Erişim Bitiş Tarihi:</strong> {{expiry_date}}</p>
                    </div>
                </div>
                '''
            },
            'content_uploaded': {
                'subject': 'Yeni İçerik Yüklendi - Mova Dijital',
                'body_html': '''
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: #0f172a; padding: 30px; text-align: center;">
                        <h1 style="color: white; margin: 0;">Mova Dijital</h1>
                    </div>
                    <div style="padding: 30px; background: #f8fafc;">
                        <h2 style="color: #0f172a;">Yeni İçerik Eklendi!</h2>
                        <p style="color: #475569;">Sayın {{client_name}},</p>
                        <p style="color: #475569;">Hesabınıza yeni bir {{content_type}} yüklenmiştir: <strong>{{content_title}}</strong></p>
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="{{portal_url}}" style="background: #0f172a; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px;">İçeriği Görüntüle</a>
                        </div>
                    </div>
                </div>
                '''
            },
            'event_created': {
                'subject': 'Yeni Etkinlik Planlandı - Mova Dijital',
                'body_html': '''
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: #0f172a; padding: 30px; text-align: center;">
                        <h1 style="color: white; margin: 0;">Mova Dijital</h1>
                    </div>
                    <div style="padding: 30px; background: #f8fafc;">
                        <h2 style="color: #0f172a;">Yeni Etkinlik!</h2>
                        <p style="color: #475569;">Sayın {{client_name}},</p>
                        <p style="color: #475569;">Sizin için yeni bir etkinlik planlanmıştır:</p>
                        <p style="color: #475569;"><strong>{{event_title}}</strong></p>
                        <p style="color: #475569;">Tarih: {{event_date}}</p>
                        <p style="color: #475569;">Konum: {{event_location}}</p>
                    </div>
                </div>
                '''
            }
        }
        return defaults.get(template_type, {'subject': '', 'body_html': ''})
    except Exception:
        return {'subject': '', 'body_html': ''}

async def send_email(to_email: str, subject: str, body_html: str) -> bool:
    """Send email using configured provider (SMTP or Resend)"""
    settings = get_mail_settings()
    if not settings:
        logging.warning("Mail settings not configured")
        return False
    
    provider = settings.get('provider', 'smtp')
    
    try:
        if provider == 'resend':
            return await send_email_resend(to_email, subject, body_html, settings)
        else:
            return await send_email_smtp(to_email, subject, body_html, settings)
    except Exception as e:
        logging.error(f"Send email error: {e}")
        return False

async def send_email_smtp(to_email: str, subject: str, body_html: str, settings: dict) -> bool:
    """Send email via SMTP"""
    try:
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = f"{settings.get('smtp_from_name', 'Mova Dijital')} <{settings.get('smtp_from_email')}>"
        msg['To'] = to_email
        
        html_part = MIMEText(body_html, 'html')
        msg.attach(html_part)
        
        smtp_host = settings.get('smtp_host')
        smtp_port = settings.get('smtp_port', 587)
        smtp_username = settings.get('smtp_username')
        smtp_password = settings.get('smtp_password')
        use_tls = settings.get('smtp_use_tls', True)
        
        if use_tls:
            server = smtplib.SMTP(smtp_host, smtp_port)
            server.starttls()
        else:
            server = smtplib.SMTP_SSL(smtp_host, smtp_port)
        
        server.login(smtp_username, smtp_password)
        server.sendmail(settings.get('smtp_from_email'), to_email, msg.as_string())
        server.quit()
        
        logging.info(f"Email sent via SMTP to {to_email}")
        return True
    except Exception as e:
        logging.error(f"SMTP send error: {e}")
        return False

async def send_email_resend(to_email: str, subject: str, body_html: str, settings: dict) -> bool:
    """Send email via Resend API"""
    try:
        api_key = settings.get('resend_api_key')
        from_email = settings.get('resend_from_email', 'noreply@resend.dev')
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.resend.com/emails",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "from": from_email,
                    "to": [to_email],
                    "subject": subject,
                    "html": body_html
                }
            )
        
        if response.status_code == 200:
            logging.info(f"Email sent via Resend to {to_email}")
            return True
        else:
            logging.error(f"Resend API error: {response.text}")
            return False
    except Exception as e:
        logging.error(f"Resend send error: {e}")
        return False

def render_template(template_html: str, variables: dict) -> str:
    """Replace template variables with actual values"""
    result = template_html
    for key, value in variables.items():
        result = result.replace(f"{{{{{key}}}}}", str(value))
    return result


# =====================================================
# MAIL SETTINGS ENDPOINTS
# =====================================================
@api_router.get("/mail/settings")
async def get_mail_settings_endpoint(user: dict = Depends(require_admin)):
    """Get current mail settings"""
    settings = get_mail_settings()
    if settings:
        # Hide sensitive data
        if settings.get('smtp_password'):
            settings['smtp_password'] = '********'
        if settings.get('resend_api_key'):
            settings['resend_api_key'] = settings['resend_api_key'][:8] + '********'
    return {"settings": settings}

@api_router.post("/mail/settings")
async def update_mail_settings_endpoint(data: MailSettingsUpdate, user: dict = Depends(require_admin)):
    """Update mail settings"""
    settings = data.dict(exclude_none=True)
    
    # Preserve existing sensitive data if masked
    existing = get_mail_settings() or {}
    if settings.get('smtp_password') == '********':
        settings['smtp_password'] = existing.get('smtp_password')
    if settings.get('resend_api_key', '').endswith('********'):
        settings['resend_api_key'] = existing.get('resend_api_key')
    
    if save_mail_settings(settings):
        return {"message": "Mail ayarları kaydedildi", "success": True}
    raise HTTPException(status_code=500, detail="Ayarlar kaydedilemedi")

@api_router.post("/mail/test")
async def send_test_email_endpoint(data: SendTestEmail, user: dict = Depends(require_admin)):
    """Send a test email"""
    success = await send_email(
        data.to_email,
        "Mova Dijital - Test E-postası",
        """
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #0f172a; padding: 30px; text-align: center;">
                <h1 style="color: white; margin: 0;">Mova Dijital</h1>
            </div>
            <div style="padding: 30px; background: #f8fafc;">
                <h2 style="color: #0f172a;">Test E-postası Başarılı!</h2>
                <p style="color: #475569;">Mail ayarlarınız doğru yapılandırılmış. E-posta gönderimi çalışıyor.</p>
            </div>
        </div>
        """
    )
    if success:
        return {"message": "Test e-postası gönderildi", "success": True}
    raise HTTPException(status_code=500, detail="E-posta gönderilemedi. Ayarları kontrol edin.")


# =====================================================
# MAIL TEMPLATES ENDPOINTS
# =====================================================
@api_router.get("/mail/templates")
async def get_mail_templates(user: dict = Depends(require_admin)):
    """Get all mail templates"""
    try:
        response = supabase.table('mail_templates').select('*').execute()
        templates = response.data if response.data else []
        
        # Add defaults if not in database
        default_types = ['welcome', 'receipt_approved', 'content_uploaded', 'event_created']
        existing_types = [t['template_type'] for t in templates]
        
        for ttype in default_types:
            if ttype not in existing_types:
                default_template = get_mail_template(ttype)
                templates.append({
                    'template_type': ttype,
                    'subject': default_template.get('subject', ''),
                    'body_html': default_template.get('body_html', '')
                })
        
        return {"templates": templates}
    except Exception as e:
        logging.error(f"Get templates error: {e}")
        return {"templates": []}

@api_router.post("/mail/templates")
async def save_mail_template(data: MailTemplateUpdate, user: dict = Depends(require_admin)):
    """Save or update a mail template"""
    try:
        existing = supabase.table('mail_templates').select('id').eq('template_type', data.template_type).execute()
        
        if existing.data:
            supabase.table('mail_templates').update({
                'subject': data.subject,
                'body_html': data.body_html,
                'updated_at': datetime.now(timezone.utc).isoformat()
            }).eq('template_type', data.template_type).execute()
        else:
            supabase.table('mail_templates').insert({
                'template_type': data.template_type,
                'subject': data.subject,
                'body_html': data.body_html,
                'created_at': datetime.now(timezone.utc).isoformat()
            }).execute()
        
        return {"message": "Şablon kaydedildi", "success": True}
    except Exception as e:
        logging.error(f"Save template error: {e}")
        raise HTTPException(status_code=500, detail="Şablon kaydedilemedi")


# =====================================================
# CLIENT PASSWORD MANAGEMENT
# =====================================================
@api_router.post("/clients/{client_id}/create-user")
async def create_client_user(client_id: str, user: dict = Depends(require_admin)):
    """Create a user account for a client and send welcome email"""
    try:
        # Get client info
        client = supabase.table('clients').select('*').eq('id', client_id).single().execute()
        if not client.data:
            raise HTTPException(status_code=404, detail="Müşteri bulunamadı")
        
        client_data = client.data
        email = client_data['contact_email']
        
        # Check if user already exists
        existing_profile = supabase.table('profiles').select('id').eq('email', email).execute()
        if existing_profile.data:
            raise HTTPException(status_code=400, detail="Bu e-posta ile zaten bir kullanıcı var")
        
        # Generate random password
        import string
        password = ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(12))
        
        # Create user in Supabase Auth
        try:
            auth_response = supabase.auth.admin.create_user({
                "email": email,
                "password": password,
                "email_confirm": True
            })
        except Exception as auth_error:
            logging.error(f"Supabase Auth create_user error: {auth_error}")
            raise HTTPException(status_code=500, detail=f"Kullanıcı oluşturulamadı: {str(auth_error)}")
        
        if not auth_response.user:
            raise HTTPException(status_code=500, detail="Kullanıcı oluşturulamadı - auth response boş")
        
        user_id = auth_response.user.id
        
        # Create profile
        supabase.table('profiles').insert({
            'id': user_id,
            'email': email,
            'full_name': client_data['contact_name'],
            'role': 'client',
            'client_id': client_id,
            'created_at': datetime.now(timezone.utc).isoformat()
        }).execute()
        
        # Update client with user_id reference
        supabase.table('clients').update({
            'user_id': user_id,
            'updated_at': datetime.now(timezone.utc).isoformat()
        }).eq('id', client_id).execute()
        
        # Send welcome email
        template = get_mail_template('welcome')
        login_url = os.environ.get('FRONTEND_URL', 'https://agency-os-prod.preview.emergentagent.com')
        
        email_body = render_template(template.get('body_html', ''), {
            'client_name': client_data['contact_name'],
            'email': email,
            'password': password,
            'login_url': login_url
        })
        
        email_sent = await send_email(email, template.get('subject', 'Hoş Geldiniz'), email_body)
        
        # Create audit log
        supabase.table('audit_logs').insert({
            'actor_user_id': user['id'],
            'action': 'create_client_user',
            'resource_type': 'client',
            'resource_id': client_id,
            'details': {'email': email, 'email_sent': email_sent},
            'created_at': datetime.now(timezone.utc).isoformat()
        }).execute()
        
        return {
            "message": "Kullanıcı hesabı oluşturuldu",
            "user_id": user_id,
            "email": email,
            "password": password,
            "email_sent": email_sent
        }
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Create client user error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/clients/{client_id}/create-user-manual")
async def create_client_user_manual(client_id: str, data: ClientUserCreate, user: dict = Depends(require_admin)):
    """Create a user account for a client with manual email and password"""
    try:
        # Get client info
        client = supabase.table('clients').select('*').eq('id', client_id).single().execute()
        if not client.data:
            raise HTTPException(status_code=404, detail="Müşteri bulunamadı")
        
        client_data = client.data
        email = data.email
        password = data.password
        
        # Check if user already exists
        existing_profile = supabase.table('profiles').select('id').eq('email', email).execute()
        if existing_profile.data:
            raise HTTPException(status_code=400, detail="Bu e-posta ile zaten bir kullanıcı var")
        
        # Create user in Supabase Auth
        try:
            auth_response = supabase.auth.admin.create_user({
                "email": email,
                "password": password,
                "email_confirm": True
            })
        except Exception as auth_error:
            logging.error(f"Supabase Auth create_user error: {auth_error}")
            raise HTTPException(status_code=500, detail=f"Kullanıcı oluşturulamadı: {str(auth_error)}")
        
        if not auth_response.user:
            raise HTTPException(status_code=500, detail="Kullanıcı oluşturulamadı - auth response boş")
        
        user_id = auth_response.user.id
        
        # Create profile
        supabase.table('profiles').insert({
            'id': user_id,
            'email': email,
            'full_name': client_data['contact_name'],
            'role': 'client',
            'client_id': client_id,
            'created_at': datetime.now(timezone.utc).isoformat()
        }).execute()
        
        # Update client with user_id reference and update contact_email if different
        update_data = {
            'user_id': user_id,
            'updated_at': datetime.now(timezone.utc).isoformat()
        }
        if email != client_data['contact_email']:
            update_data['contact_email'] = email
        
        supabase.table('clients').update(update_data).eq('id', client_id).execute()
        
        # Send welcome email
        template = get_mail_template('welcome')
        login_url = os.environ.get('FRONTEND_URL', 'https://agency-os-prod.preview.emergentagent.com')
        
        email_body = render_template(template.get('body_html', ''), {
            'client_name': client_data['contact_name'],
            'email': email,
            'password': password,
            'login_url': login_url
        })
        
        email_sent = await send_email(email, template.get('subject', 'Hoş Geldiniz'), email_body)
        
        # Create audit log
        supabase.table('audit_logs').insert({
            'actor_user_id': user['id'],
            'action': 'create_client_user_manual',
            'resource_type': 'client',
            'resource_id': client_id,
            'details': {'email': email, 'email_sent': email_sent},
            'created_at': datetime.now(timezone.utc).isoformat()
        }).execute()
        
        return {
            "message": "Kullanıcı hesabı oluşturuldu",
            "user_id": user_id,
            "email": email,
            "email_sent": email_sent
        }
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Create client user manual error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.put("/clients/{client_id}/password")
async def update_client_password(client_id: str, data: ClientPasswordUpdate, user: dict = Depends(require_admin)):
    """Update a client's password"""
    try:
        # Get client info
        client = supabase.table('clients').select('user_id, contact_email, contact_name').eq('id', client_id).single().execute()
        if not client.data:
            raise HTTPException(status_code=404, detail="Müşteri bulunamadı")
        
        user_id = client.data.get('user_id')
        if not user_id:
            raise HTTPException(status_code=400, detail="Bu müşterinin henüz bir kullanıcı hesabı yok")
        
        # Update password in Supabase Auth
        supabase.auth.admin.update_user_by_id(user_id, {
            "password": data.new_password
        })
        
        # Create audit log
        supabase.table('audit_logs').insert({
            'actor_user_id': user['id'],
            'action': 'update_client_password',
            'resource_type': 'client',
            'resource_id': client_id,
            'details': {'email': client.data['contact_email']},
            'created_at': datetime.now(timezone.utc).isoformat()
        }).execute()
        
        return {"message": "Şifre güncellendi", "success": True}
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Update client password error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/clients/{client_id}/send-credentials")
async def send_client_credentials(client_id: str, user: dict = Depends(require_admin)):
    """Send login credentials to client via email"""
    try:
        # Get client info
        client = supabase.table('clients').select('*').eq('id', client_id).single().execute()
        if not client.data:
            raise HTTPException(status_code=404, detail="Müşteri bulunamadı")
        
        client_data = client.data
        user_id = client_data.get('user_id')
        
        if not user_id:
            raise HTTPException(status_code=400, detail="Bu müşterinin henüz bir kullanıcı hesabı yok")
        
        # Generate new password
        import string
        new_password = ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(12))
        
        # Update password
        supabase.auth.admin.update_user_by_id(user_id, {
            "password": new_password
        })
        
        # Send email with new credentials
        template = get_mail_template('welcome')
        login_url = FRONTEND_URL
        
        email_body = render_template(template.get('body_html', ''), {
            'client_name': client_data['contact_name'],
            'email': client_data['contact_email'],
            'password': new_password,
            'login_url': login_url
        })
        
        email_sent = await send_email(
            client_data['contact_email'],
            template.get('subject', 'Giriş Bilgileriniz'),
            email_body
        )
        
        if email_sent:
            return {"message": "Giriş bilgileri e-posta ile gönderildi", "success": True}
        else:
            return {"message": "E-posta gönderilemedi ama şifre güncellendi", "new_password": new_password, "success": False}
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Send credentials error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# =====================================================
# APP SETUP - Include router and middleware
# =====================================================
app.include_router(api_router)

# Health check endpoints for Kubernetes (at root level)
@app.get("/health")
async def root_health():
    """Root health check for Kubernetes"""
    return {"status": "healthy"}

@app.get("/")
async def root_endpoint():
    """Root endpoint"""
    return {"status": "ok", "service": "mova-dijital"}

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)
