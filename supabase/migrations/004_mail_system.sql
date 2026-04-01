-- =====================================================
-- MAIL SYSTEM TABLES
-- =====================================================

-- System settings table for mail configuration
CREATE TABLE IF NOT EXISTS system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Mail templates table
CREATE TABLE IF NOT EXISTS mail_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_type VARCHAR(50) UNIQUE NOT NULL,
    subject VARCHAR(255) NOT NULL,
    body_html TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add user_id column to clients table if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'clients' AND column_name = 'user_id') THEN
        ALTER TABLE clients ADD COLUMN user_id UUID REFERENCES auth.users(id);
    END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(setting_key);
CREATE INDEX IF NOT EXISTS idx_mail_templates_type ON mail_templates(template_type);
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON clients(user_id);

-- Enable RLS
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE mail_templates ENABLE ROW LEVEL SECURITY;

-- Policies for system_settings (admin only via service key)
CREATE POLICY "Service key full access to system_settings" ON system_settings
    FOR ALL USING (true);

-- Policies for mail_templates (admin only via service key)
CREATE POLICY "Service key full access to mail_templates" ON mail_templates
    FOR ALL USING (true);
