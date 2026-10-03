-- Add file_name column to lessons table to persist original uploaded file names
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS file_name TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.lessons.file_name IS 'Original uploaded file name with extension';