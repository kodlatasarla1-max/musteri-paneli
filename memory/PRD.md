# Agency OS - Product Requirements Document

## Overview
Agency OS, dijital pazarlama ajansları için dahili bir işletim sistemidir. Müşteri yönetimi, personel yönetimi, içerik üretimi, makbuz onayı ve Meta reklam entegrasyonu özelliklerini tek bir platformda birleştirir.

## Technical Stack
- **Frontend:** React, Tailwind CSS, shadcn/ui
- **Backend:** FastAPI (Python)
- **Database:** Supabase (PostgreSQL)
- **Authentication:** Supabase Auth with JWT
- **Storage:** Supabase Storage

## Completed Features ✅

### Phase 1: Core Infrastructure (December 2025)
- [x] Supabase veritabanı entegrasyonu
- [x] SQL şeması (profiles, clients, services, receipts, videos, designs, vb.)
- [x] RLS (Row Level Security) politikaları
- [x] Backend tamamen Supabase'e migrate edildi
- [x] Supabase Auth entegrasyonu (login/signup)
- [x] Admin kullanıcısı oluşturuldu (admin@agency.com / admin123)

### Phase 2: Admin Panel (December 2025)
- [x] Admin Dashboard - istatistikler kartları
- [x] Müşteri Yönetimi - CRUD operasyonları
- [x] Hizmet Yönetimi - 6 varsayılan hizmet
- [x] Makbuz Yönetimi - yükleme, onay/red, 30 gün erişim aktivasyonu
- [x] Sidebar navigation - badge ile bekleyen makbuz sayısı
- [x] Türkçe çeviriler
- [x] **Personel Yönetimi (YENİ)** - CRUD, izin yönetimi, stats kartları
- [x] **Meta Ads Entegrasyonu (YENİ)** - Token girişi, hesap bağlama, veri senkronizasyonu UI

### Phase 3: Client Portal (December 2025)
- [x] Client Dashboard - erişim durumu bannerları (Aktif/Bekleyen/Süresi Doldu)
- [x] Makbuz Yükleme - drag & drop, URL yapıştırma
- [x] Muhasebe Modülü - gelir/gider takibi, aylık grafik
- [x] Hizmet durumu görüntüleme (kilitli/aktif)
- [x] **Profil Düzenleme (YENİ)** - Avatar yükleme, kişisel bilgi güncelleme

### Phase 4: UX Improvements (December 2025)
- [x] Mobile hamburger menü - CSS-based responsive
- [x] Dialog accessibility - aria-describedby tüm dialog'larda
- [x] Tutarlı renk sistemi
- [x] Tam responsive layout (mobil + masaüstü)
- [x] Deployment health check - tüm kontroller geçti

## Pending Setup ⚠️

### Supabase Tables (Kullanıcı Tarafından Oluşturulmalı)
Aşağıdaki SQL'i Supabase Dashboard > SQL Editor'da çalıştırın:

```sql
-- /app/supabase/migrations/003_staff_meta_profile.sql içeriği

CREATE TABLE IF NOT EXISTS staff_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
    can_manage_clients BOOLEAN DEFAULT FALSE,
    can_manage_content BOOLEAN DEFAULT FALSE,
    can_view_reports BOOLEAN DEFAULT FALSE,
    can_approve_receipts BOOLEAN DEFAULT FALSE,
    can_manage_calendar BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS meta_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL UNIQUE REFERENCES clients(id) ON DELETE CASCADE,
    meta_access_token TEXT NOT NULL,
    ad_account_id TEXT NOT NULL,
    account_name TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    last_sync TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE staff_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE meta_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage staff permissions" ON staff_permissions
    FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

CREATE POLICY "Admin and staff can manage meta accounts" ON meta_accounts
    FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'staff')));
```

## Testing Status
- **Backend:** 88% (7/8 test geçti)
- **Frontend:** 90% çalışıyor
- **Test raporu:** /app/test_reports/iteration_3.json
- **Son test tarihi:** December 2025
- **Kritik:** meta_accounts tablosu Supabase'de oluşturulmalı

## Backlog (P1)

### Tamamlanmayı Bekleyen
- [ ] Supabase'de meta_accounts ve staff_permissions tabloları oluşturulmalı

### Gelecek Özellikler
- [ ] Staff rolü için izinlere göre sayfa erişimi kontrolü
- [ ] Video/Tasarım galeri görüntüleme (Client)
- [ ] Revizyon sistemi (içerik onay/revizyon)
- [ ] Bildirim merkezi (Client & Admin)
- [ ] E-posta bildirimleri

## Future (P2)
- [ ] Meta Ads OAuth entegrasyonu (şu an manuel token)
- [ ] WhatsApp bildirimleri
- [ ] Detaylı raporlama ve analytics
- [ ] Çoklu dil desteği

## API Endpoints
All endpoints prefixed with `/api`

### Auth
- POST /auth/login
- POST /auth/register
- GET /auth/me

### Clients
- GET /clients
- POST /clients
- PUT /clients/{id}
- DELETE /clients/{id}

### Staff (YENİ)
- GET /staff
- POST /staff
- PUT /staff/{id}
- DELETE /staff/{id}
- GET /staff-permissions/{id}
- POST /staff-permissions

### Profile (YENİ)
- GET /profile
- PUT /profile
- POST /profile/avatar

### Meta Accounts (YENİ)
- GET /meta-accounts
- GET /meta-accounts/{client_id}
- POST /meta-accounts
- DELETE /meta-accounts/{client_id}
- POST /meta-accounts/{client_id}/fetch-data

### Receipts
- GET /receipts
- POST /receipts
- PUT /receipts/{id}/approve

### Client Finance
- GET /client-finance/{client_id}
- POST /client-finance/{client_id}
- PUT /client-finance/{client_id}/{id}
- DELETE /client-finance/{client_id}/{id}

## Database Schema
Migrations:
- `/app/supabase/migrations/001_initial_schema.sql`
- `/app/supabase/migrations/002_client_finance_access.sql`
- `/app/supabase/migrations/003_staff_meta_profile.sql` (YENİ)

## Environment Variables

### Backend (.env)
- SUPABASE_URL
- SUPABASE_ANON_KEY
- SUPABASE_SERVICE_KEY

### Frontend (.env)
- REACT_APP_BACKEND_URL
- REACT_APP_SUPABASE_URL
- REACT_APP_SUPABASE_ANON_KEY

## Login Credentials
- **Admin:** admin@agency.com / admin123

## New Pages Added
- `/admin/staff` - Personel Yönetimi
- `/admin/meta-integration` - Meta Ads Entegrasyonu
- `/client/profile` - Müşteri Profil Düzenleme

## Key Business Logic

### Staff Permissions
Personel için 5 ayrı izin:
- can_manage_clients: Müşteri CRUD
- can_manage_content: Video/Tasarım yönetimi
- can_view_reports: Rapor görüntüleme
- can_approve_receipts: Makbuz onaylama
- can_manage_calendar: Takvim yönetimi

### Meta Ads Integration
1. Admin, müşteri için Meta Access Token ve Ad Account ID girer
2. Hesap kaydedilir
3. "Senkronize Et" butonu ile son 7 günün reklam verileri çekilir
4. Veriler ad_reports tablosuna kaydedilir
5. Reklam Raporları sayfasında görüntülenir

### Client Profile
- Avatar Supabase Storage'a yüklenir
- Profil bilgileri hem profiles hem clients tablosunda güncellenir
