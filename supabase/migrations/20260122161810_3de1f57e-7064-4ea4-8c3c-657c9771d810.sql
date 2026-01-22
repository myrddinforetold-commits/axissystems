-- Add is_activated column to roles table to track activation status
ALTER TABLE public.roles 
ADD COLUMN is_activated BOOLEAN NOT NULL DEFAULT FALSE;

-- Update existing roles to be activated (so wizard only shows for new roles)
UPDATE public.roles SET is_activated = TRUE;