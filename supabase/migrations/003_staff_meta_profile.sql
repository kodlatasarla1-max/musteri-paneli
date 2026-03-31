-- =====================================================
-- STAFF PERMISSIONS TABLE
-- =====================================================
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

-- RLS for staff_permissions
ALTER TABLE staff_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage staff permissions" ON staff_permissions
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
    );

CREATE POLICY "Staff can view own permissions" ON staff_permissions
    FOR SELECT USING (staff_id = auth.uid());

-- =====================================================
-- META ACCOUNTS TABLE (if not exists)
-- =====================================================
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

-- RLS for meta_accounts
ALTER TABLE meta_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin and staff can manage meta accounts" ON meta_accounts
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'staff'))
    );

-- =====================================================
-- ADD UNIQUE CONSTRAINT FOR AD_REPORTS
-- =====================================================
ALTER TABLE ad_reports DROP CONSTRAINT IF EXISTS ad_reports_unique_daily;
ALTER TABLE ad_reports ADD CONSTRAINT ad_reports_unique_daily 
    UNIQUE (client_id, report_date, campaign_name);

-- Add source column to ad_reports if not exists
ALTER TABLE ad_reports ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';

-- =====================================================
-- ADD PROFILE FIELDS
-- =====================================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS address TEXT;

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_staff_permissions_staff_id ON staff_permissions(staff_id);
CREATE INDEX IF NOT EXISTS idx_meta_accounts_client_id ON meta_accounts(client_id);
CREATE INDEX IF NOT EXISTS idx_ad_reports_client_date ON ad_reports(client_id, report_date);
