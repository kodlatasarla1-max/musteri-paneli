-- =====================================================
-- AGENCY OS - PHASE 2 SCHEMA UPDATES
-- Client Finance + Access Period Management
-- =====================================================

-- =====================================================
-- 1. CLIENT_FINANCE_TRANSACTIONS (Müşteri Muhasebesi)
-- =====================================================
CREATE TABLE IF NOT EXISTS client_finance_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('income', 'expense')),
  amount DECIMAL(12,2) NOT NULL,
  currency TEXT DEFAULT 'TRY',
  transaction_date DATE NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  receipt_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_finance_client ON client_finance_transactions(client_id);
CREATE INDEX IF NOT EXISTS idx_client_finance_date ON client_finance_transactions(transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_client_finance_type ON client_finance_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_client_finance_category ON client_finance_transactions(category);

-- =====================================================
-- 2. CLIENT_ACCESS (Erişim Dönemleri)
-- =====================================================
CREATE TABLE IF NOT EXISTS client_access (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  receipt_id UUID REFERENCES receipts(id),
  active_from TIMESTAMPTZ NOT NULL,
  active_until TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
  activated_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_access_client ON client_access(client_id);
CREATE INDEX IF NOT EXISTS idx_client_access_status ON client_access(status);
CREATE INDEX IF NOT EXISTS idx_client_access_until ON client_access(active_until);

-- =====================================================
-- 3. FINANCE CATEGORIES (Referans tablosu)
-- =====================================================
CREATE TABLE IF NOT EXISTS finance_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_key TEXT NOT NULL UNIQUE,
  name_tr TEXT NOT NULL,
  name_en TEXT NOT NULL,
  category_type TEXT NOT NULL CHECK (category_type IN ('income', 'expense', 'both')),
  icon TEXT,
  color TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default categories
INSERT INTO finance_categories (category_key, name_tr, name_en, category_type, icon, color, sort_order) VALUES
  ('sales', 'Satışlar', 'Sales', 'income', 'TrendingUp', '#10b981', 1),
  ('service_income', 'Hizmet Geliri', 'Service Income', 'income', 'Briefcase', '#3b82f6', 2),
  ('other_income', 'Diğer Gelir', 'Other Income', 'income', 'Plus', '#8b5cf6', 3),
  ('product_cost', 'Ürün Maliyeti', 'Product Cost', 'expense', 'Package', '#ef4444', 4),
  ('shipping', 'Kargo/Nakliye', 'Shipping', 'expense', 'Truck', '#f97316', 5),
  ('marketing', 'Pazarlama', 'Marketing', 'expense', 'Megaphone', '#ec4899', 6),
  ('ads', 'Reklam Harcamaları', 'Advertising', 'expense', 'BarChart3', '#6366f1', 7),
  ('payroll', 'Maaş/Personel', 'Payroll', 'expense', 'Users', '#14b8a6', 8),
  ('rent', 'Kira', 'Rent', 'expense', 'Home', '#78716c', 9),
  ('tools', 'Araç/Yazılım', 'Tools/Software', 'expense', 'Wrench', '#64748b', 10),
  ('utilities', 'Faturalar', 'Utilities', 'expense', 'Zap', '#eab308', 11),
  ('other_expense', 'Diğer Gider', 'Other Expense', 'expense', 'Minus', '#94a3b8', 12)
ON CONFLICT (category_key) DO NOTHING;

-- =====================================================
-- 4. RLS POLICIES
-- =====================================================

-- Enable RLS
ALTER TABLE client_finance_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_categories ENABLE ROW LEVEL SECURITY;

-- Client Finance Transactions Policies
CREATE POLICY "Clients manage own finance" ON client_finance_transactions 
  FOR ALL USING (client_id = get_user_client_id());

CREATE POLICY "Admin full access client_finance" ON client_finance_transactions 
  FOR ALL USING (get_user_role() = 'admin');

CREATE POLICY "Staff view client_finance" ON client_finance_transactions 
  FOR SELECT USING (get_user_role() = 'staff');

-- Client Access Policies
CREATE POLICY "Clients view own access" ON client_access 
  FOR SELECT USING (client_id = get_user_client_id());

CREATE POLICY "Admin full access client_access" ON client_access 
  FOR ALL USING (get_user_role() = 'admin');

-- Finance Categories - Everyone can read
CREATE POLICY "Anyone can view categories" ON finance_categories 
  FOR SELECT USING (true);

-- =====================================================
-- 5. TRIGGERS
-- =====================================================

-- Updated_at trigger for client_finance_transactions
CREATE TRIGGER client_finance_updated_at 
  BEFORE UPDATE ON client_finance_transactions 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- 6. HELPER FUNCTION: Check if client has active access
-- =====================================================
CREATE OR REPLACE FUNCTION check_client_access(p_client_id UUID)
RETURNS TABLE (
  has_access BOOLEAN,
  access_until TIMESTAMPTZ,
  days_remaining INTEGER
) AS $$
DECLARE
  v_active_until TIMESTAMPTZ;
BEGIN
  SELECT ca.active_until INTO v_active_until
  FROM client_access ca
  WHERE ca.client_id = p_client_id 
    AND ca.status = 'active'
    AND ca.active_until > NOW()
  ORDER BY ca.active_until DESC
  LIMIT 1;
  
  IF v_active_until IS NOT NULL THEN
    RETURN QUERY SELECT 
      TRUE,
      v_active_until,
      EXTRACT(DAY FROM (v_active_until - NOW()))::INTEGER;
  ELSE
    RETURN QUERY SELECT FALSE, NULL::TIMESTAMPTZ, 0;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 7. UPDATE CLIENTS TABLE - Add access tracking fields
-- =====================================================
ALTER TABLE clients 
  ADD COLUMN IF NOT EXISTS current_access_id UUID REFERENCES client_access(id),
  ADD COLUMN IF NOT EXISTS has_pending_receipt BOOLEAN DEFAULT FALSE;
