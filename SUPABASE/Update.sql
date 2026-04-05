-- Add new columns for out-of-range presence submission
ALTER TABLE attendances ADD COLUMN IF NOT EXISTS check_in_reason TEXT;
ALTER TABLE attendances ADD COLUMN IF NOT EXISTS check_out_reason TEXT;
ALTER TABLE attendances ADD COLUMN IF NOT EXISTS check_in_type TEXT;
ALTER TABLE attendances ADD COLUMN IF NOT EXISTS check_out_type TEXT;
ALTER TABLE attendances ADD COLUMN IF NOT EXISTS check_in_validity TEXT;
ALTER TABLE attendances ADD COLUMN IF NOT EXISTS check_out_validity TEXT;
