-- =====================================================
-- AGENCY OS - COMPLETE SUPABASE DATABASE SCHEMA
-- =====================================================
-- Single-agency system with role-based access
-- Roles: admin, staff, client
-- Currency: TRY (₺)
-- =====================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- =====================================================
-- 1. PROFILES (extends auth.users)
-- =====================================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'staff', 'client')),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  avatar_url TEXT,
  company_name TEXT,
  client_id UUID, -- References clients table if role is 'client'
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_client_id ON profiles(client_id);
CREATE INDEX idx_profiles_email ON profiles(email);

-- =====================================================
-- 2. CLIENTS
-- =====================================================
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  contact_phone TEXT NOT NULL,
  address TEXT,
  industry TEXT,
  notes TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'read_only', 'expired', 'suspended')),
  access_days_remaining INTEGER DEFAULT 0,
  access_expires_at TIMESTAMPTZ,
  total_paid DECIMAL(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_clients_status ON clients(status);
CREATE INDEX idx_clients_company_name ON clients USING gin(company_name gin_trgm_ops);

-- =====================================================
-- 3. SERVICES
-- =====================================================
CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  base_price DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default services
INSERT INTO services (service_key, name, description, icon, base_price) VALUES
  ('video_production', 'Video Çekimi & Prodüksiyon', 'Profesyonel video çekimi ve prodüksiyon hizmetleri', 'Video', 15000.00),
  ('meta_ads', 'Meta Reklamları Yönetimi', 'Facebook ve Instagram reklam yönetimi', 'BarChart3', 8000.00),
  ('social_media', 'Sosyal Medya Yönetimi', 'Komple sosyal medya içeriği ve yönetimi', 'Share2', 7000.00),
  ('graphic_design', 'Grafik Tasarım', 'Profesyonel grafik tasarım hizmetleri', 'Image', 5000.00),
  ('website_setup', 'Web Sitesi Kurulumu', 'Profesyonel web sitesi geliştirme ve kurulum', 'Globe', 25000.00),
  ('ecommerce', 'E-ticaret Yönetimi', 'Komple e-ticaret mağaza yönetimi', 'ShoppingBag', 12000.00);

-- =====================================================
-- 4. CLIENT_SERVICES
-- =====================================================
CREATE TABLE client_services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  is_enabled BOOLEAN DEFAULT FALSE,
  start_date DATE,
  end_date DATE,
  monthly_price DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(client_id, service_id)
);

CREATE INDEX idx_client_services_client ON client_services(client_id);
CREATE INDEX idx_client_services_enabled ON client_services(is_enabled);

-- =====================================================
-- 5. RECEIPTS
-- =====================================================
CREATE TABLE receipts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  uploaded_by UUID REFERENCES auth.users(id),
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  payment_date DATE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_note TEXT,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_receipts_client ON receipts(client_id);
CREATE INDEX idx_receipts_status ON receipts(status);
CREATE INDEX idx_receipts_created_at ON receipts(created_at DESC);

-- =====================================================
-- 6. VIDEOS
-- =====================================================
CREATE TABLE videos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  uploaded_by UUID REFERENCES auth.users(id),
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  title TEXT NOT NULL,
  project_name TEXT,
  tags TEXT[],
  month TEXT,
  status TEXT DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'approved', 'revision_requested')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_videos_client ON videos(client_id);
CREATE INDEX idx_videos_status ON videos(status);

-- =====================================================
-- 7. DESIGNS
-- =====================================================
CREATE TABLE designs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  uploaded_by UUID REFERENCES auth.users(id),
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  title TEXT NOT NULL,
  project_name TEXT,
  version INTEGER DEFAULT 1,
  status TEXT DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'approved', 'revision_requested')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_designs_client ON designs(client_id);
CREATE INDEX idx_designs_status ON designs(status);

