from fastapi import FastAPI, APIRouter, HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from supabase import create_client, Client

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Supabase client setup
SUPABASE_URL = os.environ.get('SUPABASE_URL')
SUPABASE_SERVICE_KEY = os.environ.get('SUPABASE_SERVICE_KEY')
SUPABASE_ANON_KEY = os.environ.get('SUPABASE_ANON_KEY')

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

app = FastAPI(title="Agency OS API", version="2.1.0")
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
    status: Optional[str] = None

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
    """Send notification to all users belonging to a client"""
    try:
        client_users = supabase.table('profiles').select('id').eq('client_id', client_id).execute()
        for cu in client_users.data:
            create_notification(cu['id'], type, title, message, link)
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
# ROOT
# =====================================================
@api_router.get("/")
async def root():
    return {"message": "Agency OS API v2.1", "status": "running", "database": "Supabase"}


# =====================================================
# AUTH ENDPOINTS
# =====================================================
@api_router.post("/auth/login")
async def login(request: LoginRequest):
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
async def get_client_receipts(client_id: str, year: Optional[int] = None, month: Optional[int] = None, status: Optional[str] = None, user: dict = Depends(get_current_user)):
    try:
        if user.get('role') == 'client' and str(user.get('client_id')) != client_id:
            raise HTTPException(status_code=403, detail="Erişim reddedildi")
        
        query = supabase.table('receipts').select('*').eq('client_id', client_id)
        
        if status:
            query = query.eq('status', status)
        
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
# APP SETUP
# =====================================================
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
