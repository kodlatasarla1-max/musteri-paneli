# Mova Dijital - Agency OS

An internal operating system for digital marketing agencies. Provides a unified platform for managing clients, staff, content production, receipts, revisions, and marketing integrations.

## Architecture

### Frontend
- **Framework**: React 19 with Create React App (CRACO)
- **Styling**: Tailwind CSS + shadcn/ui (Radix UI)
- **Routing**: React Router Dom v7
- **Auth/DB**: Supabase JS SDK (direct)
- **API calls**: Axios to FastAPI backend
- **Port**: 5000 (Replit webview)
- **Start**: `cd frontend && PORT=5000 npm start`

### Backend
- **Framework**: FastAPI (Python)
- **DB/Auth**: Supabase (PostgreSQL)
- **Port**: 8000 (console workflow)
- **Start**: `cd backend && uvicorn server:app --host localhost --port 8000`

### Database
- Supabase hosted PostgreSQL
- URL: https://uockujaxzcgofeoovkgj.supabase.co

## Key Files
- `frontend/src/utils/api.js` - Axios API client (uses REACT_APP_BACKEND_URL)
- `frontend/src/lib/supabase.js` - Supabase client
- `backend/server.py` - FastAPI app (3465 lines)
- `frontend/craco.config.js` - CRACO config (host, port, proxy settings)
- `frontend/plugins/visual-edits/` - Visual editing plugin (patched for null check)

## Environment Variables
- `REACT_APP_SUPABASE_URL` - Supabase project URL
- `REACT_APP_SUPABASE_ANON_KEY` - Supabase anon key
- `REACT_APP_BACKEND_URL` - Backend API URL (Replit domain:8000)
- `SUPABASE_URL` - Backend Supabase URL
- `SUPABASE_SERVICE_KEY` - Backend Supabase service role key
- `SUPABASE_ANON_KEY` - Backend Supabase anon key
- `FRONTEND_URL` - Frontend URL for OAuth redirects

## Integrations
- **Twilio**: WhatsApp notifications (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
- **Meta Ads**: OAuth integration (META_APP_ID, META_APP_SECRET, META_REDIRECT_URI)
- **SMTP/Resend**: Email notifications

## Workflows
- `Start application` - Frontend dev server on port 5000 (webview)
- `Backend API` - FastAPI server on port 8000 (console)

## Notes
- Frontend uses `--legacy-peer-deps` for npm install due to react-day-picker peer dependency conflict
- babel-metadata-plugin.js patched to add null check on `importPath.parentPath.parentPath`
- ESLint warnings about useEffect dependencies are non-blocking