-- =====================================================
-- 8. REVISIONS
-- =====================================================
CREATE TABLE revisions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  module TEXT NOT NULL CHECK (module IN ('video', 'design', 'social_media', 'ads', 'general')),
  item_id UUID, -- references videos.id, designs.id, etc
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  attachment_url TEXT,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'closed')),
  admin_reply TEXT,
  replied_by UUID REFERENCES auth.users(id),
  replied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_revisions_client ON revisions(client_id);
CREATE INDEX idx_revisions_status ON revisions(status);
CREATE INDEX idx_revisions_module ON revisions(module);

-- =====================================================
-- 9. AD_REPORTS
-- =====================================================
CREATE TABLE ad_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  report_date DATE NOT NULL,
  campaign_name TEXT NOT NULL,
  daily_spend DECIMAL(12,2) DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  cpc DECIMAL(10,2) DEFAULT 0,
  cpm DECIMAL(10,2) DEFAULT 0,
  roas DECIMAL(10,4),
  source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'meta_api', 'google_api')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(client_id, report_date, campaign_name)
);

CREATE INDEX idx_ad_reports_client ON ad_reports(client_id);
CREATE INDEX idx_ad_reports_date ON ad_reports(report_date DESC);

-- =====================================================
-- 10. META_ACCOUNTS
-- =====================================================
CREATE TABLE meta_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE UNIQUE,
  access_token TEXT NOT NULL, -- ENCRYPTED
  ad_account_id TEXT NOT NULL,
  pixel_id TEXT,
  last_sync_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_meta_accounts_client ON meta_accounts(client_id);

-- =====================================================
-- 11. SOCIAL_MEDIA_POSTS
-- =====================================================
CREATE TABLE social_media_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  post_date TIMESTAMPTZ NOT NULL,
  post_type TEXT NOT NULL CHECK (post_type IN ('post', 'reel', 'story')),
  caption TEXT,
  media_url TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'waiting_approval', 'approved', 'revision', 'published')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_social_posts_client ON social_media_posts(client_id);
CREATE INDEX idx_social_posts_date ON social_media_posts(post_date);

-- =====================================================
-- 12. CALENDAR_EVENTS
-- =====================================================
CREATE TABLE calendar_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('shooting', 'meeting', 'deadline')),
  title TEXT NOT NULL,
  event_date TIMESTAMPTZ NOT NULL,
  location TEXT,
  notes TEXT,
  checklist TEXT[],
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_calendar_client ON calendar_events(client_id);
CREATE INDEX idx_calendar_date ON calendar_events(event_date);

-- =====================================================
-- 13. NOTIFICATIONS
-- =====================================================
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(is_read);
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);

-- =====================================================
-- 14. AUDIT_LOGS
-- =====================================================
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_user_id UUID REFERENCES auth.users(id),
  actor_email TEXT,
  client_id UUID REFERENCES clients(id),
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id UUID,
  before JSONB,
  after JSONB,
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_actor ON audit_logs(actor_user_id);
CREATE INDEX idx_audit_client ON audit_logs(client_id);
CREATE INDEX idx_audit_created ON audit_logs(created_at DESC);

-- =====================================================
-- 15. FINANCE_TRANSACTIONS
-- =====================================================
CREATE TABLE finance_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('income', 'expense')),
  client_id UUID REFERENCES clients(id),
  amount DECIMAL(12,2) NOT NULL,
  currency TEXT DEFAULT 'TRY',
  transaction_date DATE NOT NULL,
  category TEXT NOT NULL,
  status TEXT DEFAULT 'expected' CHECK (status IN ('expected', 'received', 'pending', 'paid', 'cancelled')),
  note TEXT,
  receipt_id UUID REFERENCES receipts(id),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_finance_type ON finance_transactions(transaction_type);
CREATE INDEX idx_finance_date ON finance_transactions(transaction_date DESC);
CREATE INDEX idx_finance_status ON finance_transactions(status);
CREATE INDEX idx_finance_client ON finance_transactions(client_id);

