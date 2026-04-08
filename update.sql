-- Update attendances table to include schedule_id and special_assignment_id for mode locking
ALTER TABLE public.attendances ADD COLUMN IF NOT EXISTS schedule_id uuid REFERENCES public.schedules(id) ON DELETE SET NULL;
ALTER TABLE public.attendances ADD COLUMN IF NOT EXISTS special_assignment_id uuid REFERENCES public.special_assignments(id) ON DELETE SET NULL;

-- Add snapshot columns for target location
ALTER TABLE public.attendances ADD COLUMN IF NOT EXISTS target_latitude numeric;
ALTER TABLE public.attendances ADD COLUMN IF NOT EXISTS target_longitude numeric;
ALTER TABLE public.attendances ADD COLUMN IF NOT EXISTS target_radius integer;
