-- Add new columns for out-of-range presence submission
ALTER TABLE attendances ADD COLUMN IF NOT EXISTS check_in_reason TEXT;
ALTER TABLE attendances ADD COLUMN IF NOT EXISTS check_out_reason TEXT;
ALTER TABLE attendances ADD COLUMN IF NOT EXISTS check_in_type TEXT;
ALTER TABLE attendances ADD COLUMN IF NOT EXISTS check_out_type TEXT;
ALTER TABLE attendances ADD COLUMN IF NOT EXISTS check_in_validity TEXT;
ALTER TABLE attendances ADD COLUMN IF NOT EXISTS check_out_validity TEXT;

-- Remove old columns
ALTER TABLE attendances DROP COLUMN IF EXISTS presence_type;
ALTER TABLE attendances DROP COLUMN IF EXISTS out_of_range_reason;

-- Remove DEFAULT constraints
ALTER TABLE attendances ALTER COLUMN status_out DROP DEFAULT;
ALTER TABLE attendances ALTER COLUMN check_in_validity DROP DEFAULT;
ALTER TABLE attendances ALTER COLUMN check_out_validity DROP DEFAULT;
