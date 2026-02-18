# Agency OS - Product Requirements Document

## Overview
Agency OS, dijital pazarlama ajansları için dahili bir işletim sistemidir. Müşteri yönetimi, içerik üretimi, makbuz onayı ve reklam raporlama özelliklerini tek bir platformda birleştirir.

## Completed - December 2025

### Phase 1: Supabase Migration (COMPLETED ✅)
- [x] Supabase veritabanı entegrasyonu
- [x] SQL şeması oluşturuldu (profiles, clients, services, receipts, videos, designs, vb.)
- [x] RLS (Row Level Security) politikaları aktif
- [x] Backend tamamen Supabase'e migrate edildi
- [x] Supabase Auth entegrasyonu (login/signup)
- [x] Admin kullanıcısı oluşturuldu (admin@agency.com / admin123)

### Phase 2: Core Features (COMPLETED ✅)
- [x] Admin Dashboard - istatistikler (müşteri, video, tasarım sayıları)
- [x] Müşteri Yönetimi - CRUD operasyonları
- [x] Hizmet Yönetimi - 6 varsayılan hizmet
- [x] Makbuz Yönetimi - yükleme, onay/red, 30 gün erişim aktivasyonu
- [x] Sidebar navigation - badge ile bekleyen makbuz sayısı
- [x] Tablo başlıkları Türkçeye çevrildi
- [x] Para birimi TRY (₺)

### Testing Status
- Backend: 100% (19/19 test geçti)
- Frontend: 95% çalışıyor
- Test raporu: /app/test_reports/iteration_1.json

## In Progress

### Known Issues (LOW Priority)
1. Sarı arka plan CSS sorunu - bazı kartlarda görünüyor (CSS cache)
2. "İçerik" navigation timeout - race condition

## Backlog (P1)

### Admin Features
- [ ] Personel (Staff) yönetimi sayfası
- [ ] İçerik yönetimi (video/tasarım yükleme)
- [ ] Takvim etkinlikleri CRUD
- [ ] Reklam raporları görüntüleme
- [ ] Kampanya oluşturma
- [ ] Finans modülü (gelir/gider/kâr)
- [ ] Meta Ads API entegrasyonu

### Client Features
- [ ] Client Dashboard
- [ ] Video galeri görüntüleme
- [ ] Tasarım galeri görüntüleme
- [ ] Makbuz yükleme
- [ ] Profil düzenleme
- [ ] Bildirim merkezi

## Future (P2)

- [ ] Staff rolü ve izinleri
- [ ] Revizyon sistemi
- [ ] WhatsApp bildirimleri
- [ ] Meta Ads OAuth entegrasyonu
- [ ] E-posta bildirimleri

## Technical Stack
- **Frontend:** React, Tailwind CSS, shadcn/ui
- **Backend:** FastAPI (Python)
- **Database:** Supabase (PostgreSQL)
- **Authentication:** Supabase Auth with JWT
- **Storage:** Supabase Storage (planned)

## API Endpoints
All endpoints prefixed with `/api`

### Auth
- POST /auth/login
- POST /auth/register (admin only)
- GET /auth/me

### Clients
- GET /clients
- POST /clients
- PUT /clients/{id}
- DELETE /clients/{id}

### Services
- GET /services
- GET /client-services/{client_id}
- POST /client-services

### Receipts
- GET /receipts
- GET /receipts/{client_id}
- GET /receipts/pending/count
- POST /receipts
- PUT /receipts/{id}/approve

### Content
- GET /videos/{client_id}
- POST /videos
- GET /designs/{client_id}
- POST /designs

### Other
- GET /stats/admin-dashboard
- GET /calendar-events
- GET /campaigns
- GET /notifications
- GET /activity-logs

## Database Schema
See `/app/supabase/migrations/001_initial_schema.sql`

## Environment Variables

### Backend (.env)
- SUPABASE_URL
- SUPABASE_ANON_KEY
- SUPABASE_SERVICE_KEY

### Frontend (.env)
- REACT_APP_BACKEND_URL
- REACT_APP_SUPABASE_URL
- REACT_APP_SUPABASE_ANON_KEY
