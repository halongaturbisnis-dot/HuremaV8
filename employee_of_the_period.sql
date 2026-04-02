
-- Table for Employee of The Period
CREATE TABLE IF NOT EXISTS public.employee_of_the_period (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_ids UUID[] NOT NULL, -- Array of employee IDs
    month INTEGER NOT NULL,
    year INTEGER NOT NULL,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_by UUID REFERENCES auth.users(id)
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_eotp_period ON public.employee_of_the_period (year DESC, month DESC);

-- Enable RLS
ALTER TABLE public.employee_of_the_period ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Allow select for public" ON public.employee_of_the_period
    FOR SELECT TO public USING (true);

CREATE POLICY "Allow insert for public" ON public.employee_of_the_period
    FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "Allow update for public" ON public.employee_of_the_period
    FOR UPDATE TO public USING (true);

CREATE POLICY "Allow delete for public" ON public.employee_of_the_period
    FOR DELETE TO public USING (true);