-- =====================================================
-- 16. FINANCE_TARGETS
-- =====================================================
CREATE TABLE finance_targets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  year INTEGER NOT NULL,
  expected_income DECIMAL(12,2) DEFAULT 0,
  expected_expense DECIMAL(12,2) DEFAULT 0,
  target_new_clients INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(month, year)
);

CREATE INDEX idx_finance_targets_period ON finance_targets(year, month);

-- =====================================================
-- 17. CAMPAIGNS
-- =====================================================
CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  campaign_type TEXT NOT NULL CHECK (campaign_type IN ('popup', 'banner', 'modal', 'fullscreen')),
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  target_service_missing TEXT[],
  target_specific_clients UUID[],
  cta_type TEXT NOT NULL CHECK (cta_type IN ('form', 'whatsapp', 'call')),
  cta_link TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_campaigns_active ON campaigns(is_active);
CREATE INDEX idx_campaigns_dates ON campaigns(start_date, end_date);

-- =====================================================
-- 18. STAFF_PERMISSIONS
-- =====================================================
CREATE TABLE staff_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  can_manage_clients BOOLEAN DEFAULT FALSE,
  can_manage_content BOOLEAN DEFAULT FALSE,
  can_view_reports BOOLEAN DEFAULT FALSE,
  can_approve_receipts BOOLEAN DEFAULT FALSE,
  can_manage_calendar BOOLEAN DEFAULT FALSE,
  can_view_finance BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TRIGGERS FOR UPDATED_AT
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER clients_updated_at BEFORE UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER receipts_updated_at BEFORE UPDATE ON receipts FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER videos_updated_at BEFORE UPDATE ON videos FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER designs_updated_at BEFORE UPDATE ON designs FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER revisions_updated_at BEFORE UPDATE ON revisions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER meta_accounts_updated_at BEFORE UPDATE ON meta_accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER social_media_posts_updated_at BEFORE UPDATE ON social_media_posts FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER calendar_events_updated_at BEFORE UPDATE ON calendar_events FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER finance_transactions_updated_at BEFORE UPDATE ON finance_transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER finance_targets_updated_at BEFORE UPDATE ON finance_targets FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER staff_permissions_updated_at BEFORE UPDATE ON staff_permissions FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE designs ENABLE ROW LEVEL SECURITY;
ALTER TABLE revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE meta_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_media_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_permissions ENABLE ROW LEVEL SECURITY;

-- Helper function to get user role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- Helper function to get client_id for current user
CREATE OR REPLACE FUNCTION get_user_client_id()
RETURNS UUID AS $$
  SELECT client_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- =====================================================
-- PROFILES POLICIES
-- =====================================================
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (id = auth.uid());
CREATE POLICY "Admins can view all profiles" ON profiles FOR SELECT USING (get_user_role() = 'admin');
CREATE POLICY "Admins can create profiles" ON profiles FOR INSERT WITH CHECK (get_user_role() = 'admin');
CREATE POLICY "Admins can update all profiles" ON profiles FOR UPDATE USING (get_user_role() = 'admin');

-- =====================================================
-- CLIENTS POLICIES
-- =====================================================
CREATE POLICY "Admins full access to clients" ON clients FOR ALL USING (get_user_role() = 'admin');
CREATE POLICY "Staff can view clients" ON clients FOR SELECT USING (get_user_role() IN ('admin', 'staff'));
CREATE POLICY "Clients can view own record" ON clients FOR SELECT USING (id = get_user_client_id());

-- =====================================================
-- CLIENT_SERVICES POLICIES
-- =====================================================
CREATE POLICY "Admin full access services" ON client_services FOR ALL USING (get_user_role() = 'admin');
CREATE POLICY "Clients view own services" ON client_services FOR SELECT USING (client_id = get_user_client_id());

