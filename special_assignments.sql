-- Create special_assignments table
CREATE TABLE IF NOT EXISTS special_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    location_name TEXT NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    radius INTEGER NOT NULL DEFAULT 100,
    schedule_id UUID REFERENCES schedules(id),
    custom_check_in TIME,
    custom_check_out TIME,
    custom_late_tolerance INTEGER DEFAULT 0,
    custom_early_tolerance INTEGER DEFAULT 0,
    created_by UUID REFERENCES accounts(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create junction table for accounts
CREATE TABLE IF NOT EXISTS special_assignment_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assignment_id UUID REFERENCES special_assignments(id) ON DELETE CASCADE,
    account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
    UNIQUE(assignment_id, account_id)
);

-- Add RLS policies
ALTER TABLE special_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE special_assignment_accounts ENABLE ROW LEVEL SECURITY;

-- Policies for special_assignments
CREATE POLICY "Enable read access for all users" ON special_assignments FOR SELECT USING (true);
CREATE POLICY "Enable insert for admins" ON special_assignments FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM accounts WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Enable update for admins" ON special_assignments FOR UPDATE USING (
    EXISTS (SELECT 1 FROM accounts WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Enable delete for admins" ON special_assignments FOR DELETE USING (
    EXISTS (SELECT 1 FROM accounts WHERE id = auth.uid() AND role = 'admin')
);

-- Policies for special_assignment_accounts
CREATE POLICY "Enable read access for all users" ON special_assignment_accounts FOR SELECT USING (true);
CREATE POLICY "Enable insert for admins" ON special_assignment_accounts FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM accounts WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Enable delete for admins" ON special_assignment_accounts FOR DELETE USING (
    EXISTS (SELECT 1 FROM accounts WHERE id = auth.uid() AND role = 'admin')
);
