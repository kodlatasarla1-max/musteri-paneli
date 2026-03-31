# Agency OS - Product Requirements Document

## Overview
Agency OS, dijital pazarlama ajansları için dahili bir işletim sistemidir. Müşteri yönetimi, personel yönetimi, içerik üretimi, makbuz onayı, revizyon sistemi ve Meta reklam entegrasyonu özelliklerini tek bir platformda birleştirir.

## Technical Stack
- **Frontend:** React, Tailwind CSS, shadcn/ui
- **Backend:** FastAPI (Python)
- **Database:** Supabase (PostgreSQL)
- **Authentication:** Supabase Auth with JWT
- **Storage:** Supabase Storage

## Completed Features ✅

### Phase 1: Core Infrastructure
- [x] Supabase veritabanı entegrasyonu
- [x] SQL şeması (profiles, clients, services, receipts, videos, designs, vb.)
- [x] RLS (Row Level Security) politikaları
- [x] Backend tamamen Supabase'e migrate edildi
- [x] Supabase Auth entegrasyonu (login/signup)
- [x] Admin kullanıcısı oluşturuldu

### Phase 2: Admin Panel
- [x] Admin Dashboard - istatistikler kartları
- [x] Müşteri Yönetimi - CRUD operasyonları
- [x] Hizmet Yönetimi - 6 varsayılan hizmet
- [x] Makbuz Yönetimi - yükleme, onay/red, 30 gün erişim aktivasyonu
- [x] Personel Yönetimi - CRUD, izin yönetimi
- [x] Meta Ads Entegrasyonu - Token girişi, hesap bağlama
- [x] **Revizyon Yönetimi (YENİ)** - İçerik revizyonlarını yönetme
- [x] **Bildirim Merkezi (YENİ)** - Tüm bildirimleri görüntüleme

### Phase 3: Client Portal
- [x] Client Dashboard - erişim durumu bannerları
- [x] Makbuz Yükleme - drag & drop
- [x] Muhasebe Modülü - gelir/gider takibi
- [x] Profil Düzenleme - Avatar yükleme
- [x] **Revizyon Talebi (YENİ)** - Video/tasarım için revizyon iste
- [x] **Bildirim Merkezi (YENİ)** - Bildirimleri görüntüleme

### Phase 4: Access Control & Notifications
- [x] **Staff İzin Sistemi (YENİ)** - 5 farklı izin türü
- [x] **User Permissions API (YENİ)** - Frontend erişim kontrolü için
- [x] **Geliştirilmiş Bildirim API'ları (YENİ)** - Gruplu görüntüleme, silme

### Phase 5: UX Improvements
- [x] Mobile hamburger menü
- [x] Dialog accessibility
- [x] Tutarlı renk sistemi
- [x] Tam responsive layout

## Testing Status ✅
- **Backend:** 100% (Tüm endpoint'ler çalışıyor)
- **Frontend:** 100% (Tüm sayfalar doğru yükleniyor)
- **Test raporu:** /app/test_reports/iteration_4.json
- **Retest gerekli:** Hayır

## API Endpoints

### Auth
- POST /auth/login
- POST /auth/register
- GET /auth/me

### Clients & Staff
- GET/POST/PUT/DELETE /clients
- GET/POST/PUT/DELETE /staff
- GET/POST /staff-permissions

### Revisions (YENİ)
- GET /revisions - Tüm revizyonlar
- GET /revisions/client/{client_id} - Müşteri revizyonları
- GET /revisions/pending/count - Bekleyen sayısı
- POST /revisions - Yeni revizyon talebi
- PUT /revisions/{id} - Revizyon yanıtla
- DELETE /revisions/{id} - Revizyon sil

### Notifications (GELİŞTİRİLMİŞ)
- GET /notifications/all - Tüm bildirimler
- GET /notifications/grouped - Tarihe göre gruplu
- GET /notifications/unread-count - Okunmamış sayısı
- PUT /notifications/{id}/read - Okundu işaretle
- PUT /notifications/mark-all-read - Tümünü okundu işaretle
- DELETE /notifications/{id} - Bildirim sil
- DELETE /notifications/clear-all - Tümünü sil

### Permissions (YENİ)
- GET /user/permissions - Kullanıcı yetkileri

### Other
- GET/POST /receipts
- GET/POST /client-finance/{client_id}
- GET/POST /meta-accounts
- GET/POST /videos, /designs
- GET/POST /calendar-events

## Database Schema
Supabase Migrations:
- `001_initial_schema.sql`
- `002_client_finance_access.sql`
- `003_staff_meta_profile.sql`

### New Tables
- `staff_permissions` - Personel yetkileri
- `meta_accounts` - Meta reklam hesapları
- `revisions` - İçerik revizyon talepleri

## New Pages
- `/admin/revisions` - Revizyon Yönetimi
- `/admin/notifications` - Bildirim Merkezi
- `/client/revisions` - Revizyon Taleplerim
- `/client/notifications` - Bildirimlerim

## Staff Permission Types
1. `can_manage_clients` - Müşteri CRUD
2. `can_manage_content` - Video/Tasarım yönetimi
3. `can_view_reports` - Rapor görüntüleme
4. `can_approve_receipts` - Makbuz onaylama
5. `can_manage_calendar` - Takvim yönetimi

## Login Credentials
- **Admin:** admin@agency.com / admin123

## Backlog (P2)
- [ ] Staff rolü için frontend erişim kısıtlaması
- [ ] Meta Ads OAuth entegrasyonu
- [ ] WhatsApp bildirimleri
- [ ] E-posta bildirimleri
- [ ] Detaylı raporlama

## Revision Workflow
1. Client içerik görüntüler (video/tasarım)
2. Client "Revizyon Talep Et" butonuna tıklar
3. Client mesaj yazar ve gönderir
4. Admin revizyonlar sayfasında görür
5. Admin yanıt yazar ve durum günceller (İşlemde/Tamamlandı/Reddedildi)
6. Client bildirim alır ve yanıtı görür

## Notification Types
- `receipt_approved` - Makbuz onaylandı
- `receipt_rejected` - Makbuz reddedildi
- `receipt_uploaded` - Yeni makbuz yüklendi
- `revision_request` - Yeni revizyon talebi
- `revision_response` - Revizyon yanıtlandı
- `access_expiring` - Erişim süresi doluyor
- `access_expired` - Erişim süresi doldu