-- =====================================================
-- RECEIPTS POLICIES
-- =====================================================
CREATE POLICY "Admin full access receipts" ON receipts FOR ALL USING (get_user_role() = 'admin');
CREATE POLICY "Clients view own receipts" ON receipts FOR SELECT USING (client_id = get_user_client_id());
CREATE POLICY "Clients upload own receipts" ON receipts FOR INSERT WITH CHECK (client_id = get_user_client_id());

-- =====================================================
-- VIDEOS POLICIES
-- =====================================================
CREATE POLICY "Admin full access videos" ON videos FOR ALL USING (get_user_role() = 'admin');
CREATE POLICY "Staff can manage videos" ON videos FOR ALL USING (get_user_role() = 'staff');
CREATE POLICY "Clients view own videos" ON videos FOR SELECT USING (client_id = get_user_client_id());
CREATE POLICY "Clients update own video status" ON videos FOR UPDATE USING (client_id = get_user_client_id());

-- =====================================================
-- DESIGNS POLICIES
-- =====================================================
CREATE POLICY "Admin full access designs" ON designs FOR ALL USING (get_user_role() = 'admin');
CREATE POLICY "Staff can manage designs" ON designs FOR ALL USING (get_user_role() = 'staff');
CREATE POLICY "Clients view own designs" ON designs FOR SELECT USING (client_id = get_user_client_id());
CREATE POLICY "Clients update own design status" ON designs FOR UPDATE USING (client_id = get_user_client_id());

-- =====================================================
-- REVISIONS POLICIES
-- =====================================================
CREATE POLICY "Admin full access revisions" ON revisions FOR ALL USING (get_user_role() = 'admin');
CREATE POLICY "Staff can view revisions" ON revisions FOR SELECT USING (get_user_role() = 'staff');
CREATE POLICY "Clients view own revisions" ON revisions FOR SELECT USING (client_id = get_user_client_id());
CREATE POLICY "Clients create own revisions" ON revisions FOR INSERT WITH CHECK (client_id = get_user_client_id());

-- =====================================================
-- AD_REPORTS POLICIES
-- =====================================================
CREATE POLICY "Admin full access ad_reports" ON ad_reports FOR ALL USING (get_user_role() = 'admin');
CREATE POLICY "Staff can manage ad_reports" ON ad_reports FOR ALL USING (get_user_role() = 'staff');
CREATE POLICY "Clients view own ad_reports" ON ad_reports FOR SELECT USING (client_id = get_user_client_id());

-- =====================================================
-- NOTIFICATIONS POLICIES
-- =====================================================
CREATE POLICY "Users view own notifications" ON notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users update own notifications" ON notifications FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "System can create notifications" ON notifications FOR INSERT WITH CHECK (true);

-- =====================================================
-- AUDIT_LOGS POLICIES
-- =====================================================
CREATE POLICY "Admin can view all audit logs" ON audit_logs FOR SELECT USING (get_user_role() = 'admin');
CREATE POLICY "System can insert audit logs" ON audit_logs FOR INSERT WITH CHECK (true);

-- =====================================================
-- FINANCE POLICIES
-- =====================================================
CREATE POLICY "Admin full access finance_transactions" ON finance_transactions FOR ALL USING (get_user_role() = 'admin');
CREATE POLICY "Admin full access finance_targets" ON finance_targets FOR ALL USING (get_user_role() = 'admin');

-- =====================================================
-- CAMPAIGNS POLICIES
-- =====================================================
CREATE POLICY "Admin full access campaigns" ON campaigns FOR ALL USING (get_user_role() = 'admin');
CREATE POLICY "All can view active campaigns" ON campaigns FOR SELECT USING (is_active = true);

-- =====================================================
-- SERVICES & STAFF_PERMISSIONS (READ ACCESS FOR ALL)
-- =====================================================
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view services" ON services FOR SELECT USING (true);

CREATE POLICY "Admin full access staff_permissions" ON staff_permissions FOR ALL USING (get_user_role() = 'admin');
CREATE POLICY "Staff view own permissions" ON staff_permissions FOR SELECT USING (staff_id = auth.uid());
