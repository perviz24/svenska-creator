-- Add columns to store Presenton slide generation progress
ALTER TABLE public.courses 
ADD COLUMN IF NOT EXISTS presenton_task_id TEXT,
ADD COLUMN IF NOT EXISTS presenton_status TEXT DEFAULT 'idle',
ADD COLUMN IF NOT EXISTS presenton_progress INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS presenton_download_url TEXT,
ADD COLUMN IF NOT EXISTS presenton_edit_url TEXT,
ADD COLUMN IF NOT EXISTS presenton_generation_history JSONB DEFAULT '[]'::jsonb;