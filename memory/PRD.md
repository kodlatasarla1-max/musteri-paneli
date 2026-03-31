# Agency OS - Product Requirements Document

## Overview
Agency OS, dijital pazarlama ajansları için dahili bir işletim sistemidir. Müşteri yönetimi, içerik üretimi, makbuz onayı ve reklam raporlama özelliklerini tek bir platformda birleştirir.

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

### Phase 3: Client Portal (December 2025)
- [x] Client Dashboard - erişim durumu bannerları (Aktif/Bekleyen/Süresi Doldu)
- [x] Makbuz Yükleme - drag & drop, URL yapıştırma
- [x] Muhasebe Modülü - gelir/gider takibi, aylık grafik
- [x] Hizmet durumu görüntüleme (kilitli/aktif)

### Phase 4: UX Improvements (December 2025)
- [x] Mobile hamburger menü - CSS-based responsive
- [x] Dialog accessibility - aria-describedby tüm dialog'larda
- [x] Tutarlı renk sistemi - sarı/lime sorunu çözüldü
- [x] Tam responsive layout (mobil + masaüstü)

## In Progress 🔄
None - All critical features implemented

## Testing Status
- **Backend:** 100% (19/19 test geçti)
- **Frontend:** 98% çalışıyor
- **Test raporu:** /app/test_reports/iteration_2.json
- **Son test tarihi:** December 2025

## Backlog (P1)

### Admin Features
- [ ] Personel (Staff) yönetimi sayfası
- [ ] İçerik yönetimi (video/tasarım yükleme)
- [ ] Takvim etkinlikleri tam CRUD
- [ ] Reklam raporları görüntüleme
- [ ] Kampanya oluşturma
- [ ] Meta Ads API entegrasyonu

### Client Features
- [ ] Video galeri görüntüleme
- [ ] Tasarım galeri görüntüleme
- [ ] Profil düzenleme ve avatar yükleme
- [ ] Bildirim merkezi

## Future (P2)
- [ ] Staff rolü ve detaylı izinler
- [ ] Revizyon sistemi (içerik onay/revizyon)
- [ ] WhatsApp bildirimleri
- [ ] Meta Ads OAuth entegrasyonu
- [ ] E-posta bildirimleri
- [ ] Aktivite logları detay sayfası

## API Endpoints
All endpoints prefixed with `/api`

### Auth
- POST /auth/login
- POST /auth/register (admin only)
- GET /auth/me

### Clients
- GET /clients
- GET /clients/{id}
- POST /clients
- PUT /clients/{id}
- DELETE /clients/{id}

### Client Access
- GET /client-access/{client_id}
- GET /client-access/{client_id}/history

### Services
- GET /services
- GET /client-services/{client_id}
- POST /client-services

### Receipts
- GET /receipts
- GET /receipts/client/{client_id}
- GET /receipts/pending/count
- POST /receipts
- PUT /receipts/{id}/approve
- DELETE /receipts/{id}

### Client Finance
- GET /client-finance/categories
- GET /client-finance/{client_id}
- GET /client-finance/{client_id}/monthly-summary
- POST /client-finance/{client_id}
- PUT /client-finance/{client_id}/{id}
- DELETE /client-finance/{client_id}/{id}
- GET /client-finance/{client_id}/export

### Content
- GET /videos/{client_id}
- POST /videos
- PUT /videos/{id}/status
- GET /designs/{client_id}
- POST /designs
- PUT /designs/{id}/status

### Other
- GET /stats/admin-dashboard
- GET /stats/client-dashboard/{client_id}
- GET /calendar-events
- GET /calendar-events/{client_id}
- POST /calendar-events
- DELETE /calendar-events/{id}
- GET /campaigns
- POST /campaigns
- GET /notifications
- GET /notifications/unread-count
- PUT /notifications/{id}/read
- PUT /notifications/mark-all-read
- GET /activity-logs

## Database Schema
See:
- `/app/supabase/migrations/001_initial_schema.sql`
- `/app/supabase/migrations/002_client_finance_access.sql`

### Core Tables
- profiles (user info, role, client_id)
- clients (company info, status, access tracking)
- services (6 default services)
- client_services (mapping table)
- receipts (payment receipts with approval workflow)
- client_access (30-day access periods)
- client_finance_transactions (income/expense tracking)
- finance_categories (12 default categories)
- videos, designs (content management)
- calendar_events
- notifications
- audit_logs
- campaigns

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

## Key Business Logic

### Receipt-Based Access Flow
1. Client uploads payment receipt
2. Admin reviews in receipts page
3. Admin approves/rejects
4. If approved:
   - 30-day access period created/extended
   - Client status set to 'active'
   - Notification sent to client
   - Finance transaction created (agency income)

### Client Status
- **pending:** Receipt uploaded, awaiting approval
- **active:** Has valid access period
- **expired:** No active access period
