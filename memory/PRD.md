# Mova Dijital - Product Requirements Document

## Overview
Mova Dijital, dijital pazarlama ajansları için dahili bir işletim sistemidir. Müşteri yönetimi, personel yönetimi, içerik üretimi, makbuz onayı, revizyon sistemi, WhatsApp bildirimleri ve Meta reklam entegrasyonu özelliklerini tek bir platformda birleştirir.

## Technical Stack
- **Frontend:** React, Tailwind CSS, shadcn/ui
- **Backend:** FastAPI (Python)
- **Database:** Supabase (PostgreSQL)
- **Authentication:** Supabase Auth with JWT
- **Storage:** Supabase Storage
- **Integrations:** Twilio WhatsApp, Meta OAuth
- **Theme:** Navy Blue (Lacivert), Beyaz, Siyah

## Completed Features ✅

### Core Infrastructure
- [x] Supabase veritabanı entegrasyonu
- [x] SQL şeması ve RLS politikaları
- [x] Backend tamamen Supabase'e migrate edildi
- [x] Supabase Auth entegrasyonu

### Theme & Branding (April 2026) ✅
- [x] **Marka Değişikliği:** "Ajans OS" → "Mova Dijital"
- [x] **Tema Değişikliği:** Tüm sistem Lacivert (Navy Blue), Beyaz, Siyah renk paletine güncellendi
- [x] Login sayfası: Mova Dijital markası + navy tema
- [x] Sidebar: bg-slate-900 (lacivert) tema
- [x] Tüm primary butonlar: bg-slate-900 hover:bg-black
- [x] Tüm tablolar ve kartlar: slate-200/300 border renkleri
- [x] Logo ikonu: "M" harfi

### Admin Panel
- [x] Admin Dashboard
- [x] Müşteri Yönetimi (CRUD)
- [x] Personel Yönetimi (CRUD + İzinler)
- [x] Makbuz Yönetimi (Onay/Red + 30 gün erişim)
- [x] Meta Ads Entegrasyonu (Manuel Token + OAuth)
- [x] Revizyon Yönetimi
- [x] Bildirim Merkezi

### Client Portal
- [x] Client Dashboard (erişim durumu)
- [x] Makbuz Yükleme
- [x] Muhasebe Modülü
- [x] Profil Düzenleme + Avatar
- [x] Revizyon Talebi
- [x] Bildirim Merkezi

### Access Control & Permissions
- [x] **Staff İzin Sistemi** - 5 farklı izin türü
- [x] **Frontend Erişim Kısıtlaması** - PermissionsContext ile sayfa/buton gizleme
- [x] **Staff Navigation Filtering** - İzinsiz menü öğeleri otomatik gizlenir

### Integrations
- [x] **WhatsApp Bildirimleri (Twilio)** - Makbuz onay/red, erişim süresi bildirimleri
- [x] **Meta OAuth** - Otomatik token alma, long-lived token, ad account listeleme
- [x] **Meta Manual Token** - Manuel token girişi alternatifi

## Testing Status ✅
- **Backend:** 100% (15/15 test geçti)
- **Frontend:** 100%
- **Test raporu:** /app/test_reports/iteration_6.json
- **Retest gerekli:** Hayır
- **Son test tarihi:** April 2026

## API Endpoints

### Auth & User
- POST /auth/login
- GET /user/permissions

### WhatsApp (Twilio)
- GET /whatsapp/status
- POST /whatsapp/send
- POST /whatsapp/notify-client/{client_id}

### Meta OAuth
- GET /meta/oauth/status
- GET /meta/oauth/start/{client_id}
- GET /meta/callback
- POST /meta/refresh-token/{client_id}

### Other Endpoints
- /clients, /staff, /staff-permissions
- /receipts, /revisions, /notifications
- /meta-accounts, /client-finance
- /videos, /designs, /calendar-events

## Environment Variables

### Backend (.env)
```
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_KEY=

# WhatsApp (Twilio)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886

# Meta OAuth
META_APP_ID=
META_APP_SECRET=
META_REDIRECT_URI=https://your-domain.com/api/meta/callback
```

### Frontend (.env)
```
REACT_APP_BACKEND_URL=
REACT_APP_SUPABASE_URL=
REACT_APP_SUPABASE_ANON_KEY=
```

## Staff Permission Types
| İzin | Açıklama |
|------|----------|
| can_manage_clients | Müşteri CRUD |
| can_manage_content | Video/Tasarım yönetimi |
| can_view_reports | Rapor görüntüleme |
| can_approve_receipts | Makbuz onaylama |
| can_manage_calendar | Takvim yönetimi |

## WhatsApp Notification Types
| Tür | Mesaj |
|-----|-------|
| receipt_approved | Makbuz onayı + 30 gün erişim bildirimi |
| receipt_rejected | Makbuz red bildirimi |
| access_expiring | 3 gün kala uyarı |
| access_expired | Süre doldu bildirimi |
| revision_completed | Revizyon tamamlandı |

## Meta OAuth Flow
1. Admin "OAuth ile Bağla" butonuna tıklar
2. Müşteri seçer
3. Facebook yetkilendirme sayfasına yönlendirilir
4. Kullanıcı izin verir
5. Callback URL'e dönüş
6. Short-lived token alınır
7. Long-lived token'a dönüştürülür (60 gün)
8. Ad accounts listelenir
9. Token veritabanına kaydedilir

## Login Credentials
- **Admin:** admin@agency.com / admin123

## Backlog (P2)
- [ ] E-posta bildirimleri entegrasyonu
- [ ] Detaylı raporlama ve analytics
- [ ] Çoklu dil desteği
- [ ] Otomatik token yenileme (cron job)
- [ ] Müşteri self-registration

## File Structure
```
/app/
├── backend/
│   ├── .env
│   ├── requirements.txt
│   └── server.py (2600+ lines)
├── frontend/
│   ├── .env
│   ├── src/
│   │   ├── contexts/
│   │   │   └── PermissionsContext.jsx (NEW)
│   │   ├── pages/
│   │   │   ├── admin/ (12 pages)
│   │   │   ├── client/ (7 pages)
│   │   │   └── shared/ (2 pages)
│   │   └── components/
│   │       └── Layout.jsx (Staff permission filtering)
└── supabase/
    └── migrations/ (3 SQL files)
```
