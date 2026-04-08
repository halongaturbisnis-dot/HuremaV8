-- Update attendances table to include schedule_id for mode locking
ALTER TABLE public.attendances ADD COLUMN IF NOT EXISTS schedule_id uuid REFERENCES public.schedules(id) ON DELETE SET NULL;
