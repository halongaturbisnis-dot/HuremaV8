-- Add new columns for out-of-range presence submission
ALTER TABLE attendances ADD COLUMN IF NOT EXISTS presence_type TEXT DEFAULT 'Reguler';
ALTER TABLE attendances ADD COLUMN IF NOT EXISTS out_of_range_reason TEXT;
ALTER TABLE attendances ADD COLUMN IF NOT EXISTS check_in_validity TEXT DEFAULT 'TRUE';
ALTER TABLE attendances ADD COLUMN IF NOT EXISTS check_out_validity TEXT DEFAULT 'TRUE';
